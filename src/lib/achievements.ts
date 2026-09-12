/**
 * Progress / gamification: pure derivations from walk history into Stats and
 * Badge[]. No React, no localStorage, no Date.now() inside the computation -
 * "now" is always passed in so callers (and tests) can pin "today".
 */

import type { Badge, Stats, Walk } from "../types";

// --- Points formula --------------------------------------------------------
// points = (completed walks * POINTS_PER_COMPLETED_WALK)
//        + (total meters walked / METERS_PER_DISTANCE_POINT, floored) * POINTS_PER_DISTANCE_UNIT
//        + (unique destinations discovered * POINTS_PER_UNIQUE_DESTINATION)
const POINTS_PER_COMPLETED_WALK = 10;
const METERS_PER_DISTANCE_POINT = 100;
const POINTS_PER_DISTANCE_UNIT = 1;
const POINTS_PER_UNIQUE_DESTINATION = 25;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Integer day index for the LOCAL calendar day containing `epochMs`.
 *
 * Deliberately built from local getFullYear/getMonth/getDate (not
 * `toISOString`, which reads UTC fields and would silently shift a walk into
 * the wrong day for anyone west of UTC). Feeding those local y/m/d values
 * into `Date.UTC` just gives us a plain integer that increases by exactly 1
 * per local calendar day - it's never rendered or compared to a real UTC
 * time, so DST transitions in the local zone can't skew it.
 */
function localDayKey(epochMs: number): number {
  const d = new Date(epochMs);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY;
}

/** Current (still-alive) and longest streak of days present in `dayKeys`. */
function computeStreaks(
  dayKeys: Set<number>,
  now: number,
): { current: number; longest: number } {
  if (dayKeys.size === 0) return { current: 0, longest: 0 };

  const sorted = [...dayKeys].sort((a, b) => a - b);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const today = localDayKey(now);
  let start: number | null = null;
  if (dayKeys.has(today)) start = today;
  else if (dayKeys.has(today - 1)) start = today - 1;

  let current = 0;
  if (start !== null) {
    for (let day = start; dayKeys.has(day); day--) current++;
  }

  return { current, longest };
}

export function computeStats(
  walks: Walk[],
  visitedDestinationIds: string[],
  now: number = Date.now(),
): Stats {
  const completedWalks = walks.filter((w) => w.status === "completed");

  const totalWalks = completedWalks.length;
  // Distance counts for every walk, completed or abandoned - you still walked it.
  const totalMeters = walks.reduce((sum, w) => sum + w.distanceMeters, 0);
  const uniqueDestinations = visitedDestinationIds.length;

  const completedDayKeys = new Set(completedWalks.map((w) => localDayKey(w.startedAt)));
  const { current: currentStreakDays, longest: longestStreakDays } = computeStreaks(
    completedDayKeys,
    now,
  );

  const points =
    totalWalks * POINTS_PER_COMPLETED_WALK +
    Math.floor(totalMeters / METERS_PER_DISTANCE_POINT) * POINTS_PER_DISTANCE_UNIT +
    uniqueDestinations * POINTS_PER_UNIQUE_DESTINATION;

  return {
    totalWalks,
    totalMeters,
    uniqueDestinations,
    currentStreakDays,
    longestStreakDays,
    points,
  };
}

/** Fixed, ordered badge definitions - each genuinely derivable from Stats. */
const BADGE_DEFS: {
  id: string;
  name: string;
  description: string;
  emoji: string;
  target: number;
  current: (s: Stats) => number;
}[] = [
  {
    id: "first-walk",
    name: "First Steps",
    description: "Complete your first walk",
    emoji: "👟",
    target: 1,
    current: (s) => s.totalWalks,
  },
  {
    id: "five-walks",
    name: "Regular Walker",
    description: "Complete 5 walks",
    emoji: "🚶",
    target: 5,
    current: (s) => s.totalWalks,
  },
  {
    id: "5km-total",
    name: "5K Club",
    description: "Walk 5 km in total",
    emoji: "🥉",
    target: 5000,
    current: (s) => s.totalMeters,
  },
  {
    id: "10km-total",
    name: "10K Club",
    description: "Walk 10 km in total",
    emoji: "🥈",
    target: 10000,
    current: (s) => s.totalMeters,
  },
  {
    id: "5-destinations",
    name: "Explorer",
    description: "Discover 5 unique destinations",
    emoji: "🗺️",
    target: 5,
    current: (s) => s.uniqueDestinations,
  },
  {
    id: "10-destinations",
    name: "Cartographer",
    description: "Discover 10 unique destinations",
    emoji: "🧭",
    target: 10,
    current: (s) => s.uniqueDestinations,
  },
  {
    id: "3-day-streak",
    name: "On a Roll",
    description: "Reach a 3-day walking streak",
    emoji: "🔥",
    target: 3,
    current: (s) => s.longestStreakDays,
  },
  {
    id: "7-day-streak",
    name: "Unstoppable",
    description: "Reach a 7-day walking streak",
    emoji: "⚡",
    target: 7,
    current: (s) => s.longestStreakDays,
  },
];

export function computeBadges(_walks: Walk[], stats: Stats): Badge[] {
  return BADGE_DEFS.map((def) => {
    const current = def.current(stats);
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      emoji: def.emoji,
      earned: current >= def.target,
      progress: { current: Math.min(current, def.target), target: def.target },
    };
  });
}
