import MapView from "./MapView";
import type { SuggestionScreenProps } from "../screenProps";
import { ROUND_TRIP } from "../constants";
import RippleButton from "./RippleButton";
import { useState } from "react";

/**
 * The payoff: one place, one decision. The map is the top of the screen and
 * the destination name is the largest thing on the paper below it.
 *
 * The selected destination gets one Mapbox walking route. Destination
 * selection itself remains instant and local; routed figures replace the
 * approximation as soon as the request completes.
 */
export default function SuggestionScreen({
  suggestion,
  walkingRoute,
  routeLoading,
  user,
  freeMinutes,
  onStart,
  onReroll,
  onChangeTime,
}: SuggestionScreenProps) {
  const [mapOffCenter, setMapOffCenter] = useState(false);
  const { destination, visited } = suggestion;
  const oneWayMinutes = walkingRoute
    ? Math.round(walkingRoute.durationSeconds / 60)
    : suggestion.oneWayMinutes;
  const roundTripMinutes = oneWayMinutes * 2;
  const neededMinutes = ROUND_TRIP ? roundTripMinutes : oneWayMinutes;
  const overBudget = walkingRoute ? neededMinutes > freeMinutes : suggestion.overBudget;
  const overByMinutes = walkingRoute
    ? Math.max(0, neededMinutes - freeMinutes)
    : suggestion.overByMinutes;

  return (
    <div className="screen screen--map">
      <div className="map-wrap">
        <MapView
          mode="fit"
          user={user}
          destination={{ lat: destination.lat, lng: destination.lng, name: destination.name }}
          trail={[]}
          route={
            walkingRoute?.geometry ??
            (user ? [user, { lat: destination.lat, lng: destination.lng }] : [])
          }
          className="map"
          onUserInteract={() => setMapOffCenter(true)}
          onRecenter={() => setMapOffCenter(false)}
        />
        {mapOffCenter && <span className="map-recenter-hint">Double-tap to recenter</span>}
      </div>

      <div className="sheet">
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

        {routeLoading && !walkingRoute && (
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            Finding the walking route…
          </p>
        )}

        <RippleButton type="button" className="btn btn--primary" onClick={onStart}>
          Start walk
          <span aria-hidden="true">→</span>
        </RippleButton>
        <div className="btn-row">
          <RippleButton type="button" className="btn btn--secondary" onClick={onReroll}>
            Show me another
          </RippleButton>
          <RippleButton type="button" className="btn btn--secondary" onClick={onChangeTime}>
            Change time
          </RippleButton>
        </div>
      </div>
    </div>
  );
}
