import { describe, it, expect } from "vitest";
import { buildLeaderboard } from "./social";
import type { Friend, Stats } from "../types";

function makeFriend(overrides: Partial<Friend>): Friend {
  return {
    id: "friend",
    name: "Friend",
    emoji: "🙂",
    totalWalks: 10,
    totalMeters: 10_000,
    uniqueDestinations: 5,
    currentStreakDays: 1,
    points: 100,
    lastWalkDaysAgo: 0,
    lastDestinationName: "The Fence (CMU)",
    ...overrides,
  };
}

function makeStats(overrides: Partial<Stats>): Stats {
  return {
    totalWalks: 0,
    totalMeters: 0,
    uniqueDestinations: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    points: 0,
    ...overrides,
  };
}

describe("buildLeaderboard", () => {
  it("includes the user exactly once, marked isYou with name 'You'", () => {
    const friends = [
      makeFriend({ id: "a", name: "A", points: 50 }),
      makeFriend({ id: "b", name: "B", points: 150 }),
    ];
    const rows = buildLeaderboard(friends, makeStats({ points: 80 }));

    const youRows = rows.filter((row) => row.isYou);
    expect(youRows).toHaveLength(1);
    expect(youRows[0].name).toBe("You");
    expect(rows).toHaveLength(friends.length + 1);
  });

  it("sorts rows by points descending", () => {
    const friends = [
      makeFriend({ id: "a", name: "A", points: 300 }),
      makeFriend({ id: "b", name: "B", points: 10 }),
      makeFriend({ id: "c", name: "C", points: 200 }),
    ];
    const rows = buildLeaderboard(friends, makeStats({ points: 100 }));

    expect(rows.map((row) => row.points)).toEqual([300, 200, 100, 10]);
  });

  it("gives tied scores standard competition ranks (1, 2, 2, 4)", () => {
    const friends = [
      makeFriend({ id: "a", name: "A", points: 500 }),
      makeFriend({ id: "b", name: "B", points: 300 }),
      makeFriend({ id: "c", name: "C", points: 300 }),
    ];
    const rows = buildLeaderboard(friends, makeStats({ points: 100 }));

    const byId = Object.fromEntries(rows.map((row) => [row.id, row.rank]));
    expect(byId.a).toBe(1);
    expect(byId.b).toBe(2);
    expect(byId.c).toBe(2);
    expect(byId.you).toBe(4);
  });

  it("still ranks a zero-point user, placing them last", () => {
    const friends = [
      makeFriend({ id: "a", name: "A", points: 40 }),
      makeFriend({ id: "b", name: "B", points: 20 }),
    ];
    const rows = buildLeaderboard(friends, makeStats({ points: 0 }));

    const you = rows.find((row) => row.isYou);
    expect(you).toBeDefined();
    expect(you?.points).toBe(0);
    expect(you?.rank).toBe(3);
  });

  it("returns exactly one row (the user, rank 1) when there are no friends", () => {
    const rows = buildLeaderboard([], makeStats({ points: 0 }));

    expect(rows).toHaveLength(1);
    expect(rows[0].isYou).toBe(true);
    expect(rows[0].rank).toBe(1);
  });
});
