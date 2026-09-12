import { useEffect, useMemo, useRef } from "react";
import * as L from "leaflet";
import {
  createHeatLayer,
  type HeatLayer,
  type HeatPoint,
} from "../lib/heat";
import type { HeatmapScreenProps } from "../screenProps";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Leaflet's default marker images are broken by bundlers, so destinations use
// the same divIcon pattern as MapView.
const DEST_ICON = L.divIcon({
  className: "pin pin--dest",
  html: "📍",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/** "Where have you been" heatmap built from every recorded walk's GPS trail. */
export default function HeatmapScreen({
  walks,
  destinations,
  visitedDestinationIds,
  onBack,
}: HeatmapScreenProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<HeatLayer | null>(null);
  const destMarkersRef = useRef<L.Marker[]>([]);
  const hasFitRef = useRef(false);

  const heatPoints = useMemo<HeatPoint[]>(
    () => walks.flatMap((w) => w.trail.map((p): HeatPoint => [p.lat, p.lng])),
    [walks],
  );

  const visitedDestinations = useMemo(() => {
    const visitedSet = new Set(visitedDestinationIds);
    return destinations.filter((d) => visitedSet.has(d.id));
  }, [destinations, visitedDestinationIds]);

  const hasTrailData = heatPoints.length > 0;

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

    // The container is frequently still 0px tall on first paint (e.g. inside
    // a flex column that hasn't laid out yet), which renders as a grey/blank
    // map. One extra size check shortly after mount fixes that.
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const initialTimer = window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(initialTimer);

      // React 19 StrictMode mounts, cleans up, and remounts every component
      // in development. If we don't destroy the map here, the second mount
      // tries to init Leaflet on a container that already has one and throws
      // "Map container is already initialized". We also have to forget every
      // layer ref (they die with the map) so the sync effect below recreates
      // them fresh on the remount instead of touching layers that no longer
      // belong to any map.
      map.remove();
      mapRef.current = null;
      heatLayerRef.current = null;
      destMarkersRef.current = [];
      hasFitRef.current = false;
    };
  }, []);

  // --- Keep the heat layer, destination pins and initial fit in sync. ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    if (heatPoints.length > 0) {
      heatLayerRef.current = createHeatLayer(heatPoints, {
        radius: 25,
        blur: 20,
        maxZoom: 17,
      }).addTo(map);
    }

    for (const marker of destMarkersRef.current) {
      map.removeLayer(marker);
    }
    destMarkersRef.current = visitedDestinations.map((d) =>
      L.marker([d.lat, d.lng], { icon: DEST_ICON, keyboard: false })
        .addTo(map)
        .bindTooltip(d.name, { direction: "top", offset: [0, -14] }),
    );

    // Fit bounds once: prefer the actual trail, falling back to the
    // destinations so the map still shows the right neighbourhood instead of
    // the whole world when there's no trail data yet.
    if (!hasFitRef.current) {
      const points: L.LatLngTuple[] =
        heatPoints.length > 0
          ? heatPoints.map(([lat, lng]) => [lat, lng])
          : destinations.map((d): L.LatLngTuple => [d.lat, d.lng]);

      if (points.length > 0) {
        map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 17 });
        hasFitRef.current = true;
      }
    }
  }, [heatPoints, visitedDestinations, destinations]);

  const distinctPlacesVisited = new Set(visitedDestinationIds).size;

  return (
    <div className="screen screen--map">
      <div className="screen__pad">
        <button type="button" className="btn btn--icon" onClick={onBack} aria-label="Back">
          ←
        </button>

        <h1>Where you've been</h1>

        <div className="stats">
          <div className="stat">
            <span className="stat__value">{walks.length}</span>
            <span className="stat__label">Walks</span>
          </div>
          <div className="stat">
            <span className="stat__value">{distinctPlacesVisited}</span>
            <span className="stat__label">Places visited</span>
          </div>
        </div>

        {!hasTrailData && (
          <div className="empty">
            <p>No walks recorded yet.</p>
            <p className="faint">Walks you take will trace out your heatmap here.</p>
          </div>
        )}
      </div>

      <div className="map-wrap">
        <div ref={containerRef} className="map" />
      </div>
    </div>
  );
}
