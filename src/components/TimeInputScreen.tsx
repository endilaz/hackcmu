import type { CSSProperties } from "react";
import type { TimeInputScreenProps } from "../screenProps";
import { MIN_FREE_MINUTES, MAX_FREE_MINUTES, QUICK_PICK_MINUTES } from "../constants";

/**
 * Home. The free-minutes value is the hero: a 116px serif numeral, not a form
 * field. It's a pure readout - the inline slider directly beneath it is the
 * only way to change the value by hand. Everything else on the screen is
 * subordinate to it.
 */
export default function TimeInputScreen({
  minutes,
  stats,
  visitedCount,
  totalDestinations,
  onMinutesChange,
  onFind,
  locating,
  slowFix,
  error,
  onUseSimulator,
  simEnabled,
  onOpenCalendar,
}: TimeInputScreenProps) {
  const discoveredPct =
    totalDestinations > 0 ? Math.round((visitedCount / totalDestinations) * 100) : 0;

  const sliderPct =
    ((minutes - MIN_FREE_MINUTES) / (MAX_FREE_MINUTES - MIN_FREE_MINUTES)) * 100;

  function pick(value: number) {
    onMinutesChange(value);
  }

  return (
    <div className="screen">
      <div className="screen__pad screen__pad--fill">
        <div className="progress">
          <div className="progress__head">
            <span className="faint">
              {visitedCount} of {totalDestinations} places discovered
            </span>
            <span className="faint">{discoveredPct}%</span>
          </div>
          <div
            className="progress__track"
            role="progressbar"
            aria-valuenow={visitedCount}
            aria-valuemin={0}
            aria-valuemax={totalDestinations}
            aria-label="Places discovered"
          >
            <div className="progress__fill" style={{ width: `${discoveredPct}%` }} />
          </div>
        </div>

        <div className="hero">
          <span className="hero__value">{minutes}</span>
          <span className="overline">Minutes free</span>
        </div>

        <div className="time-slider">
          <input
            type="range"
            className="time-slider__input"
            min={MIN_FREE_MINUTES}
            max={MAX_FREE_MINUTES}
            step={5}
            value={minutes}
            onChange={(e) => onMinutesChange(Number(e.target.value))}
            aria-label="Free minutes"
            aria-valuetext={`${minutes} minutes`}
            style={{ "--time-slider-fill": `${sliderPct}%` } as CSSProperties}
          />
          <div className="time-slider__scale">
            <span className="overline">5 min</span>
            <span className="overline">3 hr</span>
          </div>
        </div>

        <div className="tiles" role="group" aria-label="Quick pick minutes">
          {QUICK_PICK_MINUTES.map((value) => (
            <button
              key={value}
              type="button"
              className={`tile${value === minutes ? " tile--on" : ""}`}
              aria-pressed={value === minutes}
              onClick={() => pick(value)}
            >
              <span className="tile__value">{value}</span>
              <span className="tile__unit">min</span>
            </button>
          ))}
        </div>

        {locating && slowFix && (
          <>
            <div className="banner banner--warn">
              <span>Still looking for you…</span>
            </div>
            {!simEnabled && (
              <button type="button" className="btn btn--secondary" onClick={onUseSimulator}>
                Use simulated location
              </button>
            )}
          </>
        )}

        {error !== null && (
          <>
            <div className="banner banner--error">
              <span>
                {error.code === "denied"
                  ? `${error.message} Re-enable location access for this site in your browser settings, then try again, or continue with a simulated location.`
                  : error.message}
              </span>
            </div>
            {!simEnabled && (
              <button type="button" className="btn btn--secondary" onClick={onUseSimulator}>
                Use simulated location
              </button>
            )}
          </>
        )}

        <div className="screen__spacer" />

        <div className="facts facts--rule">
          <div className="fact">
            <span className="fact__value">{stats.currentStreakDays}</span>
            <span className="overline">Day streak</span>
          </div>
          <div className="fact">
            <span className="fact__value">{stats.totalWalks}</span>
            <span className="overline">Walks</span>
          </div>
          <div className="fact">
            <span className="fact__value">{(stats.totalMeters / 1000).toFixed(1)} km</span>
            <span className="overline">Total</span>
          </div>
        </div>
      </div>

      <div className="screen__footer">
        <button
          type="button"
          className="btn btn--primary"
          onClick={onFind}
          disabled={locating}
        >
          {locating ? "Finding you…" : "Find me a walk"}
          {!locating && <span aria-hidden="true">→</span>}
        </button>
        <button type="button" className="btn btn--link" onClick={onOpenCalendar}>
          Import my calendar
        </button>
      </div>
    </div>
  );
}
