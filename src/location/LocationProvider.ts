import type { LatLng } from "../types";

/** A single position report. Both providers emit exactly this shape. */
export type Fix = {
  lat: number;
  lng: number;
  t: number; // epoch ms
  accuracy: number; // meters
};

export type LocationErrorCode = "denied" | "unavailable" | "timeout";

export type LocationError = {
  code: LocationErrorCode;
  message: string;
};

/**
 * The app talks to location only through this interface, so the real GPS and
 * the simulator are interchangeable at runtime with no branching in app code.
 */
export interface LocationProvider {
  readonly kind: "real" | "sim";
  /**
   * The provider's idea of "now", in epoch ms. Real GPS returns Date.now().
   * The simulator returns SIMULATED time, which advances by the speed
   * multiplier - so a 10x walk covers 13.5 m per real second but reports 10 s
   * of elapsed time per emit. Without this the trail filter in lib/tracking.ts
   * would reject every simulated fix as a >3 m/s GPS jump, and the summary
   * would show a 1.2 km walk completed in 72 seconds. The app must use this
   * instead of Date.now() for anything walk-related.
   */
  now(): number;
  /** Begin emitting fixes. Safe to call twice; the second call replaces the first. */
  start(onFix: (fix: Fix) => void, onError?: (err: LocationError) => void): void;
  /** Stop emitting. Safe to call when not started. */
  stop(): void;
}

/** User-adjustable simulator settings, persisted under SIM_STORAGE_KEY. */
export type SimSettings = {
  startLat: number;
  startLng: number;
  speedMultiplier: number; // one of SIM_SPEED_OPTIONS
  autoWalk: boolean;
  noise: boolean;
};

/** The simulator is a LocationProvider plus demo controls (plan.md 8.2). */
export interface SimulatedProvider extends LocationProvider {
  readonly kind: "sim";
  getSettings(): SimSettings;
  updateSettings(patch: Partial<SimSettings>): void;
  /** Teleport the simulated walker. Used by "Apply" and by resume-on-reload. */
  setPosition(pos: LatLng): void;
  /**
   * Start auto-walking toward a destination, generating a wobbly path from the
   * current simulated position. Pass null to go back to idle behaviour.
   */
  walkTo(destination: LatLng | null): void;
  pause(): void;
  resume(): void;
  isPaused(): boolean;
  /** Teleport to within SIM_JUMP_DISTANCE_M of the destination and emit there. */
  jumpToArrival(): void;
}
