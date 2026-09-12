/** Trail filtering and arrival detection. See plan.md sections 7.3 and 7.4. */

import { haversineMeters } from "./geo";
import {
  MAX_ACCURACY_M,
  MIN_STEP_M,
  MAX_SPEED_MPS,
  ARRIVAL_RADIUS_M,
  ARRIVAL_CONSECUTIVE_POINTS,
} from "../constants";
import type { LatLng, TrailPoint } from "../types";
import type { Fix } from "../location/LocationProvider";

export type TrackerState = {
  trail: TrailPoint[];
  distanceMeters: number;
  consecutiveInRadius: number;
};

/** Fresh tracker, or one resumed from a saved trail/distance (localStorage). */
export function initTracker(
  trail: TrailPoint[] = [],
  distanceMeters: number = 0,
): TrackerState {
  return { trail, distanceMeters, consecutiveInRadius: 0 };
}

export function acceptFix(
  state: TrackerState,
  fix: Fix,
  destination: LatLng,
): { state: TrackerState; accepted: boolean; arrived: boolean } {
  // 1. Reject fixes less precise than MAX_ACCURACY_M.
  if (fix.accuracy > MAX_ACCURACY_M) {
    return { state, accepted: false, arrived: false };
  }

  const prev = state.trail[state.trail.length - 1];
  let distanceMeters = state.distanceMeters;

  if (prev) {
    const d = haversineMeters(prev, fix);
    const dt = (fix.t - prev.t) / 1000;

    // 4. Reject jitter while standing still.
    if (d < MIN_STEP_M) {
      return { state, accepted: false, arrived: false };
    }

    // 5. Reject GPS jumps - implied speed too high to be a walk.
    if (dt > 0 && d / dt > MAX_SPEED_MPS) {
      return { state, accepted: false, arrived: false };
    }

    distanceMeters += d;
  }
  // 2. Empty trail: accept as the first point, distance += 0 (handled above:
  //    `prev` is undefined so the distance/speed checks are skipped).

  const point: TrailPoint = {
    lat: fix.lat,
    lng: fix.lng,
    t: fix.t,
    accuracy: fix.accuracy,
  };
  const trail = [...state.trail, point];

  // Arrival detection (plan.md 7.4), evaluated only on accepted points.
  const withinRadius = haversineMeters(point, destination) <= ARRIVAL_RADIUS_M;
  const consecutiveInRadius = withinRadius ? state.consecutiveInRadius + 1 : 0;

  const nextState: TrackerState = { trail, distanceMeters, consecutiveInRadius };
  const arrived = consecutiveInRadius >= ARRIVAL_CONSECUTIVE_POINTS;

  return { state: nextState, accepted: true, arrived };
}
