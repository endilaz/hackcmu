import type { Friend, LeaderboardRow, Stats } from "../types";

/** Stand-in avatar for the user's own leaderboard row. */
const YOU_EMOJI = "🚶";

type UnrankedRow = Omit<LeaderboardRow, "rank">;

/**
 * Builds the leaderboard: one row per friend plus one row for the user
 * ("You"), sorted by points descending with standard competition ranking
 * (ties share the lower rank number: 1, 2, 2, 4).
 *
 * Pure function of its inputs - no clock, no randomness - so the order is
 * stable across renders.
 */
export function buildLeaderboard(friends: Friend[], you: Stats): LeaderboardRow[] {
  const unranked: UnrankedRow[] = [
    ...friends.map((friend) => ({
      id: friend.id,
      name: friend.name,
      emoji: friend.emoji,
      points: friend.points,
      totalMeters: friend.totalMeters,
      isYou: false,
    })),
    {
      id: "you",
      name: "You",
      emoji: YOU_EMOJI,
      points: you.points,
      totalMeters: you.totalMeters,
      isYou: true,
    },
  ];

  const sorted = [...unranked].sort((a, b) => b.points - a.points);

  const rows: LeaderboardRow[] = [];
  let lastPoints: number | null = null;
  let lastRank = 0;
  sorted.forEach((row, index) => {
    const rank = lastPoints !== null && row.points === lastPoints ? lastRank : index + 1;
    lastPoints = row.points;
    lastRank = rank;
    rows.push({ ...row, rank });
  });

  return rows;
}
