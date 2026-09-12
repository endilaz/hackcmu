import { describe, it, expect } from "vitest";
import { pickDestination } from "./selection";
import { offsetPoint } from "./geo";
import { MIN_DESTINATION_DISTANCE_M } from "../constants";
import type { Destination, LatLng } from "../types";

const FROM: LatLng = { lat: 40.4428, lng: -79.943 };
const zero = () => 0;

/** A synthetic destination at an exact straight-line distance from FROM. */
function destAt(id: string, meters: number, bearing = 90): Destination {
  const p = offsetPoint(FROM, bearing, meters);
  return { id, name: id, lat: p.lat, lng: p.lng, blurb: "" };
}

describe("pickDestination", () => {
  it("never suggests a destination closer than MIN_DESTINATION_DISTANCE_M", () => {
    const tooClose = destAt("close", MIN_DESTINATION_DISTANCE_M - 20);
    const far = destAt("far", 500);
    const result = pickDestination({
      from: FROM,
      freeMinutes: 60,
      destinations: [tooClose, far],
      visitedIds: [],
      random: zero,
    });
    expect(result).not.toBeNull();
    expect(result!.destination.id).toBe("far");
    expect(result!.straightMeters).toBeGreaterThanOrEqual(MIN_DESTINATION_DISTANCE_M);
  });

  it("prefers an unvisited destination over a visited one given a generous budget", () => {
    const visited = destAt("visited", 200);
    const unvisited = destAt("unvisited", 300, 180);
    const result = pickDestination({
      from: FROM,
      freeMinutes: 60,
      destinations: [visited, unvisited],
      visitedIds: [visited.id],
      random: zero,
    });
    expect(result).not.toBeNull();
    expect(result!.destination.id).toBe("unvisited");
    expect(result!.visited).toBe(false);
  });

  it("still returns a destination when every candidate has been visited", () => {
    const a = destAt("a", 200);
    const b = destAt("b", 300, 180);
    const result = pickDestination({
      from: FROM,
      freeMinutes: 60,
      destinations: [a, b],
      visitedIds: [a.id, b.id],
      random: zero,
    });
    expect(result).not.toBeNull();
    expect(["a", "b"]).toContain(result!.destination.id);
    expect(result!.visited).toBe(true);
  });

  it("falls back to the nearest destination, flagged overBudget, when nothing fits the time budget", () => {
    const near = destAt("near", 5000);
    const far = destAt("far", 8000, 180);
    const result = pickDestination({
      from: FROM,
      freeMinutes: 5,
      destinations: [near, far],
      visitedIds: [],
      random: zero,
    });
    expect(result).not.toBeNull();
    expect(result!.destination.id).toBe("near");
    expect(result!.overBudget).toBe(true);
    expect(result!.overByMinutes).toBeGreaterThan(0);
  });

  it("excludeIds keeps the excluded destination out of the result", () => {
    const a = destAt("a", 300);
    const b = destAt("b", 400, 180);
    const result = pickDestination({
      from: FROM,
      freeMinutes: 60,
      destinations: [a, b],
      visitedIds: [],
      excludeIds: [a.id],
      random: zero,
    });
    expect(result).not.toBeNull();
    expect(result!.destination.id).toBe("b");
    expect(result!.excludesReset).toBe(false);
  });

  it("wraps around with excludesReset true when excludeIds covers every candidate", () => {
    const a = destAt("a", 300);
    const b = destAt("b", 400, 180);
    const result = pickDestination({
      from: FROM,
      freeMinutes: 60,
      destinations: [a, b],
      visitedIds: [],
      excludeIds: [a.id, b.id],
      random: zero,
    });
    expect(result).not.toBeNull();
    expect(["a", "b"]).toContain(result!.destination.id);
    expect(result!.excludesReset).toBe(true);
  });

  it("returns null when the destination list is empty", () => {
    const result = pickDestination({
      from: FROM,
      freeMinutes: 60,
      destinations: [],
      visitedIds: [],
      random: zero,
    });
    expect(result).toBeNull();
  });

  it("returns null when everything is inside MIN_DESTINATION_DISTANCE_M", () => {
    const a = destAt("a", 10);
    const b = destAt("b", 20, 180);
    const result = pickDestination({
      from: FROM,
      freeMinutes: 60,
      destinations: [a, b],
      visitedIds: [],
      random: zero,
    });
    expect(result).toBeNull();
  });
});
