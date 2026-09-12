import type { Layer } from "leaflet";
// Order matters: globalLeaflet installs the global `L` the plugin needs, and ES
// modules evaluate imports in source order. Do not reorder these two lines.
import { runtimeL } from "./globalLeaflet";
import "leaflet.heat";

export type HeatPoint = [number, number] | [number, number, number];

export type HeatOptions = {
  minOpacity?: number;
  maxZoom?: number;
  max?: number;
  radius?: number;
  blur?: number;
  gradient?: Record<number, string>;
};

export type HeatLayer = Layer & {
  setLatLngs(points: HeatPoint[]): HeatLayer;
  redraw(): HeatLayer;
};

type HeatFactory = (points: HeatPoint[], options?: HeatOptions) => HeatLayer;

/** Fails loudly if the plugin didn't attach, rather than "not a function". */
export function createHeatLayer(
  points: HeatPoint[],
  options?: HeatOptions,
): HeatLayer {
  const factory = (runtimeL as unknown as { heatLayer?: HeatFactory }).heatLayer;
  if (typeof factory !== "function") {
    throw new Error(
      "leaflet.heat did not attach heatLayer - check the import order in lib/heat.ts",
    );
  }
  return factory(points, options);
}
