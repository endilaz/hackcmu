import { useEffect, useMemo, useState } from "react";
import type { LatLng } from "./types";
import {
  fetchWalkingRoute,
  progressAlongRoute,
  type WalkingRoute,
} from "./lib/directions";

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";
const REROUTE_DISTANCE_M = 45;

export type WalkingRouteState = {
  route: WalkingRoute | null;
  loading: boolean;
  error: string | null;
};

/** Keep a route for one destination and refresh it only after going off-route. */
export function useWalkingRoute(
  from: LatLng | null,
  destination: LatLng | null,
): WalkingRouteState {
  const [route, setRoute] = useState<WalkingRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destinationKey = destination ? `${destination.lat},${destination.lng}` : "";
  const matchingRoute =
    route && destination &&
    route.destination.lat === destination.lat &&
    route.destination.lng === destination.lng
      ? route
      : null;
  const offRoute = useMemo(
    () => matchingRoute && from
      ? progressAlongRoute(matchingRoute, from).offRouteMeters > REROUTE_DISTANCE_M
      : false,
    [matchingRoute, from],
  );
  const shouldRequest = Boolean(
    MAPBOX_ACCESS_TOKEN && from && destination && (!matchingRoute || offRoute),
  );

  useEffect(() => {
    if (!from || !destination) {
      setRoute(null);
      setLoading(false);
      setError(null);
      return;
    }
    if (!MAPBOX_ACCESS_TOKEN) {
      setError("VITE_MAPBOX_ACCESS_TOKEN is not configured");
      return;
    }
    if (!shouldRequest) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetchWalkingRoute(from, destination, MAPBOX_ACCESS_TOKEN, controller.signal)
      .then(setRoute)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Unable to load walking route");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
    // from is intentionally omitted: GPS movement only causes a request when
    // offRoute flips to true, instead of issuing one request per fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationKey, shouldRequest]);

  return { route: matchingRoute, loading, error };
}
