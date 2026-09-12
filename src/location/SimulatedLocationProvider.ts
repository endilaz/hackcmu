/**
 * A fake GPS feed that drives the entire demo recording. See plan.md
 * section 8 for the design this implements.
 *
 * === THE TIME MODEL (read this before touching anything below) ===
 * The simulator keeps its own clock (`simClock`), separate from wall-clock
 * `Date.now()`. It ticks once per SIM_EMIT_INTERVAL_MS of REAL time (one
 * `setInterval` firing every second), but each tick advances the SIMULATED
 * clock by `SIM_EMIT_INTERVAL_MS * speedMultiplier` and moves the walker
 * `WALK_SPEED_MPS * speedMultiplier * (SIM_EMIT_INTERVAL_MS / 1000)` metres.
 * At the default 10x that's +10s of simulated time and +13.5m of walking per
 * *one* real second - so the implied speed between consecutive emitted fixes
 * is always exactly WALK_SPEED_MPS (1.35 m/s), regardless of the multiplier.
 * `now()` returns this simulated clock, never `Date.now()`. Downstream, the
 * trail filter rejects any fix implying more than MAX_SPEED_MPS (3 m/s); if
 * timestamps were real time instead of simulated time, a 10x walk would look
 * like a 13.5 m/s sprint and every point would be dropped. The clock only
 * advances inside a tick (and only on ticks that actually emit) - it never
 * moves while paused.
 */

import {
  MAX_SPEED_MPS,
  MIN_STEP_M,
  SIM_EMIT_INTERVAL_MS,
  SIM_IDLE_INTERVAL_MS,
  SIM_JUMP_DISTANCE_M,
  SIM_NOISE_SIGMA_M,
  DEFAULT_SIM_SPEED,
  DEFAULT_SIM_START,
  WALK_SPEED_MPS,
} from "../constants";
import {
  bearingDegrees,
  haversineMeters,
  lerpLatLng,
  offsetPoint,
} from "../lib/geo";
import type { LatLng } from "../types";
import type {
  Fix,
  LocationError,
  SimSettings,
  SimulatedProvider,
} from "./LocationProvider";

/** How many ticks make up one SIM_IDLE_INTERVAL_MS window (>=1). */
const IDLE_EMIT_EVERY_N_TICKS = Math.max(
  1,
  Math.round(SIM_IDLE_INTERVAL_MS / SIM_EMIT_INTERVAL_MS),
);

/**
 * Perpendicular wobble for interior waypoints, as a fraction of one leg.
 *
 * Kept low on purpose. A symmetric zigzag adds very little length, so matching
 * DETOUR_FACTOR (1.3x) with wobble alone needs ~50% amplitude, which reads on
 * screen as a drunk sawtooth rather than a person walking. Nothing compares the
 * generated path against DETOUR_FACTOR - it's only used to estimate walk time
 * when suggesting a destination - so we optimise for looking believable and let
 * the path come out near 1.05-1.15x straight-line.
 */
const WOBBLE_MIN_FRACTION = 0.1;
const WOBBLE_MAX_FRACTION = 0.25;

/** Minimum/maximum number of legs in a generated walking path (inclusive). */
const MIN_LEGS = 6;
const MAX_LEGS = 10;

/** A wobbly polyline from the walker's position at walkTo()-time to a destination. */
type WalkPath = {
  /** Waypoints, start to destination inclusive. Length = legs.length + 1. */
  points: LatLng[];
  /** Great-circle length of each points[i] -> points[i+1] segment, meters. */
  legLengths: number[];
};

const DEFAULT_SETTINGS: SimSettings = {
  startLat: DEFAULT_SIM_START.lat,
  startLng: DEFAULT_SIM_START.lng,
  speedMultiplier: DEFAULT_SIM_SPEED,
  autoWalk: true,
  noise: false,
};

export class SimulatedLocationProvider implements SimulatedProvider {
  readonly kind = "sim" as const;

  private settings: SimSettings;

  // The simulator's own clock - see the file-level comment. Initialised to
  // real time when the provider is constructed, then only ever advanced (in
  // simulated-time increments) inside tick()/jumpToArrival().
  private simClock: number;

  // The walker's TRUE position. Never perturbed by noise: noise is applied
  // only to the fix handed to onFix, otherwise jitter would feed back into
  // the walk and the trail would wander off the generated path.
  private position: LatLng;

  private destination: LatLng | null = null;
  private path: WalkPath | null = null;
  // Where along `path` the walker currently is: on leg `legIndex`, having
  // covered `distanceIntoLeg` meters of that leg's length.
  private legIndex = 0;
  private distanceIntoLeg = 0;

  private paused = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  // Counts ticks while idle so we only emit every IDLE_EMIT_EVERY_N_TICKS-th
  // one (i.e. once per SIM_IDLE_INTERVAL_MS of real time).
  private idleTickCount = 0;

  private onFix: ((fix: Fix) => void) | null = null;

