import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { computeStats, computeBadges } from "./achievements";
import type { Walk } from "../types";

// Minimal ambient type for Node's `process` - this project's tsconfig has no
// @types/node, but vitest runs on Node so the real global exists at runtime.
declare const process: { env: Record<string, string | undefined> };

/** "Now" pinned to a fixed local moment so tests never break tomorrow. */
const NOW = new Date(2024, 5, 15, 12, 0, 0).getTime(); // Sat Jun 15 2024, local noon

/** Same local time of day, `n` local calendar days before NOW. */
function daysAgo(n: number): number {
  return new Date(2024, 5, 15 - n, 10, 0, 0).getTime();
}

let walkCounter = 0;
function makeWalk(overrides: Partial<Walk> & { startedAt: number }): Walk {
  walkCounter++;
  return {
    id: overrides.id ?? `walk-${walkCounter}`,
    destinationId: overrides.destinationId ?? "dest-1",
    startedAt: overrides.startedAt,
    endedAt: overrides.endedAt ?? overrides.startedAt + 10 * 60 * 1000,
    status: overrides.status ?? "completed",
    freeMinutes: overrides.freeMinutes ?? 30,
    estimatedMinutes: overrides.estimatedMinutes ?? 10,
    trail: overrides.trail ?? [],
    distanceMeters: overrides.distanceMeters ?? 500,
    arrived: overrides.arrived ?? true,
  };
}

describe("computeStats - empty history", () => {
  it("returns all zeros and computeBadges doesn't crash", () => {
    const stats = computeStats([], [], NOW);
    expect(stats).toEqual({
      totalWalks: 0,
      totalMeters: 0,
      uniqueDestinations: 0,
      currentStreakDays: 0,
      longestStreakDays: 0,
      points: 0,
    });

    const badges = computeBadges([], stats);
    expect(badges.length).toBeGreaterThan(0);
    expect(badges.every((b) => !b.earned)).toBe(true);
  });
});

describe("computeStats - totals", () => {
  it("abandoned walks add distance but don't count as completed walks", () => {
    const walks = [
      makeWalk({ startedAt: daysAgo(0), status: "completed", distanceMeters: 300 }),
      makeWalk({
        startedAt: daysAgo(0),
        status: "abandoned",
        distanceMeters: 700,
        arrived: false,
      }),
    ];
    const stats = computeStats(walks, [], NOW);
    expect(stats.totalWalks).toBe(1);
    expect(stats.totalMeters).toBe(1000);
  });

  it("computes the points formula as documented", () => {
    const walks = [
      makeWalk({ startedAt: daysAgo(0), distanceMeters: 1234 }),
      makeWalk({ startedAt: daysAgo(1), distanceMeters: 500 }),
    ];
    const visited = ["a", "b", "c"];
    const stats = computeStats(walks, visited, NOW);

    // totalWalks=2 -> 20, totalMeters=1734 -> floor(1734/100)=17,
    // uniqueDestinations=3 -> 75. Total: 20 + 17 + 75 = 112.
    expect(stats.totalMeters).toBe(1734);
    expect(stats.points).toBe(2 * 10 + 17 * 1 + 3 * 25);
  });
});

describe("computeStats - streaks", () => {
  it("counts a run of consecutive days correctly", () => {
    const walks = [0, 1, 2].map((n) => makeWalk({ startedAt: daysAgo(n) }));
    const stats = computeStats(walks, [], NOW);
    expect(stats.currentStreakDays).toBe(3);
    expect(stats.longestStreakDays).toBe(3);
  });

  it("keeps the streak alive when the last walk was yesterday", () => {
    const walks = [makeWalk({ startedAt: daysAgo(1) })];
    const stats = computeStats(walks, [], NOW);
    expect(stats.currentStreakDays).toBe(1);
  });

  it("treats a streak that lapsed 3 days ago as 0 (but still counts toward longest)", () => {
    const walks = [makeWalk({ startedAt: daysAgo(3) })];
    const stats = computeStats(walks, [], NOW);
    expect(stats.currentStreakDays).toBe(0);
    expect(stats.longestStreakDays).toBe(1);
  });

  it("finds the longest streak earlier in history even when the current streak is short", () => {
    const walks = [
      ...[10, 9, 8, 7].map((n) => makeWalk({ startedAt: daysAgo(n) })), // 4-day run, long ago
      makeWalk({ startedAt: daysAgo(1) }), // isolated walk yesterday
    ];
    const stats = computeStats(walks, [], NOW);
    expect(stats.currentStreakDays).toBe(1);
    expect(stats.longestStreakDays).toBe(4);
  });
});

describe("computeBadges", () => {
  it("flips 'earned' exactly at the walk-count threshold (4 vs 5 walks)", () => {
    const fourWalks = [0, 1, 2, 3].map((n) => makeWalk({ startedAt: daysAgo(n) }));
    const fiveWalks = [0, 1, 2, 3, 4].map((n) => makeWalk({ startedAt: daysAgo(n) }));

    const statsFour = computeStats(fourWalks, [], NOW);
    const statsFive = computeStats(fiveWalks, [], NOW);

    const badgeAtFour = computeBadges(fourWalks, statsFour).find((b) => b.id === "five-walks");
    const badgeAtFive = computeBadges(fiveWalks, statsFive).find((b) => b.id === "five-walks");

    expect(badgeAtFour?.earned).toBe(false);
    expect(badgeAtFour?.progress).toEqual({ current: 4, target: 5 });
    expect(badgeAtFive?.earned).toBe(true);
    expect(badgeAtFive?.progress).toEqual({ current: 5, target: 5 });
  });
});

describe("computeStats - local vs UTC day boundary", () => {
  // Force a timezone west of UTC. A naive implementation that derives the day
  // key from `toISOString()` (UTC fields) instead of local getFullYear/
  // getMonth/getDate would push a late-evening local walk into the next UTC
  // day and miscount the streak - this test is built to catch exactly that.
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "America/Los_Angeles";
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it("counts a late-evening local walk as today, not the next UTC day", () => {
    // "Now" is local June 15, 2024, 08:00 - well before the local-to-UTC day
    // rollover (which happens at 17:00 local time in this zone in summer).
    const now = new Date(2024, 5, 15, 8, 0, 0).getTime();
    // The walk started local June 15, 23:30 - after that rollover, so in UTC
    // it already falls on June 16. Its LOCAL day is still June 15, same as
    // `now`, so it must count as "today" and keep the streak at 1.
    const startedAt = new Date(2024, 5, 15, 23, 30, 0).getTime();

    const walk = makeWalk({ startedAt });
    const stats = computeStats([walk], [], now);

    expect(stats.currentStreakDays).toBe(1);
  });
});
