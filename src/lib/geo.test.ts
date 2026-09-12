import { describe, it, expect } from "vitest";
import {
  haversineMeters,
  estimateWalkMinutes,
  offsetPoint,
  formatDistance,
  formatDuration,
} from "./geo";
import { DETOUR_FACTOR, WALK_SPEED_MPS } from "../constants";
import type { LatLng } from "../types";

describe("haversineMeters", () => {
  it("matches a known pair (CMU Fence to Phipps Conservatory, ~650 m)", () => {
    const fence: LatLng = { lat: 40.4428, lng: -79.943 };
    const phipps: LatLng = { lat: 40.4389, lng: -79.9487 };
    const d = haversineMeters(fence, phipps);
    expect(d).toBeGreaterThan(550);
    expect(d).toBeLessThan(750);
  });

  it("is 0 for a point to itself", () => {
    const p: LatLng = { lat: 12.34, lng: -56.78 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it("is symmetric", () => {
    const a: LatLng = { lat: 40.4428, lng: -79.943 };
    const b: LatLng = { lat: 40.4389, lng: -79.9487 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});

describe("estimateWalkMinutes", () => {
  it("scales with DETOUR_FACTOR / WALK_SPEED_MPS", () => {
    const straight = 1000;
    const expected = (straight * DETOUR_FACTOR) / WALK_SPEED_MPS / 60;
    expect(estimateWalkMinutes(straight)).toBeCloseTo(expected, 9);
  });

  it("is proportional to straight-line distance", () => {
    const one = estimateWalkMinutes(500);
    const double = estimateWalkMinutes(1000);
    expect(double).toBeCloseTo(one * 2, 9);
  });
});

describe("offsetPoint", () => {
  it("moving X metres then measuring back gives ~X metres", () => {
    const start: LatLng = { lat: 40.4428, lng: -79.943 };
    const moved = offsetPoint(start, 37, 250);
    const back = haversineMeters(start, moved);
    expect(back).toBeGreaterThan(248);
    expect(back).toBeLessThan(252);
  });

  it("bearing 0 increases latitude", () => {
    const start: LatLng = { lat: 40.4428, lng: -79.943 };
    const north = offsetPoint(start, 0, 100);
    expect(north.lat).toBeGreaterThan(start.lat);
  });
});

describe("formatDistance", () => {
  it("formats sub-kilometre distances as whole metres", () => {
    expect(formatDistance(240)).toBe("240 m");
    expect(formatDistance(0)).toBe("0 m");
  });

  it("formats kilometre-plus distances with two decimals", () => {
    expect(formatDistance(1240)).toBe("1.24 km");
    expect(formatDistance(1000)).toBe("1.00 km");
  });
});

describe("formatDuration", () => {
  it("formats under an hour as m:ss with zero-padded seconds", () => {
    expect(formatDuration(65 * 1000)).toBe("1:05");
    expect(formatDuration(9 * 1000)).toBe("0:09");
  });

  it("formats an hour or more as h:mm:ss", () => {
    expect(formatDuration((3600 + 90) * 1000)).toBe("1:01:30");
  });
});
