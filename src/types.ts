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
};
