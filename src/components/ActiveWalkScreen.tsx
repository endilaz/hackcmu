import { useState } from "react";
import type { ActiveWalkScreenProps } from "../screenProps";
import { formatDistance, formatDuration } from "../lib/geo";
import MapView from "./MapView";

/** The screen shown for the duration of a walk (plan.md 9.3). */
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
        {showRecenter && (
          <button type="button" className="map-btn" onClick={handleRecenter}>
            Recenter
          </button>
        )}
      </div>

      <div className="screen__pad">
        <p className="muted">Heading to {destination.name}</p>

        <div className="stats">
          <div className="stat">
            <span className="stat__value">{formatDistance(walk.distanceMeters)}</span>
            <span className="stat__label">Walked</span>
          </div>
          <div className="stat">
            <span className="stat__value">{formatDuration(elapsedMs)}</span>
            <span className="stat__label">Elapsed</span>
          </div>
          <div className="stat">
            <span className="stat__value">{formatDistance(remainingMeters)}</span>
            <span className="stat__label">To go</span>
          </div>
        </div>
      </div>

      <div className="screen__footer">
        {confirming ? (
          <>
            <p className="muted">End this walk?</p>
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
