import type { SummaryScreenProps } from "../screenProps";
import { formatDistance, formatDuration, formatPace } from "../lib/geo";
import MapView from "./MapView";
import RippleButton from "./RippleButton";
import WalkBadge from "./WalkBadge";

const startedAtFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * End of a walk, and the read-only view of a past one from History.
 *
 * The inset map shows the recorded trail only - no dashed line to the
 * destination, because by now the walk either reached it or didn't, and a
 * "here's where you should have gone" line would just editorialise.
 */
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

  return (
    <div className="screen">
      <div className="screen__pad screen__pad--fill">
        {readOnly && onBack && (
          <RippleButton type="button" className="btn btn--icon" onClick={onBack} aria-label="Back">
            ←
          </RippleButton>
        )}

        <div>
          <span
            className={`badge badge--upper ${walk.arrived ? "badge--arrived" : "badge--ended"}`}
          >
            {walk.arrived ? "Arrived" : "Ended early"}
          </span>
          <h1 style={{ marginTop: 12 }}>
            {walk.arrived ? `You made it to ${destinationName}` : "Walk ended"}
          </h1>
        </div>

        <MapView
          mode="fit"
          className="map--inset"
          user={null}
          destination={
            destination
              ? { lat: destination.lat, lng: destination.lng, name: destination.name }
              : null
          }
          trail={walk.trail}
          startPoint={firstTrailPoint}
          dashedToDestination={false}
        />

        <p className="faint">
          Started {startedAtFormatter.format(new Date(walk.startedAt))}
        </p>

        <div className="facts facts--rule">
          <div className="fact">
            <span className="fact__value">{formatDistance(walk.distanceMeters)}</span>
            <span className="overline">Distance</span>
          </div>
          <div className="fact">
            <span className="fact__value">{formatDuration(elapsedMs)}</span>
            <span className="overline">Time</span>
          </div>
          {showPace && (
            <div className="fact">
              <span className="fact__value">
                {formatPace(walk.distanceMeters, elapsedMs)}
              </span>
              <span className="overline">Avg pace</span>
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="earned-walk-badge">
            <WalkBadge walk={walk} label={`Your ${destinationName} walk badge`} />
            <div>
              <span className="overline">New collectible</span>
              <strong>{destinationName} badge</strong>
              <p className="faint">Your route has been pressed into a one-of-a-kind keepsake.</p>
            </div>
          </div>
        )}

        <div className="screen__spacer" />
      </div>

      {!readOnly && (
        <div className="screen__footer">
          {onWalkAgain && (
            <RippleButton type="button" className="btn btn--primary" onClick={onWalkAgain}>
              Walk again
            </RippleButton>
          )}
          {onViewHistory && (
            <RippleButton type="button" className="btn btn--secondary" onClick={onViewHistory}>
              View history
            </RippleButton>
          )}
        </div>
      )}
    </div>
  );
}
