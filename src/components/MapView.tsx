import { useEffect, useRef } from "react";
import * as L from "leaflet";
import type { LatLng } from "../types";

export type MapViewProps = {
  /** "fit": fit bounds to all content. "follow": keep the user dot centred. */
  mode: "fit" | "follow";
  user: LatLng | null;
  destination: (LatLng & { name: string }) | null;
  /** Ordered GPS trail; render as a polyline. Empty array = no trail. */
  trail: LatLng[];
  /** Where the walk began; render a small distinct marker. */
  startPoint?: LatLng | null;
  /** Draw a dashed straight line from user to destination ("as the crow flies"). */
  dashedToDestination?: boolean;
  /** Extra class for the map container, e.g. "map--inset" for the fixed-height summary map. */
  className?: string;
  /** Increment to force a re-fit / re-centre. Drives the "Recenter" button. */
  recenterNonce?: number;
  /** Called when the USER drags or zooms the map (not when we move it ourselves). */
  onUserInteract?: () => void;
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
  html: "📍",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const TRAIL_STYLE: L.PolylineOptions = {
  color: "#15803d",
  weight: 5,
  opacity: 0.9,
  lineCap: "round",
  lineJoin: "round",
};

const DASHED_STYLE: L.PolylineOptions = {
  color: "#64748b",
  weight: 3,
  opacity: 0.65,
  dashArray: "6 8",
  lineCap: "round",
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

/** Create/update/remove the dashed "as the crow flies" indicator line. */
function syncDashedLine(
  map: L.Map,
  ref: { current: L.Polyline | null },
  user: LatLng | null,
  destination: LatLng | null,
  enabled: boolean | undefined,
): void {
  if (!enabled || !user || !destination) {
    if (ref.current) {
      map.removeLayer(ref.current);
      ref.current = null;
    }
    return;
  }
  const latlngs: L.LatLngTuple[] = [
    [user.lat, user.lng],
    [destination.lat, destination.lng],
  ];
  if (!ref.current) {
    ref.current = L.polyline(latlngs, DASHED_STYLE).addTo(map);
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
    startPoint,
    dashedToDestination,
    className,
    recenterNonce,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const userMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const trailLineRef = useRef<L.Polyline | null>(null);
  const dashedLineRef = useRef<L.Polyline | null>(null);

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
  // suspended until `recenterNonce` bumps (the screen's Recenter button).
  const userHasControlRef = useRef(false);

  // "follow" mode: whether we've done the first hard setView on the user.
  // After that, subsequent updates use the gentler panTo.
  const hasCenteredOnceRef = useRef(false);

  // "fit" mode: a cheap signature of *which* content is present, so we only
  // re-fit when the set of things to show changes shape, not on every trail
  // point appended during an active walk.
  const lastFitSignatureRef = useRef<string | null>(null);

  const prevNonceRef = useRef(recenterNonce ?? 0);

  // --- Create the Leaflet map exactly once. -------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      center: [0, 0],
      zoom: 13,
      scrollWheelZoom: true,
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
      dashedLineRef.current = null;
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
    syncTrail(map, trailLineRef, trail);
    syncDashedLine(map, dashedLineRef, user, destination, dashedToDestination);

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

    const nonce = recenterNonce ?? 0;
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
      });
      const signatureChanged = signature !== lastFitSignatureRef.current;
      lastFitSignatureRef.current = signature;

      if (!userHasControlRef.current && (signatureChanged || nonceChanged)) {
        const points: L.LatLngTuple[] = [];
        if (user) points.push([user.lat, user.lng]);
        if (destination) points.push([destination.lat, destination.lng]);
        if (startPoint) points.push([startPoint.lat, startPoint.lng]);
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
  }, [mode, user, destination, trail, startPoint, dashedToDestination, recenterNonce]);

  return (
    <div ref={containerRef} className={"map " + (className ?? "")} />
  );
}
