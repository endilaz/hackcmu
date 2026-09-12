import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import type { Echo, LatLng } from "../types";

export type MapViewProps = {
  /** "fit": fit bounds to all content. "follow": keep the user dot centred. */
  mode: "fit" | "follow";
  user: LatLng | null;
  destination: (LatLng & { name: string }) | null;
  /** Ordered GPS trail; render as a polyline. Empty array = no trail. */
  trail: LatLng[];
  /** Planned street-following walking route. Empty array = no route. */
  route?: LatLng[];
  /** Where the walk began; render a small distinct marker. */
  startPoint?: LatLng | null;
  /** Extra class for the map container, e.g. "map--inset" for the fixed-height summary map. */
  className?: string;
  /** Called when the USER drags or zooms the map (not when we move it ourselves). */
  onUserInteract?: () => void;
  /** Called after a double-tap restores the automatic map view. */
  onRecenter?: () => void;
  /** Opt-in memories are rendered as small blooms at their captured GPS point. */
  echoes?: Echo[];
};

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Leaflet's default marker images are broken by bundlers, so every marker on
// this map uses a divIcon styled by the existing `.pin` CSS classes instead.
// All three are round dots, so each icon is anchored at its own centre.
const USER_ICON = L.divIcon({
  className: "pin pin--user",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const START_ICON = L.divIcon({
  className: "pin pin--start",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const DEST_ICON = L.divIcon({
  className: "pin pin--dest",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const ECHO_ICON = L.divIcon({ className: "echo-bloom", html: "✦", iconSize: [22, 22], iconAnchor: [11, 11] });

function syncEchoes(map: L.Map, refs: Map<string, L.Marker>, echoes: Echo[]) {
  const wanted = new Set(echoes.map((echo) => echo.id));
  refs.forEach((marker, id) => { if (!wanted.has(id)) { map.removeLayer(marker); refs.delete(id); } });
  for (const echo of echoes) {
    const marker = refs.get(echo.id);
    if (marker) marker.setLatLng([echo.lat, echo.lng]);
    else refs.set(echo.id, L.marker([echo.lat, echo.lng], { icon: ECHO_ICON, keyboard: false }).addTo(map));
  }
}

const TRAIL_STYLE: L.PolylineOptions = {
  color: "#1b382b",
  weight: 4,
  opacity: 0.95,
  lineCap: "round",
  lineJoin: "round",
};

// The route is the plan; the darker green trail above it is where the user
// has actually walked. A pale casing keeps the route readable over map tiles.
const ROUTE_STYLE: L.PolylineOptions = {
  color: "#68766e",
  weight: 5,
  opacity: 0.88,
  lineCap: "round",
  lineJoin: "round",
};

/** Create/update/remove a single point marker without ever removing+re-adding it. */
function syncMarker(
  map: L.Map,
  ref: { current: L.Marker | null },
  point: LatLng | null | undefined,
  icon: L.DivIcon,
): void {
  if (!point) {
    if (ref.current) {
      map.removeLayer(ref.current);
      ref.current = null;
    }
    return;
  }
  const latlng: L.LatLngTuple = [point.lat, point.lng];
  if (!ref.current) {
    ref.current = L.marker(latlng, { icon, keyboard: false }).addTo(map);
  } else {
    ref.current.setLatLng(latlng);
  }
}

/** Same as syncMarker, but also keeps a name tooltip on the destination pin. */
function syncDestinationMarker(
  map: L.Map,
  ref: { current: L.Marker | null },
  destination: (LatLng & { name: string }) | null,
): void {
  if (!destination) {
    if (ref.current) {
      map.removeLayer(ref.current);
      ref.current = null;
    }
    return;
  }
  const latlng: L.LatLngTuple = [destination.lat, destination.lng];
  if (!ref.current) {
    ref.current = L.marker(latlng, { icon: DEST_ICON, keyboard: false })
      .addTo(map)
      .bindTooltip(destination.name, { direction: "top", offset: [0, -14] });
  } else {
    ref.current.setLatLng(latlng);
    ref.current.setTooltipContent(destination.name);
  }
}

/** Create/update/remove the solid GPS trail polyline. */
function syncTrail(
  map: L.Map,
  ref: { current: L.Polyline | null },
  trail: LatLng[],
): void {
  if (trail.length === 0) {
    if (ref.current) {
      map.removeLayer(ref.current);
      ref.current = null;
    }
    return;
  }
  const latlngs: L.LatLngTuple[] = trail.map((p) => [p.lat, p.lng]);
  if (!ref.current) {
    ref.current = L.polyline(latlngs, TRAIL_STYLE).addTo(map);
  } else {
    ref.current.setLatLngs(latlngs);
  }
}

/** Create/update/remove the planned street-following route. */
function syncRoute(
  map: L.Map,
  ref: { current: L.Polyline | null },
  route: LatLng[],
): void {
  if (route.length < 2) {
    if (ref.current) {
      map.removeLayer(ref.current);
      ref.current = null;
    }
    return;
  }
  const latlngs: L.LatLngTuple[] = route.map((point) => [point.lat, point.lng]);
  if (!ref.current) {
    ref.current = L.polyline(latlngs, ROUTE_STYLE).addTo(map);
    ref.current.bringToBack();
  } else {
    ref.current.setLatLngs(latlngs);
  }
}

export default function MapView(props: MapViewProps) {
  const {
    mode,
    user,
    destination,
    trail,
    route = [],
    startPoint,
    className,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const userMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const trailLineRef = useRef<L.Polyline | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const dashedLineRef = useRef<L.Polyline | null>(null);
  const echoMarkersRef = useRef(new Map<string, L.Marker>());

  // Always holds the latest props so the long-lived map event listeners
  // (registered once, below) never read stale values from the render that
  // created them.
  const latestPropsRef = useRef(props);
  useEffect(() => {
    latestPropsRef.current = props;
  });

  // Set to true immediately before any move WE trigger (setView/panTo/
  // fitBounds) and cleared once Leaflet settles. Leaflet's `zoomstart` (and,
  // in principle, `movestart`) fire for programmatic moves too, so this is
  // the only reliable way to tell a real user drag/zoom apart from our own
  // calls when deciding whether to fire onUserInteract / stop auto-follow.
  const programmaticMoveRef = useRef(false);

  // True once the user has manually dragged or zoomed; auto fit/follow is
  // suspended until the user double-taps the map.
  const userHasControlRef = useRef(false);

  // "follow" mode: whether we've done the first hard setView on the user.
  // After that, subsequent updates use the gentler panTo.
  const hasCenteredOnceRef = useRef(false);

  // "fit" mode: a cheap signature of *which* content is present, so we only
  // re-fit when the set of things to show changes shape, not on every trail
  // point appended during an active walk.
  const lastFitSignatureRef = useRef<string | null>(null);

  const prevNonceRef = useRef(0);
  const [doubleTapNonce, setDoubleTapNonce] = useState(0);

  // --- Create the Leaflet map exactly once. -------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      center: [0, 0],
      zoom: 13,
      scrollWheelZoom: true,
      doubleClickZoom: false,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution: TILE_ATTRIBUTION,
    }).addTo(map);

    mapRef.current = map;

    const handleUserMove = () => {
      // Ignore moves we started ourselves (setView/panTo/fitBounds).
      if (programmaticMoveRef.current) return;
      userHasControlRef.current = true;
      latestPropsRef.current.onUserInteract?.();
    };
    map.on("dragstart", handleUserMove);
    map.on("zoomstart", handleUserMove);
    const handleDoubleTap = () => {
      setDoubleTapNonce((nonce) => nonce + 1);
      latestPropsRef.current.onRecenter?.();
    };
    map.on("dblclick", handleDoubleTap);

    // The container is frequently still 0px tall on first paint (e.g. inside
    // a flex column that hasn't laid out yet), which renders as a grey/blank
    // map. One extra size check shortly after mount fixes that.
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const initialTimer = window.setTimeout(() => map.invalidateSize(), 0);

    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(initialTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      resizeObserver.disconnect();
      map.off("dragstart", handleUserMove);
      map.off("zoomstart", handleUserMove);
      map.off("dblclick", handleDoubleTap);

      // React 19 StrictMode mounts, cleans up, and remounts every component
      // in development. If we don't destroy the map here, the second mount
      // tries to init Leaflet on a container that already has one and throws
      // "Map container is already initialized". We also have to forget every
      // layer ref (the layers die with the map) so the sync effect below
      // recreates them fresh on the remount instead of calling setLatLng on
      // markers that no longer belong to any map.
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      destMarkerRef.current = null;
      startMarkerRef.current = null;
      trailLineRef.current = null;
      routeLineRef.current = null;
      dashedLineRef.current = null;
      echoMarkersRef.current.clear();
      userHasControlRef.current = false;
      hasCenteredOnceRef.current = false;
      lastFitSignatureRef.current = null;
    };
  }, []);

  // --- Keep layers and the view in sync with props on every change. ------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    syncMarker(map, userMarkerRef, user, USER_ICON);
    syncMarker(map, startMarkerRef, startPoint ?? null, START_ICON);
    syncDestinationMarker(map, destMarkerRef, destination);
    syncRoute(map, routeLineRef, route);
    syncTrail(map, trailLineRef, trail);
    syncDashedLine(map, dashedLineRef, user, destination, dashedToDestination);
    syncEchoes(map, echoMarkersRef.current, props.echoes ?? []);

    const beginProgrammaticMove = () => {
      programmaticMoveRef.current = true;
      // `moveend` clears the guard in the normal case. The timeout is a
      // fallback for calls that don't actually move the map (e.g. we're
      // already exactly there), which would never fire `moveend` and would
      // otherwise leave the guard stuck on.
      map.once("moveend", () => {
        programmaticMoveRef.current = false;
      });
      window.setTimeout(() => {
        programmaticMoveRef.current = false;
      }, 400);
    };

    const nonce = doubleTapNonce;
    const nonceChanged = nonce !== prevNonceRef.current;
    prevNonceRef.current = nonce;
    if (nonceChanged) {
      // The screen's Recenter button: give control back to the map.
      userHasControlRef.current = false;
    }

    if (mode === "follow") {
      if (user && !userHasControlRef.current) {
        beginProgrammaticMove();
        if (!hasCenteredOnceRef.current) {
          map.setView([user.lat, user.lng], Math.max(map.getZoom(), 16));
          hasCenteredOnceRef.current = true;
        } else {
          map.panTo([user.lat, user.lng]);
        }
      }
    } else {
      // mode === "fit": re-fit only when the *shape* of the content changes
      // (something appeared/disappeared, or the destination/start moved),
      // not on every trail point.
      const signature = JSON.stringify({
        u: !!user,
        d: destination ? [destination.lat, destination.lng] : null,
        s: startPoint ? [startPoint.lat, startPoint.lng] : null,
        t: trail.length > 0,
        // A full Directions geometry replaces the two-point fallback after
        // loading, so length is part of the signature and triggers one refit.
        r: route.length,
      });
      const signatureChanged = signature !== lastFitSignatureRef.current;
      lastFitSignatureRef.current = signature;

      if (!userHasControlRef.current && (signatureChanged || nonceChanged)) {
        const points: L.LatLngTuple[] = [];
        if (user) points.push([user.lat, user.lng]);
        if (destination) points.push([destination.lat, destination.lng]);
        if (startPoint) points.push([startPoint.lat, startPoint.lng]);
        for (const p of route) points.push([p.lat, p.lng]);
        for (const p of trail) points.push([p.lat, p.lng]);

        if (points.length > 0) {
          beginProgrammaticMove();
          map.fitBounds(L.latLngBounds(points), {
            padding: [40, 40],
            maxZoom: 17,
          });
        }
      }
    }
  }, [mode, user, destination, trail, route, startPoint, doubleTapNonce]);

  return (
    <div ref={containerRef} className={"map " + (className ?? "")} />
  );
}
