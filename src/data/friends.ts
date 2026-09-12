/**
 * DEMO DATA ONLY — Spare Walk has no backend, no accounts and no network.
 *
 * These "friends" are fictional CMU-ish students, invented for this
 * hackathon demo so the Friends screen has something to show. They are not
 * real people, they do not sync, and nothing here is live. Any screen that
 * renders FRIENDS must say so visibly (see FriendsScreen's demo-data
 * banner) — do not let this data imply a server or real accounts exist.
 *
 * `lastWalkDaysAgo` is relative to "today" (0 = today) specifically so this
 * seed never looks stale no matter when the demo is run.
 */
import type { Friend } from "../types";

export const FRIENDS: Friend[] = [
  {
    id: "priya-raman",
    name: "Priya Raman",
    emoji: "🦉",
    totalWalks: 42,
    totalMeters: 68_000,
    uniqueDestinations: 14,
    currentStreakDays: 21,
    points: 2150,
    lastWalkDaysAgo: 0,
    lastDestinationName: "Phipps Conservatory",
  },
  {
    id: "jade-okafor",
    name: "Jade Okafor",
    emoji: "🔥",
    totalWalks: 35,
    totalMeters: 52_000,
    uniqueDestinations: 11,
    currentStreakDays: 30,
    points: 1980,
    lastWalkDaysAgo: 0,
    lastDestinationName: "Cathedral of Learning",
  },
  {
    id: "sam-whitfield",
    name: "Sam Whitfield",
    emoji: "🦅",
    totalWalks: 28,
    totalMeters: 41_000,
    uniqueDestinations: 10,
    currentStreakDays: 5,
    points: 1400,
    lastWalkDaysAgo: 1,
    lastDestinationName: "Schenley Plaza",
  },
  {
    id: "lena-vasquez",
    name: "Lena Vasquez",
    emoji: "🐿️",
    totalWalks: 15,
    totalMeters: 21_000,
    uniqueDestinations: 7,
    currentStreakDays: 2,
    points: 780,
    lastWalkDaysAgo: 2,
    lastDestinationName: "Flagstaff Hill",
  },
  {
    id: "marcus-chen",
    name: "Marcus Chen",
    emoji: "🐢",
    totalWalks: 9,
    totalMeters: 11_000,
    uniqueDestinations: 5,
    currentStreakDays: 0,
    points: 420,
    lastWalkDaysAgo: 6,
    lastDestinationName: "The Fence (CMU)",
  },
  {
    id: "devon-kowalski",
    name: "Devon Kowalski",
    emoji: "🐝",
    totalWalks: 4,
    totalMeters: 4_200,
    uniqueDestinations: 3,
    currentStreakDays: 0,
    points: 150,
    lastWalkDaysAgo: 12,
    lastDestinationName: "Walking to the Sky",
  },
  {
    id: "theo-park",
    name: "Theo Park",
    emoji: "🌊",
    totalWalks: 2,
    totalMeters: 1_800,
    uniqueDestinations: 2,
    currentStreakDays: 1,
    points: 60,
    lastWalkDaysAgo: 3,
    lastDestinationName: "Panther Hollow Lake",
  },
];
