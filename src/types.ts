/** Shared data model for Spare Walk. See plan.md section 5. */

export type LatLng = {
  lat: number;
  lng: number;
};

export type Destination = {
  id: string; // stable slug, e.g. "phipps-conservatory"
  name: string;
  lat: number;
  lng: number;
  blurb: string; // 1-2 sentences: why it's worth walking to
  category?: string; // "park" | "view" | "art" | "food" | "campus" | ...
};

export type TrailPoint = {
  lat: number;
  lng: number;
  t: number; // epoch ms
  accuracy?: number; // meters, from GeolocationCoordinates.accuracy
};

export type WalkStatus = "active" | "completed" | "abandoned";

export type Walk = {
  id: string;
  destinationId: string;
  startedAt: number; // epoch ms
  endedAt: number | null;
  status: WalkStatus;
  freeMinutes: number; // what the user entered
  estimatedMinutes: number; // one-way estimate at time of suggestion
  trail: TrailPoint[]; // filtered points only (plan.md 7.3)
  distanceMeters: number;
  arrived: boolean; // true if auto-arrival fired; false if ended manually
};

export type AppState = {
  schemaVersion: 1;
  walks: Walk[]; // completed/abandoned walks, newest last
  activeWalk: Walk | null;
  visitedDestinationIds: string[];
  echoes: Echo[];
};

export type EchoMood = "calm" | "curious" | "energize";
export type EchoVisibility = "private" | "friends" | "public";

/** A local, opt-in memory attached to the final GPS point of a completed walk. */
export type Echo = {
  id: string;
  walkId: string;
  destinationId: string;
  lat: number;
  lng: number;
  createdAt: number;
  text: string;
  photo: string | null;
  mood: EchoMood;
  visibility: EchoVisibility;
};

// --- Progress / gamification ----------------------------------------------

export type Stats = {
  totalWalks: number;
  totalMeters: number;
  uniqueDestinations: number;
  /** Consecutive calendar days ending today (or yesterday) with a completed walk. */
  currentStreakDays: number;
  longestStreakDays: number;
  points: number;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  earned: boolean;
  /** Progress toward earning it; omitted for badges that are simply on or off. */
  progress?: { current: number; target: number };
};

// --- Social (LOCAL DEMO DATA ONLY - there is no server) ---------------------

/**
 * A fictional friend. Spare Walk has no backend and no accounts, so these are
 * seeded locally and must always be presented in the UI as demo data.
 */
export type Friend = {
  id: string;
  name: string;
  emoji: string;
  totalWalks: number;
  totalMeters: number;
  uniqueDestinations: number;
  currentStreakDays: number;
  points: number;
  /** Relative so the seed data never goes stale. */
  lastWalkDaysAgo: number;
  lastDestinationName: string;
};

export type LeaderboardRow = {
  id: string;
  name: string;
  emoji: string;
  points: number;
  totalMeters: number;
  rank: number;
  isYou: boolean;
};

// --- Calendar --------------------------------------------------------------

export type CalEvent = {
  summary: string;
  start: number; // epoch ms
  end: number; // epoch ms
};

/** A free window between two commitments. */
export type Gap = {
  start: number;
  end: number;
  minutes: number;
  afterEvent: string | null;
  beforeEvent: string | null;
};
