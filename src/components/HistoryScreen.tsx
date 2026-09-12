import { useState } from "react";
import type { HistoryScreenProps } from "../screenProps";
import { formatDistance, formatDuration } from "../lib/geo";
import HeatmapScreen from "./HeatmapScreen";

/** Readable "Sep 12, 3:45 PM" style label for a walk's start time. */
const startedAtFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type Mode = "list" | "map";

/**
 * Past walks, two ways. The list and the heatmap are the same data - every
 * walk you've recorded - so they're one screen with a toggle rather than two
 * separate destinations.
 */
export default function HistoryScreen({
  walks,
  destinationsById,
  destinations,
  visitedDestinationIds,
  totalDestinations,
  visitedCount,
  totalDistanceMeters,
  echoes,
  onSelectWalk,
}: HistoryScreenProps) {
  const [mode, setMode] = useState<Mode>("list");

  // Stored newest-last; display newest-first without mutating the prop array.
  const orderedWalks = [...walks].reverse();
  const distinctPlacesVisited = new Set(visitedDestinationIds).size;

  const toggle = (
    <div className="seg" role="group" aria-label="History view">
      <button
        type="button"
        className={`seg__btn${mode === "list" ? " seg__btn--on" : ""}`}
        aria-pressed={mode === "list"}
        onClick={() => setMode("list")}
      >
        List
      </button>
      <button
        type="button"
        className={`seg__btn${mode === "map" ? " seg__btn--on" : ""}`}
        aria-pressed={mode === "map"}
        onClick={() => setMode("map")}
      >
        Map
      </button>
    </div>
  );

  if (mode === "map") {
    return (
      <div className="screen screen--map">
        <div className="screen__pad" style={{ paddingBottom: 16 }}>
          <h1>History</h1>
          <div className="facts facts--rule">
            <div className="fact">
              <span className="fact__value">{walks.length}</span>
              <span className="overline">Walks</span>
            </div>
            <div className="fact">
              <span className="fact__value">{distinctPlacesVisited}</span>
              <span className="overline">Places visited</span>
            </div>
          </div>
          {toggle}
        </div>

        <HeatmapScreen
          walks={walks}
          destinations={destinations}
          visitedDestinationIds={visitedDestinationIds}
          echoes={echoes}
        />
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen__pad">
        <h1>History</h1>

        <div className="facts facts--rule">
          <div className="fact">
            <span className="fact__value">{walks.length}</span>
            <span className="overline">Walks</span>
          </div>
          <div className="fact">
            <span className="fact__value">{formatDistance(totalDistanceMeters)}</span>
            <span className="overline">Distance</span>
          </div>
          <div className="fact">
            <span className="fact__value">
              {visitedCount} of {totalDestinations}
            </span>
            <span className="overline">Discovered</span>
          </div>
        </div>

        {toggle}

        {orderedWalks.length === 0 ? (
          <div className="empty">
            <p className="empty__mark">No walks yet.</p>
            <p className="faint">Find a little spare time and take your first walk.</p>
          </div>
        ) : (
          <ul className="rows">
            {orderedWalks.map((walk) => {
              const destination = destinationsById[walk.destinationId];
              const destinationName = destination?.name ?? "A destination";
              const duration =
                walk.endedAt !== null ? formatDuration(walk.endedAt - walk.startedAt) : "-";

              return (
                <li key={walk.id}>
                  <button
                    type="button"
                    className="row"
                    onClick={() => onSelectWalk(walk.id)}
                  >
                    <div className="row__main">
                      <span className="row__title">{destinationName}</span>
                      <span className="faint">
                        {startedAtFormatter.format(new Date(walk.startedAt))} ·{" "}
                        {formatDistance(walk.distanceMeters)} · {duration}
                      </span>
                    </div>
                    <span
                      className={`badge ${walk.arrived ? "badge--arrived" : "badge--ended"}`}
                    >
                      {walk.arrived ? "Arrived" : "Ended early"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
