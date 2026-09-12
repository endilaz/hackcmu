import type { AppState, TrailPoint, Walk } from "../types";
import type { SimSettings } from "../location/LocationProvider";
import {
  DEFAULT_SIM_SPEED,
  DEFAULT_SIM_START,
  SIM_SPEED_OPTIONS,
  SIM_STORAGE_KEY,
  STORAGE_KEY,
  TRAIL_PERSIST_THROTTLE_MS,
} from "../constants";

/** Simulator settings plus the "is the sim on" flag, persisted together. */
export type SimPersisted = SimSettings & { enabled: boolean };

export const EMPTY_STATE: AppState = {
  schemaVersion: 1,
  walks: [],
  activeWalk: null,
  visitedDestinationIds: [],
};

const DEFAULT_SIM: SimPersisted = {
  startLat: DEFAULT_SIM_START.lat,
  startLng: DEFAULT_SIM_START.lng,
  speedMultiplier: DEFAULT_SIM_SPEED,
  autoWalk: true,
  noise: true,
  enabled: false,
};

// --- Small validation helpers ----------------------------------------------

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isValidLat(v: unknown): v is number {
  return isFiniteNumber(v) && v >= -90 && v <= 90;
}

function isValidLng(v: unknown): v is number {
  return isFiniteNumber(v) && v >= -180 && v <= 180;
}

function isValidTrailPoint(v: unknown): v is TrailPoint {
  if (!isPlainObject(v)) return false;
  return (
    isFiniteNumber(v.lat) &&
    isFiniteNumber(v.lng) &&
    isFiniteNumber(v.t) &&
    (v.accuracy === undefined || isFiniteNumber(v.accuracy))
  );
}

function isValidWalk(v: unknown): v is Walk {
  if (!isPlainObject(v)) return false;
  const status = v.status;
  return (
    typeof v.id === "string" &&
    typeof v.destinationId === "string" &&
    isFiniteNumber(v.startedAt) &&
    (v.endedAt === null || isFiniteNumber(v.endedAt)) &&
    (status === "active" || status === "completed" || status === "abandoned") &&
    isFiniteNumber(v.freeMinutes) &&
    isFiniteNumber(v.estimatedMinutes) &&
    Array.isArray(v.trail) &&
    v.trail.every(isValidTrailPoint) &&
    isFiniteNumber(v.distanceMeters) &&
    typeof v.arrived === "boolean"
  );
}

// --- Deep-ish cloning (never share arrays with EMPTY_STATE or each other) --

function cloneTrailPoint(p: TrailPoint): TrailPoint {
  return { lat: p.lat, lng: p.lng, t: p.t, accuracy: p.accuracy };
}

function cloneWalk(w: Walk): Walk {
  return {
    id: w.id,
    destinationId: w.destinationId,
    startedAt: w.startedAt,
    endedAt: w.endedAt,
    status: w.status,
    freeMinutes: w.freeMinutes,
    estimatedMinutes: w.estimatedMinutes,
    trail: w.trail.map(cloneTrailPoint),
    distanceMeters: w.distanceMeters,
    arrived: w.arrived,
  };
}

function cloneState(state: AppState): AppState {
  return {
    schemaVersion: 1,
    walks: state.walks.map(cloneWalk),
    activeWalk: state.activeWalk ? cloneWalk(state.activeWalk) : null,
    visitedDestinationIds: [...state.visitedDestinationIds],
  };
}

function freshEmptyState(): AppState {
  return cloneState(EMPTY_STATE);
}

// --- App state --------------------------------------------------------------

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshEmptyState();

    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return freshEmptyState();
    if (parsed.schemaVersion !== 1) return freshEmptyState();
    if (!Array.isArray(parsed.walks)) return freshEmptyState();
    if (
      !Array.isArray(parsed.visitedDestinationIds) ||
      !parsed.visitedDestinationIds.every((id): id is string => typeof id === "string")
    ) {
      return freshEmptyState();
    }

    const rawActiveWalk = parsed.activeWalk;
    if (rawActiveWalk !== null && rawActiveWalk !== undefined) {
      if (!isPlainObject(rawActiveWalk) || !Array.isArray(rawActiveWalk.trail)) {
        return freshEmptyState();
      }
    }

    // Individual malformed walks are dropped rather than discarding everything.
    const walks = parsed.walks.filter(isValidWalk);

    // activeWalk already passed the "object with a trail array" gate above; if
    // it fails deeper field validation, drop just it rather than the whole state.
    const activeWalk =
      rawActiveWalk && isValidWalk(rawActiveWalk) ? rawActiveWalk : null;

    return cloneState({
      schemaVersion: 1,
      walks,
      activeWalk,
      visitedDestinationIds: parsed.visitedDestinationIds,
    });
  } catch {
    return freshEmptyState();
  }
}

let pendingState: AppState | null = null;
let throttleTimer: ReturnType<typeof setTimeout> | null = null;

function writeStateNow(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage disabled, full, or unavailable - a failed save must never
    // break a walk in progress.
  }
}

/** Immediate, unthrottled write. Supersedes any pending throttled write. */
export function saveState(state: AppState): void {
  if (throttleTimer !== null) {
    clearTimeout(throttleTimer);
    throttleTimer = null;
  }
  pendingState = null;
  writeStateNow(state);
}

/** At most one write per TRAIL_PERSIST_THROTTLE_MS, with a guaranteed trailing write. */
export function saveStateThrottled(state: AppState): void {
  pendingState = state;
  if (throttleTimer === null) {
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      if (pendingState !== null) {
        const toWrite = pendingState;
        pendingState = null;
        writeStateNow(toWrite);
      }
    }, TRAIL_PERSIST_THROTTLE_MS);
  }
}

/** Writes any pending throttled state immediately and cancels the timer. */
export function flushState(): void {
  if (throttleTimer !== null) {
    clearTimeout(throttleTimer);
    throttleTimer = null;
  }
  if (pendingState !== null) {
    const toWrite = pendingState;
    pendingState = null;
    writeStateNow(toWrite);
  }
}

// --- Simulator settings ------------------------------------------------------

export function loadSim(): SimPersisted {
  let stored: Record<string, unknown> = {};
  try {
    const raw = localStorage.getItem(SIM_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isPlainObject(parsed)) stored = parsed;
    }
  } catch {
    stored = {};
  }

  const speedMultiplier = (SIM_SPEED_OPTIONS as readonly unknown[]).includes(
    stored.speedMultiplier,
  )
    ? (stored.speedMultiplier as number)
    : DEFAULT_SIM.speedMultiplier;

  return {
    startLat: isValidLat(stored.startLat) ? stored.startLat : DEFAULT_SIM.startLat,
    startLng: isValidLng(stored.startLng) ? stored.startLng : DEFAULT_SIM.startLng,
    speedMultiplier,
    autoWalk: typeof stored.autoWalk === "boolean" ? stored.autoWalk : DEFAULT_SIM.autoWalk,
    noise: typeof stored.noise === "boolean" ? stored.noise : DEFAULT_SIM.noise,
    enabled: typeof stored.enabled === "boolean" ? stored.enabled : DEFAULT_SIM.enabled,
  };
}

export function saveSim(sim: SimPersisted): void {
  try {
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(sim));
  } catch {
    // swallow - a failed sim-settings save is not worth surfacing
  }
}

// --- Ids ---------------------------------------------------------------------

export function newId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to the timestamp+random fallback below
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
