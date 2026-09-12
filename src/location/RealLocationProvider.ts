import type { Fix, LocationError, LocationProvider } from "./LocationProvider";

/** No `timeout` here on purpose - the UI owns the "still looking" timer. */
const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
};

/** Substituted when accuracy is missing so downstream arithmetic never sees NaN. */
const FALLBACK_ACCURACY_M = 9999;

function toFix(position: GeolocationPosition): Fix {
  const { coords, timestamp } = position;
  const accuracy = isFiniteNumber(coords.accuracy) ? coords.accuracy : FALLBACK_ACCURACY_M;
  return {
    lat: coords.latitude,
    lng: coords.longitude,
    t: timestamp || Date.now(),
    accuracy,
  };
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function toLocationError(error: GeolocationPositionError): LocationError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: "denied",
        message: "Location access was denied. Enable it in your browser settings to continue.",
      };
    case error.TIMEOUT:
      return { code: "timeout", message: "Timed out while trying to find your location." };
    case error.POSITION_UNAVAILABLE:
    default:
      return { code: "unavailable", message: "Your location is unavailable right now." };
  }
}

/** Wraps navigator.geolocation.watchPosition behind the LocationProvider interface. */
export class RealLocationProvider implements LocationProvider {
  readonly kind = "real";
  private watchId: number | null = null;

  now(): number {
    return Date.now();
  }

  start(onFix: (fix: Fix) => void, onError?: (err: LocationError) => void): void {
    this.stop();

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      if (onError) {
        setTimeout(() => {
          onError({ code: "unavailable", message: "Geolocation is not supported on this device." });
        }, 0);
      }
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => onFix(toFix(position)),
      (error) => {
        if (onError) onError(toLocationError(error));
      },
      WATCH_OPTIONS,
    );
  }

  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}
