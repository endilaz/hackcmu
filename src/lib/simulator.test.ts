import { describe, expect, it, vi } from "vitest";
import { SimulatedLocationProvider } from "../location/SimulatedLocationProvider";
import type { Fix } from "../location/LocationProvider";
import { acceptFix, initTracker } from "./tracking";
import { haversineMeters } from "./geo";
import { DEFAULT_SIM_START } from "../constants";

const DEST = { lat: 40.4388913, lng: -79.9487114 }; // Phipps, ~650 m away

describe("simulator drives a real trail end to end", () => {
  it("accumulates distance and fires arrival at 10x with noise", () => {
    vi.useFakeTimers();
    const sim = new SimulatedLocationProvider({
      startLat: DEFAULT_SIM_START.lat,
      startLng: DEFAULT_SIM_START.lng,
      speedMultiplier: 10,
      autoWalk: true,
      noise: true,
    });
    const fixes: Fix[] = [];
    sim.start((f) => fixes.push(f));
    sim.walkTo(DEST);

    let tracker = initTracker();
    let arrived = false;
    let accepted = 0;
    for (let i = 0; i < 400 && !arrived; i++) {
      vi.advanceTimersByTime(1000);
      while (fixes.length > 0) {
        const fix = fixes.shift()!;
        const r = acceptFix(tracker, fix, DEST);
        tracker = r.state;
        if (r.accepted) accepted++;
        if (r.arrived) arrived = true;
      }
    }
    sim.stop();
    vi.useRealTimers();

    const straight = haversineMeters(DEFAULT_SIM_START, DEST);
    console.log(
      `accepted=${accepted} distance=${Math.round(tracker.distanceMeters)}m ` +
        `straight=${Math.round(straight)}m ratio=${(tracker.distanceMeters / straight).toFixed(2)} arrived=${arrived}`,
    );

    expect(arrived).toBe(true);
    expect(accepted).toBeGreaterThan(10);
    expect(tracker.distanceMeters).toBeGreaterThan(straight * 0.9);
  });
});
