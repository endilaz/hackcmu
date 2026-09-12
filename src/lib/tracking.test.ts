import { describe, it, expect } from "vitest";
import { initTracker, acceptFix } from "./tracking";
import { offsetPoint } from "./geo";
import {
  MAX_ACCURACY_M,
  MIN_STEP_M,
  ARRIVAL_RADIUS_M,
  ARRIVAL_CONSECUTIVE_POINTS,
} from "../constants";
import type { LatLng } from "../types";
import type { Fix } from "../location/LocationProvider";

const ORIGIN: LatLng = { lat: 40.4428, lng: -79.943 };
const FAR_DESTINATION: LatLng = { lat: 40.5, lng: -80.0 }; // far away, never "arrived"

function fixAt(p: LatLng, t: number, accuracy = 10): Fix {
  return { lat: p.lat, lng: p.lng, t, accuracy };
}

describe("acceptFix - filtering", () => {
  it("rejects a fix with accuracy above MAX_ACCURACY_M", () => {
    const state = initTracker();
    const fix = fixAt(ORIGIN, 0, MAX_ACCURACY_M + 1);
    const result = acceptFix(state, fix, FAR_DESTINATION);
    expect(result.accepted).toBe(false);
    expect(result.arrived).toBe(false);
    expect(result.state).toBe(state);
    expect(result.state.trail.length).toBe(0);
  });

  it("accepts the first fix and adds 0 distance", () => {
    const state = initTracker();
    const fix = fixAt(ORIGIN, 0);
    const result = acceptFix(state, fix, FAR_DESTINATION);
    expect(result.accepted).toBe(true);
    expect(result.state.distanceMeters).toBe(0);
    expect(result.state.trail.length).toBe(1);
  });

  it("rejects a sub-MIN_STEP_M move and leaves distance exactly 0", () => {
    let state = initTracker();
    state = acceptFix(state, fixAt(ORIGIN, 0), FAR_DESTINATION).state;

    const jitter = offsetPoint(ORIGIN, 45, MIN_STEP_M - 1);
    const result = acceptFix(state, fixAt(jitter, 5000), FAR_DESTINATION);

    expect(result.accepted).toBe(false);
    expect(result.state.distanceMeters).toBe(0);
    expect(result.state.trail.length).toBe(1);
  });

  it("rejects a jump implying speed above MAX_SPEED_MPS", () => {
    let state = initTracker();
    state = acceptFix(state, fixAt(ORIGIN, 0), FAR_DESTINATION).state;

    // 100 m in 1 s = 100 m/s, far above MAX_SPEED_MPS.
    const jump = offsetPoint(ORIGIN, 90, 100);
    const result = acceptFix(state, fixAt(jump, 1000), FAR_DESTINATION);

    expect(result.accepted).toBe(false);
    expect(result.state.distanceMeters).toBe(0);
    expect(result.state.trail.length).toBe(1);
  });

  it("accepts a normal walking step and adds roughly the right distance", () => {
    let state = initTracker();
    state = acceptFix(state, fixAt(ORIGIN, 0), FAR_DESTINATION).state;

    // 10 m in ~8s ~= 1.25 m/s, a normal walking pace.
    const stepped = offsetPoint(ORIGIN, 90, 10);
    const result = acceptFix(state, fixAt(stepped, 8000), FAR_DESTINATION);

    expect(result.accepted).toBe(true);
    expect(result.state.distanceMeters).toBeGreaterThan(9);
    expect(result.state.distanceMeters).toBeLessThan(11);
  });

  it("measures the next fix from the last ACCEPTED point, not a rejected one", () => {
    let state = initTracker();
    // P0: origin, t=0, accepted.
    state = acceptFix(state, fixAt(ORIGIN, 0), FAR_DESTINATION).state;

    // P1: 1 m north of P0 - rejected (below MIN_STEP_M).
    const p1 = offsetPoint(ORIGIN, 0, 1);
    const rejected = acceptFix(state, fixAt(p1, 1000), FAR_DESTINATION);
    expect(rejected.accepted).toBe(false);
    state = rejected.state;
    expect(state.trail.length).toBe(1);

    // P2: 5 m south of P0 (P0, not P1). If the implementation wrongly measured
    // from P1 the added distance would be ~6 m instead of ~5 m.
    const p2 = offsetPoint(ORIGIN, 180, 5);
    const accepted = acceptFix(state, fixAt(p2, 5000), FAR_DESTINATION);

    expect(accepted.accepted).toBe(true);
    expect(accepted.state.trail.length).toBe(2);
    expect(accepted.state.distanceMeters).toBeGreaterThan(4.5);
    expect(accepted.state.distanceMeters).toBeLessThan(5.5);
  });
});

describe("acceptFix - arrival", () => {
  it("requires ARRIVAL_CONSECUTIVE_POINTS in-radius points, and an out-of-radius point resets the streak", () => {
    expect(ARRIVAL_CONSECUTIVE_POINTS).toBe(2);
    const destination: LatLng = { lat: 40.44, lng: -79.945 };
    // Points strung out along bearing 0 from the destination, at decreasing
    // (then increasing, then decreasing again) distance.
    const at = (meters: number) => offsetPoint(destination, 0, meters);

    let state = initTracker();
    let r;

    r = acceptFix(state, fixAt(at(100), 0), destination); // far: out of radius
    state = r.state;
    expect(r.accepted).toBe(true);
    expect(r.arrived).toBe(false);
    expect(state.consecutiveInRadius).toBe(0);

    r = acceptFix(state, fixAt(at(70), 30000), destination); // still out of radius
    state = r.state;
    expect(r.arrived).toBe(false);
    expect(state.consecutiveInRadius).toBe(0);
    expect(70).toBeGreaterThan(ARRIVAL_RADIUS_M);

    r = acceptFix(state, fixAt(at(20), 60000), destination); // in radius: 1st
    state = r.state;
    expect(20).toBeLessThan(ARRIVAL_RADIUS_M);
    expect(state.consecutiveInRadius).toBe(1);
    expect(r.arrived).toBe(false); // one alone is not enough

    r = acceptFix(state, fixAt(at(90), 90000), destination); // back out: resets
    state = r.state;
    expect(state.consecutiveInRadius).toBe(0);
    expect(r.arrived).toBe(false);

    r = acceptFix(state, fixAt(at(20), 120000), destination); // in radius: 1st again
    state = r.state;
    expect(state.consecutiveInRadius).toBe(1);
    expect(r.arrived).toBe(false);

    r = acceptFix(state, fixAt(at(15), 150000), destination); // in radius: 2nd -> arrived
    state = r.state;
    expect(state.consecutiveInRadius).toBe(2);
    expect(r.arrived).toBe(true);
  });
});

describe("acceptFix - purity", () => {
  it("does not mutate the state object passed in", () => {
    const state = initTracker();
    const originalTrailRef = state.trail;
    const result = acceptFix(state, fixAt(ORIGIN, 0), FAR_DESTINATION);

    expect(state.trail).toBe(originalTrailRef);
    expect(state.trail.length).toBe(0);
    expect(state.distanceMeters).toBe(0);
    expect(result.state).not.toBe(state);
    expect(result.state.trail).not.toBe(state.trail);
  });

  it("returns the same state reference when a fix is rejected", () => {
    const state = initTracker();
    const fix = fixAt(ORIGIN, 0, MAX_ACCURACY_M + 1);
    const result = acceptFix(state, fix, FAR_DESTINATION);
    expect(result.state).toBe(state);
  });
});
