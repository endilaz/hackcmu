import { useEffect, useMemo, useRef, useState } from "react";
import type { Destination, Walk } from "../types";
import WalkBadge from "./WalkBadge";

type Position = { x: number; y: number };
type Layout = Record<string, Position>;

type Pin = {
  id: string;
  walk: Walk;
};

const BOARD_STORAGE_KEY = "sparewalk.pinboard.v1";
function defaultPosition(index: number, count: number): Position {
  // A neat initial collage; people can then make it their own.
  const columns = 3;
  const rows = Math.ceil(count / columns);
  return {
    x: 4 + (index % columns) * 31,
    y: 5 + Math.floor(index / columns) * (75 / Math.max(rows - 1, 1)),
  };
}

function loadLayout(): Layout {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(BOARD_STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) =>
        Boolean(value) && typeof value === "object" &&
        typeof (value as Position).x === "number" && typeof (value as Position).y === "number",
      ),
    );
  } catch {
    return {};
  }
}

function saveLayout(layout: Layout) {
  try {
    localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // A decorative layout should never affect the rest of the app if storage is unavailable.
  }
}

/** A local-only dorm-room corkboard for arranging collected walk badges. */
export default function PinboardRoom({
  walks,
  destinationsById,
}: {
  walks: Walk[];
  destinationsById: Record<string, Destination>;
}) {
  const pins = useMemo<Pin[]>(() => {
    const finished = walks.filter((walk) => walk.status !== "active").reverse();
    return finished.map((walk) => ({ id: `${walk.id}:badge`, walk }));
  }, [destinationsById, walks]);
  const [layout, setLayout] = useState<Layout>(loadLayout);
  const [activeId, setActiveId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => saveLayout(layout), [layout]);

  function positionFor(pin: Pin, index: number): Position {
    return layout[pin.id] ?? defaultPosition(index, pins.length);
  }

  function movePin(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    const board = boardRef.current;
    if (!drag || !board) return;
    const bounds = board.getBoundingClientRect();
    const x = ((event.clientX - bounds.left - drag.offsetX) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top - drag.offsetY) / bounds.height) * 100;
    setLayout((current) => ({
      ...current,
      [drag.id]: { x: Math.max(1, Math.min(72, x)), y: Math.max(1, Math.min(82, y)) },
    }));
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, pin: Pin, index: number) {
    const board = boardRef.current;
    if (!board) return;
    const bounds = board.getBoundingClientRect();
    const position = positionFor(pin, index);
    dragRef.current = {
      id: pin.id,
      offsetX: event.clientX - bounds.left - (position.x / 100) * bounds.width,
      offsetY: event.clientY - bounds.top - (position.y / 100) * bounds.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveId(pin.id);
  }

  function stopDrag() {
    dragRef.current = null;
    setActiveId(null);
  }

  return (
    <section className="pinboard-section" aria-labelledby="pinboard-title">
      <div className="collection-heading">
        <div>
          <h2 id="pinboard-title">Dorm room pinboard</h2>
          <p className="faint">Drag your collected route badges into a little wall of memories.</p>
        </div>
        <span className="faint">{pins.length} pins</span>
      </div>

      <div
        className="pinboard"
        ref={boardRef}
        style={{ height: `${Math.max(430, Math.ceil(pins.length / 3) * 118 + 40)}px` }}
      >
        <span className="pinboard__label">WALK CLUB</span>
        {pins.length === 0 ? (
          <div className="pinboard__empty">
            <span aria-hidden="true">✦</span>
            <p>Finish a walk to pin its route badge here.</p>
          </div>
        ) : (
          pins.map((pin, index) => {
            const position = positionFor(pin, index);
            const name = destinationsById[pin.walk.destinationId]?.name ?? "Mystery stroll";
            return (
              <button
                key={pin.id}
                type="button"
                className={`pin pin--badge${activeId === pin.id ? " pin--dragging" : ""}`}
                style={{ left: `${position.x}%`, top: `${position.y}%`, zIndex: activeId === pin.id ? 10 : index + 1 }}
                onPointerDown={(event) => startDrag(event, pin, index)}
                onPointerMove={movePin}
                onPointerUp={stopDrag}
                onPointerCancel={stopDrag}
                aria-label={`Move badge for ${name}`}
              >
                <span className="pin__tack" aria-hidden="true" />
                <WalkBadge walk={pin.walk} compact label={`${name} walk badge`} />
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
