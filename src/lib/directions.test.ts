import { describe, expect, it } from "vitest";
import type { WalkingRoute } from "./directions";
import { progressAlongRoute } from "./directions";
import { offsetPoint } from "./geo";

const START = { lat: 40.4428, lng: -79.943 };

describe("progressAlongRoute", () => {
  it("trims completed route geometry and reports remaining distance", () => {
    const middle = offsetPoint(START, 90, 100);
    const end = offsetPoint(START, 90, 200);
    const route: WalkingRoute = {
      geometry: [START, middle, end],
      distanceMeters: 200,
      durationSeconds: 150,
      destination: end,
    };

    const progress = progressAlongRoute(route, offsetPoint(START, 90, 75));

    expect(progress.geometry).toHaveLength(3);
    expect(progress.remainingMeters).toBeCloseTo(125, 0);
    expect(progress.offRouteMeters).toBeLessThan(1);
  });

  it("reports perpendicular distance when the user leaves the route", () => {
    const end = offsetPoint(START, 90, 200);
    const route: WalkingRoute = {
      geometry: [START, end],
      distanceMeters: 200,
      durationSeconds: 150,
      destination: end,
    };

    const progress = progressAlongRoute(route, offsetPoint(START, 0, 60));

    expect(progress.offRouteMeters).toBeCloseTo(60, -1);
  });
});