  constructor(initial?: Partial<SimSettings>) {
    this.settings = { ...DEFAULT_SETTINGS, ...initial };
    this.simClock = Date.now();
    this.position = { lat: this.settings.startLat, lng: this.settings.startLng };
  }

  now(): number {
    return this.simClock;
  }

  start(onFix: (fix: Fix) => void, _onError?: (err: LocationError) => void): void {
    // Calling start() twice replaces the callback but must not create a
    // second interval (the loop below already emits at the right rate). The
    // simulator never fails (no permissions/hardware to deny it), so unlike
    // the real provider it has no error condition to report - onError is
    // accepted for interface compatibility but intentionally unused.
    this.onFix = onFix;
    if (this.intervalId !== null) return;
    this.intervalId = setInterval(() => this.tick(), SIM_EMIT_INTERVAL_MS);
  }

  stop(): void {
    // Deliberately does not touch position/destination/path/settings: the
    // app swaps providers at runtime and start() after stop() must resume
    // exactly where things left off.
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getSettings(): SimSettings {
    return { ...this.settings };
  }

  updateSettings(patch: Partial<SimSettings>): void {
    // tick() reads `this.settings` fresh on every firing, so a mid-walk
    // change (e.g. speed multiplier) just changes the next step size - no
    // need to touch the interval or the walker's position/path here.
    this.settings = { ...this.settings, ...patch };
  }

  setPosition(pos: LatLng): void {
    this.position = { lat: pos.lat, lng: pos.lng };
    this.legIndex = 0;
    this.distanceIntoLeg = 0;
    // Teleporting mid-walk invalidates the old path (it started somewhere
    // else); regenerate it from the new spot to the same destination.
    this.path = this.destination
      ? this.generatePath(this.position, this.destination)
      : null;
  }

  walkTo(destination: LatLng | null, route?: LatLng[]): void {
    if (destination === null) {
      this.destination = null;
      this.path = null;
      this.legIndex = 0;
      this.distanceIntoLeg = 0;
      return;
    }
    this.destination = { lat: destination.lat, lng: destination.lng };
    this.path = route && route.length >= 2
      ? this.pathFromRoute(this.position, this.destination, route)
      : this.generatePath(this.position, this.destination);
    this.legIndex = 0;
    this.distanceIntoLeg = 0;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  jumpToArrival(): void {
    if (!this.destination) return;
    const dest = this.destination;

    // Approach along the walker's current bearing to the destination so the
    // jump reads as "the last few steps", not a teleport from nowhere.
    const approachBearing = bearingDegrees(this.position, dest);
    const backBearing = (approachBearing + 180) % 360;

    // We need two points that are both:
    //   - within SIM_JUMP_DISTANCE_M (< ARRIVAL_RADIUS_M) of the destination
    //   - more than MIN_STEP_M apart (or the trail filter treats it as
    //     standing-still jitter)
    //   - no faster than MAX_SPEED_MPS apart, given however much simulated
    //     time separates them
    // At very low speed multipliers a single tick doesn't leave enough
    // simulated time to satisfy both the min-step and max-speed bounds at
    // once, so we spend as many ticks' worth of simulated time as needed
    // (still "a normal emit's" unit of time, just possibly several of them).
    const oneTickSeconds = (SIM_EMIT_INTERVAL_MS * this.settings.speedMultiplier) / 1000;
    const margin = 0.5;
    const minGap = MIN_STEP_M + margin;
    let ticks = 1;
    let maxGap = Math.min(MAX_SPEED_MPS * oneTickSeconds * ticks - margin, SIM_JUMP_DISTANCE_M - 1);
    while (maxGap < minGap && ticks < 20) {
      ticks += 1;
      maxGap = Math.min(MAX_SPEED_MPS * oneTickSeconds * ticks - margin, SIM_JUMP_DISTANCE_M - 1);
    }
    const gap = Math.min(maxGap, Math.max(minGap, (minGap + maxGap) / 2));

    const first = offsetPoint(dest, backBearing, SIM_JUMP_DISTANCE_M);
    const second = offsetPoint(dest, backBearing, Math.max(0, SIM_JUMP_DISTANCE_M - gap));

    // Land the walker at the second (closer) point; a walk-in-progress path
    // is no longer relevant once we've jumped straight to arrival.
    this.path = null;
    this.legIndex = 0;
    this.distanceIntoLeg = 0;

    this.position = first;
    this.emit(first);

    this.simClock += oneTickSeconds * 1000 * ticks;
    this.position = second;
    this.emit(second);
  }

  // === internal: emission loop ===

  private tick(): void {
    if (this.paused) return;

    const isWalking =
      this.destination !== null && this.settings.autoWalk && this.path !== null;

    if (isWalking) {
      this.advanceWalk();
      this.simClock += SIM_EMIT_INTERVAL_MS * this.settings.speedMultiplier;
      this.emitCurrent();
      return;
    }

    // Idle (plan.md 8.4): only emit once per SIM_IDLE_INTERVAL_MS of real
    // time, so the "you are here" dot exists without flooding fixes.
    this.idleTickCount = (this.idleTickCount + 1) % IDLE_EMIT_EVERY_N_TICKS;
    if (this.idleTickCount !== 0) return;
    this.simClock += SIM_EMIT_INTERVAL_MS * this.settings.speedMultiplier;
    this.emitCurrent();
  }

  /** Metres to move this tick, at the current simulated walking speed. */
  private stepDistanceMeters(): number {
    return WALK_SPEED_MPS * this.settings.speedMultiplier * (SIM_EMIT_INTERVAL_MS / 1000);
  }

  /**
   * Move the walker `stepDistanceMeters()` further along `path`, carrying
   * any leftover distance across waypoint boundaries (a single step at high
   * multipliers can span more than one leg). Once the end of the path is
   * reached the walker is clamped exactly onto the destination and stays
   * there - callers keep calling this every tick, and it's a no-op past the
   * end, which is what makes "keep emitting the final position" work.
   */
  private advanceWalk(): void {
    if (!this.path) return;
    const { points, legLengths } = this.path;
    let remaining = this.stepDistanceMeters();

    while (remaining > 0 && this.legIndex < legLengths.length) {
      const legLen = legLengths[this.legIndex];
      const remainingInLeg = legLen - this.distanceIntoLeg;
      if (remaining < remainingInLeg) {
        this.distanceIntoLeg += remaining;
        remaining = 0;
      } else {
        remaining -= remainingInLeg;
        this.legIndex += 1;
        this.distanceIntoLeg = 0;
      }
    }

    if (this.legIndex >= legLengths.length) {
      this.position = points[points.length - 1];
      this.legIndex = legLengths.length;
      this.distanceIntoLeg = 0;
    } else {
      const legLen = legLengths[this.legIndex];
      const t = legLen === 0 ? 0 : this.distanceIntoLeg / legLen;
      this.position = lerpLatLng(points[this.legIndex], points[this.legIndex + 1], t);
    }
  }

  private emitCurrent(): void {
    this.emit(this.position);
  }

  private emit(truePoint: LatLng): void {
    if (!this.onFix) return;
    const { point, accuracy } = this.applyNoise(truePoint);
    this.onFix({ lat: point.lat, lng: point.lng, t: this.simClock, accuracy });
  }

  // === internal: noise (plan.md 8.2) ===

  private applyNoise(point: LatLng): { point: LatLng; accuracy: number } {
    if (!this.settings.noise) {
      return { point, accuracy: 5 };
    }
    const magnitude = Math.abs(SimulatedLocationProvider.gaussianSample(SIM_NOISE_SIGMA_M));
    const bearing = Math.random() * 360;
    const jittered = offsetPoint(point, bearing, magnitude);
    const accuracy = 8 + Math.random() * 12; // 8..20, per plan.md 8.2
    return { point: jittered, accuracy };
  }

  /** Standard Box-Muller transform, scaled to the given sigma. */
  private static gaussianSample(sigma: number): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const standardNormal = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return standardNormal * sigma;
  }

  // === internal: path generation (plan.md 8.3) ===

  private pathFromRoute(start: LatLng, destination: LatLng, route: LatLng[]): WalkPath {
    const points = [{ ...start }, ...route.map((point) => ({ ...point }))];
    if (haversineMeters(points[points.length - 1], destination) > 1) {
      points.push({ ...destination });
    }
    const legLengths = points.slice(0, -1).map((point, index) =>
      haversineMeters(point, points[index + 1]),
    );
    return { points, legLengths };
  }

  private generatePath(start: LatLng, destination: LatLng): WalkPath {
    const straightDistance = haversineMeters(start, destination);
    if (straightDistance < 1e-6) {
      return { points: [start, destination], legLengths: [0] };
    }

    const legCount = MIN_LEGS + Math.floor(Math.random() * (MAX_LEGS - MIN_LEGS + 1));
    const baseBearing = bearingDegrees(start, destination);
    const legLength = straightDistance / legCount;

    const points: LatLng[] = [start];
    // Alternate the offset side leg to leg so the path snakes rather than
    // bowing consistently to one side; randomise which side starts.
    let sign: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    for (let i = 1; i < legCount; i++) {
      const onLine = lerpLatLng(start, destination, i / legCount);
      const fraction =
        WOBBLE_MIN_FRACTION + Math.random() * (WOBBLE_MAX_FRACTION - WOBBLE_MIN_FRACTION);
      const magnitude = legLength * fraction;
      const perpBearing = (baseBearing + 90 * sign + 360) % 360;
      points.push(offsetPoint(onLine, perpBearing, magnitude));
      sign = sign === 1 ? -1 : 1;
    }
    points.push(destination);

    const legLengths: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      legLengths.push(haversineMeters(points[i], points[i + 1]));
    }
    return { points, legLengths };
  }
}
