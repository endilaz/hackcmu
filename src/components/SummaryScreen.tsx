import type { SummaryScreenProps } from "../screenProps";
import { formatDistance, formatDuration, formatPace } from "../lib/geo";
import MapView from "./MapView";

/** Shown at the end of a walk, and read-only when opened from History (plan.md 9.4). */
export default function SummaryScreen({
  walk,
  destination,
  readOnly,
  onWalkAgain,
  onViewHistory,
  onBack,
}: SummaryScreenProps) {
  const destinationName = destination?.name ?? "your destination";
  const elapsedMs = walk.endedAt !== null ? walk.endedAt - walk.startedAt : 0;
  const firstTrailPoint = walk.trail.length > 0 ? walk.trail[0] : null;
  const showPace = walk.distanceMeters > 100;
  const startedAtLabel = new Date(walk.startedAt).toLocaleString();

  return (
    <div className="screen">
      <div className="screen__pad">
        <div>
          <span className={`badge ${walk.arrived ? "badge--arrived" : "badge--ended"}`}>
            {walk.arrived ? "Arrived" : "Ended early"}
          </span>
          <h1>{walk.arrived ? `You made it to ${destinationName}!` : "Walk ended"}</h1>
        </div>

        <MapView
          mode="fit"
          className="map--inset"
          user={null}
          destination={destination ? { lat: destination.lat, lng: destination.lng, name: destination.name } : null}
          trail={walk.trail}
          startPoint={firstTrailPoint}
          dashedToDestination={false}
        />

        <p className="faint">Started {startedAtLabel}</p>

        <div className="card">
          <div className="stats">
            <div className="stat">
              <span className="stat__value">{formatDistance(walk.distanceMeters)}</span>
              <span className="stat__label">Distance</span>
            </div>
            <div className="stat">
              <span className="stat__value">{formatDuration(elapsedMs)}</span>
              <span className="stat__label">Time</span>
            </div>
            {showPace && (
              <div className="stat">
                <span className="stat__value">{formatPace(walk.distanceMeters, elapsedMs)}</span>
                <span className="stat__label">Avg pace</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="screen__footer">
        {readOnly ? (
          <>
            {onBack && (
              <button type="button" className="btn btn--secondary" onClick={onBack}>
                Back
              </button>
            )}
          </>
        ) : (
          <>
            {onWalkAgain && (
              <button type="button" className="btn btn--primary" onClick={onWalkAgain}>
                Walk again
              </button>
            )}
            {onViewHistory && (
              <button type="button" className="btn btn--secondary" onClick={onViewHistory}>
                View history
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
