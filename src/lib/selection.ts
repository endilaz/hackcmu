/** Destination selection logic. See plan.md section 7.2. */

import { haversineMeters, estimateWalkMinutes } from "./geo";
import {
  MIN_DESTINATION_DISTANCE_M,
  ROUND_TRIP,
  TOP_CANDIDATE_POOL,
} from "../constants";
import type { Destination, LatLng } from "../types";

export type Suggestion = {
  destination: Destination;
  straightMeters: number;
  oneWayMinutes: number; // Math.round of estimateWalkMinutes(straightMeters)
  roundTripMinutes: number; // Math.round of estimateWalkMinutes(straightMeters) * 2
  overBudget: boolean;
  overByMinutes: number; // whole minutes the walk exceeds freeMinutes; 0 when !overBudget
  visited: boolean;
  excludesReset: boolean; // true if excludeIds had to be cleared to find this one
};

/** A destination annotated with its (unrounded) distance/time figures. */
type Scored = {
  destination: Destination;
  straightMeters: number;
  oneWayMinutesRaw: number; // estimateWalkMinutes(straightMeters), not rounded
  neededMinutesRaw: number; // ROUND_TRIP ? oneWay*2 : oneWay, not rounded
};

function toSuggestion(
  scored: Scored,
  visitedIds: string[],
  overBudget: boolean,
  overByMinutes: number,
  excludesReset: boolean,
): Suggestion {
  return {
    destination: scored.destination,
    straightMeters: scored.straightMeters,
    oneWayMinutes: Math.round(scored.oneWayMinutesRaw),
    roundTripMinutes: Math.round(scored.oneWayMinutesRaw * 2),
    overBudget,
    overByMinutes,
    visited: visitedIds.includes(scored.destination.id),
    excludesReset,
  };
}

export function pickDestination(input: {
  from: LatLng;
  freeMinutes: number;
  destinations: Destination[];
  visitedIds: string[];
  excludeIds?: string[];
  random?: () => number;
}): Suggestion | null {
  const { from, freeMinutes, destinations, visitedIds } = input;
  const excludeIds = input.excludeIds ?? [];
  const random = input.random ?? Math.random;

  const scoredAll: Scored[] = destinations.map((destination) => {
    const straightMeters = haversineMeters(from, destination);
    const oneWayMinutesRaw = estimateWalkMinutes(straightMeters);
    const neededMinutesRaw = ROUND_TRIP ? oneWayMinutesRaw * 2 : oneWayMinutesRaw;
    return { destination, straightMeters, oneWayMinutesRaw, neededMinutesRaw };
  });

  const eligible = scoredAll.filter(
    (s) => s.straightMeters >= MIN_DESTINATION_DISTANCE_M,
  );

  if (eligible.length === 0) return null;

  const excludeSet = new Set(excludeIds);
  const fitsBudget = (s: Scored) => s.neededMinutesRaw <= freeMinutes;
  const notExcluded = (s: Scored) => !excludeSet.has(s.destination.id);

  let candidates = eligible.filter((s) => fitsBudget(s) && notExcluded(s));
  let excludesReset = false;

  if (candidates.length === 0 && excludeIds.length > 0) {
    // Reroll wrap-around: never dead-end just because everything eligible was excluded.
    candidates = eligible.filter(fitsBudget);
    excludesReset = true;
  }

  if (candidates.length === 0) {
    // Nothing fits the time budget at all - fall back to the nearest eligible destination.
    let pool = eligible.filter(notExcluded);
    if (pool.length === 0 && excludeIds.length > 0) {
      pool = eligible;
      excludesReset = true;
    }

    const nearest = pool.reduce((best, s) =>
      s.straightMeters < best.straightMeters ? s : best,
    );

    const overByMinutes = Math.max(
      0,
      Math.round(nearest.neededMinutesRaw - freeMinutes),
    );

    return toSuggestion(nearest, visitedIds, true, overByMinutes, excludesReset);
  }

  const unvisited = candidates.filter((s) => !visitedIds.includes(s.destination.id));
  const pool = unvisited.length > 0 ? unvisited : candidates;

  const sorted = [...pool].sort((a, b) => b.neededMinutesRaw - a.neededMinutesRaw);
  const top = sorted.slice(0, TOP_CANDIDATE_POOL);

  const idx = Math.min(top.length - 1, Math.floor(random() * top.length));
  const chosen = top[idx];

  return toSuggestion(chosen, visitedIds, false, 0, excludesReset);
}
