import * as L from "leaflet";

/**
 * leaflet.heat predates ES modules: it does `L.heatLayer = ...` against a
 * GLOBAL `L` instead of importing leaflet itself. Bundled by Vite, no such
 * global exists, so importing the plugin throws "L is not defined" at runtime
 * - which neither tsc nor `vite build` catches.
 *
 * Import this module immediately BEFORE "leaflet.heat". ES modules evaluate
 * imports in source order, so this assignment lands first.
 */
(globalThis as unknown as { L: typeof L }).L = L;
