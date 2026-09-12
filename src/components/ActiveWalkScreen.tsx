import { useState } from "react";
import type { ActiveWalkScreenProps } from "../screenProps";
import { formatDistance, formatDuration } from "../lib/geo";
import MapView from "./MapView";

/**
 * A walk in progress: the map is the content, and the paper sheet floats over
 * it carrying the three live numbers. No tab bar - this is a focused mode, not
 * a place you browse from.
 */
export default function ActiveWalkScreen({
  walk,
  destination,
  user,
  elapsedMs,
  remainingMeters,
  onEndEarly,
}: ActiveWalkScreenProps) {
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [showRecenter, setShowRecenter] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function handleRecenter() {
    setRecenterNonce((n) => n + 1);
    setShowRecenter(false);
  }

  return (
    <div className="screen screen--map">
      <div className="map-wrap">
        <MapView
          mode="follow"
          user={user}
          destination={{ lat: destination.lat, lng: destination.lng, name: destination.name }}
          trail={walk.trail}
          dashedToDestination
          recenterNonce={recenterNonce}
          onUserInteract={() => setShowRecenter(true)}
        />
        <div className="map-pill">
          <span aria-hidden="true">→</span>
          <span className="map-pill__text">Heading to {destination.name}</span>
        </div>
        {showRecenter && (
          <button type="button" className="map-btn" onClick={handleRecenter}>
            Recenter
          </button>
        )}
      </div>

      <div className="sheet">
        <div className="sheet__handle" />

        <div className="facts">
          <div className="fact">
            <span className="fact__value">{formatDistance(walk.distanceMeters)}</span>
            <span className="overline">Walked</span>
          </div>
          <div className="fact">
            <span className="fact__value">{formatDuration(elapsedMs)}</span>
            <span className="overline">Elapsed</span>
          </div>
          <div className="fact">
            <span className="fact__value">{formatDistance(remainingMeters)}</span>
            <span className="overline">To go</span>
          </div>
        </div>

        {confirming ? (
          <>
            <p className="muted" style={{ textAlign: "center" }}>
              End this walk?
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setConfirming(false)}
              >
                Keep walking
              </button>
              <button type="button" className="btn btn--danger" onClick={onEndEarly}>
                Yes, end it
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => setConfirming(true)}
          >
            End walk early
          </button>
        )}
      </div>
    </div>
  );
}
