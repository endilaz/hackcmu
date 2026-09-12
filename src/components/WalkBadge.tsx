import type { TrailPoint, Walk } from "../types";

type WalkBadgeProps = {
  walk: Walk;
  label?: string;
  compact?: boolean;
};

const PALETTES = [
  { fill: "#dceadb", stroke: "#287253", accent: "#f6b94a" },
  { fill: "#dce8f2", stroke: "#34759d", accent: "#f3a36a" },
  { fill: "#eee0ed", stroke: "#8b5b82", accent: "#edc85d" },
  { fill: "#f3e7cf", stroke: "#a66a39", accent: "#78a38a" },
] as const;

function numberFromId(id: string): number {
  let value = 0;
  for (let i = 0; i < id.length; i += 1) value = (value * 31 + id.charCodeAt(i)) >>> 0;
  return value;
}

/** Scales GPS coordinates into a friendly little route inside a 100 × 100 badge. */
function routePath(points: TrailPoint[]): { path: string; start: { x: number; y: number } } {
  if (points.length < 2) {
    return { path: "M27 68 C31 46 49 35 67 31 C72 47 63 61 73 70", start: { x: 27, y: 68 } };
  }
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.00001);
  const lngSpan = Math.max(maxLng - minLng, 0.00001);
  const scale = Math.min(52 / lngSpan, 52 / latSpan);
  const width = lngSpan * scale;
  const height = latSpan * scale;
  const offsetX = 50 - width / 2;
  const offsetY = 50 - height / 2;
  const normalized = points.map((point) => {
      const x = offsetX + (point.lng - minLng) * scale;
      // Invert latitude so north points upward in the icon.
      const y = offsetY + (maxLat - point.lat) * scale;
      return { x, y };
    });
  return {
    path: normalized.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" "),
    start: normalized[0],
  };
}

/** A deterministic collectible: the route is literally drawn from this walk's GPS trail. */
export default function WalkBadge({ walk, label = "Walk badge", compact = false }: WalkBadgeProps) {
  const seed = numberFromId(walk.id);
  const palette = PALETTES[seed % PALETTES.length];
  const route = routePath(walk.trail);

  return (
    <svg
      className={`walk-badge${compact ? " walk-badge--compact" : ""}`}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
    >
      <path d="M50 4 61 11 74 10 80 22 92 30 89 43 96 55 88 66 88 80 74 85 65 96 52 91 39 96 30 86 16 84 13 71 4 61 10 48 6 35 18 27 22 14 36 14Z" fill={palette.fill} />
      <title>{label}</title>
      <path d={route.path} fill="none" stroke="#fffdf7" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d={route.path} fill="none" stroke={palette.stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={route.start.x} cy={route.start.y} r="5" fill="#fffdf7" />
      <circle cx={route.start.x} cy={route.start.y} r="2.8" fill={palette.stroke} />
      <path d="m73 21 2.3 5.7 5.7 2.3-5.7 2.3-2.3 5.7-2.3-5.7-5.7-2.3 5.7-2.3Z" fill={palette.accent} />
    </svg>
  );
}
