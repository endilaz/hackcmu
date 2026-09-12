import * as LeafletNS from "leaflet";

/**
 * leaflet.heat predates ES modules: it attaches itself to a *global* `L` rather
 * than importing leaflet. Two things bite here.
 *
 * 1. Under Vite no such global exists, so the plugin throws "L is not defined".
 * 2. The obvious candidate - the `import * as L` namespace object - is
 *    non-extensible per spec, so `L.heatLayer = ...` silently does nothing and
 *    you get "L.heatLayer is not a function" at the call site instead.
 *
 * Leaflet's CJS interop `default` IS the real, extensible L object, so that's
 * what the plugin is handed. Anything reading `heatLayer` must read it off this
 * same object - see lib/heat.ts.
 */
type Leaflet = typeof LeafletNS;

export const runtimeL: Leaflet =
  (LeafletNS as unknown as { default?: Leaflet }).default ?? LeafletNS;

(globalThis as unknown as { L: Leaflet }).L = runtimeL;
