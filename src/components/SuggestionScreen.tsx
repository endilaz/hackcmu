import MapView from "./MapView";
import type { SuggestionScreenProps } from "../screenProps";
import { ROUND_TRIP } from "../constants";

/**
 * The payoff: one place, one decision. The map is the top of the screen and
 * the destination name is the largest thing on the paper below it.
 *
 * The dashed line to the destination is deliberately straight - there is no
 * routing API, and walk time is haversine x DETOUR_FACTOR. Drawing a
 * street-following route here would promise navigation the app cannot do.
 */
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

      <div className="sheet">
        <div className="sheet__handle" />

        {overBudget && (
          <div className="banner banner--warn">
            <span>
              Nothing fits in {freeMinutes} min — this is the closest, it may run about{" "}
              {overByMinutes} min over.
            </span>
          </div>
        )}

        <div>
          <span className={`badge badge--upper ${visited ? "badge--visited" : "badge--new"}`}>
            {visited ? "Visited before" : "New to you"}
          </span>
          <h1 style={{ marginTop: 10 }}>{destination.name}</h1>
        </div>

        <p className="muted">{destination.blurb}</p>

        <div className="facts facts--rule">
          <div className="fact">
            <span className="fact__value">{oneWayMinutes} min</span>
            <span className="overline">One way</span>
          </div>
          {ROUND_TRIP && (
            <div className="fact">
              <span className="fact__value">{roundTripMinutes} min</span>
              <span className="overline">Round trip</span>
            </div>
          )}
          {destination.category && (
            <div className="fact">
              <span className="fact__value" style={{ fontSize: 17 }}>
                {destination.category}
              </span>
              <span className="overline">Kind</span>
            </div>
          )}
        </div>

        <button type="button" className="btn btn--primary" onClick={onStart}>
          Start walk
          <span aria-hidden="true">→</span>
        </button>
        <div className="btn-row">
          <button type="button" className="btn btn--secondary" onClick={onReroll}>
            Show me another
          </button>
          <button type="button" className="btn btn--secondary" onClick={onChangeTime}>
            Change time
          </button>
        </div>
      </div>
    </div>
  );
}
