import { WALK_SPEED_MPS } from "../constants";
import type { LatLng } from "../types";
import { haversineMeters } from "./geo";

const DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox/walking";

export type WalkingRoute = {
  geometry: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
  destination: LatLng;
};

type MapboxDirectionsResponse = {
  code?: string;
  message?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      type?: string;
      coordinates?: unknown;
    };
  }>;
};

/** Retrieve one pedestrian route as full-resolution GeoJSON. */
export async function fetchWalkingRoute(
  from: LatLng,
  destination: LatLng,
  accessToken: string,
  signal?: AbortSignal,
): Promise<WalkingRoute> {
  const coordinates = `${from.lng},${from.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    access_token: accessToken,
    alternatives: "false",
    geometries: "geojson",
    overview: "full",
    steps: "false",
    walking_speed: String(WALK_SPEED_MPS),
  });
  const response = await fetch(`${DIRECTIONS_URL}/${coordinates}?${params}`, { signal });
  const body = (await response.json()) as MapboxDirectionsResponse;

  if (!response.ok || body.code !== "Ok") {
    throw new Error(body.message || `Mapbox Directions returned ${response.status}`);
  }

  const first = body.routes?.[0];
  const rawCoordinates = first?.geometry?.coordinates;
  if (
    first?.geometry?.type !== "LineString" ||
    !Array.isArray(rawCoordinates) ||
    rawCoordinates.length < 2 ||
    typeof first.distance !== "number" ||
    typeof first.duration !== "number"
  ) {
    throw new Error("Mapbox Directions returned an invalid walking route");
  }

  const geometry = rawCoordinates.map((coordinate) => {
    if (
      !Array.isArray(coordinate) ||
      coordinate.length < 2 ||
      typeof coordinate[0] !== "number" ||
      typeof coordinate[1] !== "number"
    ) {
      throw new Error("Mapbox Directions returned invalid route coordinates");
    }
    return { lng: coordinate[0], lat: coordinate[1] };
  });

  return {
    geometry,
    distanceMeters: first.distance,
    durationSeconds: first.duration,
    destination: { ...destination },
  };
}

export type RouteProgress = {
  geometry: LatLng[];
  remainingMeters: number;
  offRouteMeters: number;
};

/**
 * Project the user onto the closest route segment, then return only the route
 * still ahead. The local equirectangular projection is accurate at walk scale.
 */
export function progressAlongRoute(route: WalkingRoute, user: LatLng): RouteProgress {
  const points = route.geometry;
  if (points.length < 2) {
    return {
      geometry: points,
      remainingMeters: haversineMeters(user, route.destination),
      offRouteMeters: haversineMeters(user, route.destination),
    };
  }

  const latScale = 111_320;
  const lngScale = latScale * Math.cos((user.lat * Math.PI) / 180);
  let bestDistanceSquared = Number.POSITIVE_INFINITY;
  let bestSegment = 0;
  let bestT = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const ax = (points[i].lng - user.lng) * lngScale;
    const ay = (points[i].lat - user.lat) * latScale;
    const bx = (points[i + 1].lng - user.lng) * lngScale;
    const by = (points[i + 1].lat - user.lat) * latScale;
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const distanceSquared = px * px + py * py;
    if (distanceSquared < bestDistanceSquared) {
      bestDistanceSquared = distanceSquared;
      bestSegment = i;
      bestT = t;
    }
  }

  const segmentStart = points[bestSegment];
  const segmentEnd = points[bestSegment + 1];
  const projected = {
    lat: segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * bestT,
    lng: segmentStart.lng + (segmentEnd.lng - segmentStart.lng) * bestT,
  };
  const geometry = [projected, ...points.slice(bestSegment + 1)];
  let remainingMeters = 0;
  for (let i = 0; i < geometry.length - 1; i++) {
    remainingMeters += haversineMeters(geometry[i], geometry[i + 1]);
  }

  return {
    geometry,
    remainingMeters,
    offRouteMeters: Math.sqrt(bestDistanceSquared),
  };
}
