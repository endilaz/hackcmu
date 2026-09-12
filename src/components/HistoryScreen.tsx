import type { HistoryScreenProps } from "../screenProps";
import { formatDistance, formatDuration } from "../lib/geo";

/** Readable "Sep 12, 3:45 PM" style label for a walk's start time. */
const startedAtFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Past walks, with the exploration counter that's the product hook (plan.md 9.5). */
export default function HistoryScreen({
  walks,
  destinationsById,
  totalDestinations,
  visitedCount,
  totalDistanceMeters,
  onSelectWalk,
  onBack,
  onOpenHeatmap,
  onOpenAchievements,
  onOpenFriends,
}: HistoryScreenProps) {
  // Stored newest-last; display newest-first without mutating the prop array.
  const orderedWalks = [...walks].reverse();

  return (
    <div className="screen">
      <div className="screen__pad">
        <button type="button" className="btn btn--icon" onClick={onBack} aria-label="Back">
          ←
        </button>

        <h1>History</h1>

        <div className="btn-row">
          <button type="button" className="btn btn--secondary" onClick={onOpenHeatmap}>
            🔥 Heatmap
          </button>
          <button type="button" className="btn btn--secondary" onClick={onOpenAchievements}>
            🏅 Progress
          </button>
          <button type="button" className="btn btn--secondary" onClick={onOpenFriends}>
            👥 Friends
          </button>
        </div>

        <div className="stats">
          <div className="stat">
            <span className="stat__value">{walks.length}</span>
            <span className="stat__label">Walks</span>
          </div>
          <div className="stat">
            <span className="stat__value">{formatDistance(totalDistanceMeters)}</span>
            <span className="stat__label">Distance</span>
          </div>
          <div className="stat">
            <span className="stat__value">
              {visitedCount} of {totalDestinations}
            </span>
            <span className="stat__label">Places discovered</span>
          </div>
        </div>

        {orderedWalks.length === 0 ? (
          <div className="empty">
            <p>No walks yet.</p>
            <p className="faint">Find a little spare time and take your first walk.</p>
          </div>
        ) : (
          <ul className="list">
            {orderedWalks.map((walk) => {
              const destination = destinationsById[walk.destinationId];
              const destinationName = destination?.name ?? "A destination";
              const duration =
                walk.endedAt !== null ? formatDuration(walk.endedAt - walk.startedAt) : "-";

              return (
                <li key={walk.id}>
                  <button
                    type="button"
                    className="list__item"
                    onClick={() => onSelectWalk(walk.id)}
                  >
                    <div className="list__main">
                      <span className="list__title">{destinationName}</span>
                      <span className="muted">
                        {startedAtFormatter.format(new Date(walk.startedAt))}
                      </span>
                      <span className="muted">
                        {formatDistance(walk.distanceMeters)} · {duration}
                      </span>
                    </div>
                    <span className={`badge ${walk.arrived ? "badge--arrived" : "badge--ended"}`}>
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
