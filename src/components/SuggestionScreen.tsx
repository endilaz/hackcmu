import MapView from "./MapView";
import type { SuggestionScreenProps } from "../screenProps";
import { ROUND_TRIP } from "../constants";

/** The "here's your walk" screen - the money shot (plan.md 9.2). */
export default function SuggestionScreen({
  suggestion,
  user,
  freeMinutes,
  onStart,
  onReroll,
  onChangeTime,
}: SuggestionScreenProps) {
  const { destination, visited, oneWayMinutes, roundTripMinutes, overBudget, overByMinutes } =
    suggestion;

  return (
    <div className="screen screen--map">
      <div className="map-wrap">
        <MapView
          mode="fit"
          user={user}
          destination={{ lat: destination.lat, lng: destination.lng, name: destination.name }}
          trail={[]}
          dashedToDestination
          className="map"
        />
      </div>

      <div className="screen__pad">
        {overBudget && (
          <div className="banner banner--warn">
            <span>
              Nothing fits in {freeMinutes} min — this is the closest, it may run about{" "}
              {overByMinutes} min over.
            </span>
          </div>
        )}

        <div className="card">
          <h2>{destination.name}</h2>
          {visited ? (
            <span className="badge badge--visited">Visited before</span>
          ) : (
            <span className="badge badge--new">New to you</span>
          )}
          <p className="muted">{destination.blurb}</p>
          {destination.category && <p className="faint">{destination.category}</p>}
          <p className="muted">
            ~{oneWayMinutes} min walk
            {ROUND_TRIP ? ` · ~${roundTripMinutes} min round trip` : ""}
          </p>
        </div>
      </div>

      <div className="screen__footer">
        <button type="button" className="btn btn--primary" onClick={onStart}>
          Start walk
        </button>
        <button type="button" className="btn btn--secondary" onClick={onReroll}>
          Show me another
        </button>
        <button type="button" className="btn btn--link" onClick={onChangeTime}>
          Change time
        </button>
      </div>
    </div>
  );
}
