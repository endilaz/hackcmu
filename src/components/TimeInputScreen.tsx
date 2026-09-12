import type { CSSProperties } from "react";
import type { TimeInputScreenProps } from "../screenProps";
import { MIN_FREE_MINUTES, MAX_FREE_MINUTES, QUICK_PICK_MINUTES } from "../constants";
import RippleButton from "./RippleButton";

function StatIcon({ type }: { type: "streak" | "walks" | "distance" }) {
  const paths = {
    streak: <path d="M12 2c2 4-1 6 2 9 1-2 3-3 3-6 3 3 4 6 4 10a9 9 0 1 1-18 0c0-3 2-6 5-8-1 4 1 5 2 6 0-5 2-7 2-11Z" />,
    walks: <><path d="M8 4c2 0 3 2 2 4L8 12c-1 2-4 1-4-1l1-4c0-2 1-3 3-3Z" /><path d="M17 12c2 0 3 2 2 4l-2 4c-1 2-4 1-4-1l1-4c0-2 1-3 3-3Z" /></>,
    distance: <><path d="M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Z" /><circle cx="12" cy="9" r="2" /></>,
  };
  return <svg className="stat-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>;
}

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
      <div className="screen__pad screen__pad--fill time-home">
        <section className="time-card time-card--discovery">
          <div className="progress__head">
            <div>
              <span className="overline">Places discovered</span>
              <strong>{visitedCount} of {totalDestinations}</strong>
            </div>
            <span className="discovery-remaining">{Math.max(0, totalDestinations - visitedCount)} to go</span>
          </div>
          <div
            className="progress__track"
            role="progressbar"
            aria-valuenow={visitedCount}
            aria-valuemin={0}
            aria-valuemax={totalDestinations}
            aria-label="Places discovered"
          >
            <div className="progress__fill" style={{ width: `${discoveredPct}%` }}>
              <svg className="progress__pin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Z" /><circle cx="12" cy="9" r="2" /></svg>
            </div>
          </div>
        </section>

        <section className="time-card time-card--minutes">
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
          <div className="time-slider__ticks" aria-hidden="true">
            {QUICK_PICK_MINUTES.map((value) => (
              <span key={value} style={{ left: `${((value - MIN_FREE_MINUTES) / (MAX_FREE_MINUTES - MIN_FREE_MINUTES)) * 100}%` }} />
            ))}
          </div>
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
              {value === minutes && <span className="tile__check" aria-hidden="true">✓</span>}
              <span className="tile__value">{value}</span>
              <span className="tile__unit">min</span>
            </button>
          ))}
          </div>
        </section>

        {locating && slowFix && (
          <>
            <div className="banner banner--warn">
              <span>Still looking for you…</span>
            </div>
            {!simEnabled && (
              <RippleButton type="button" className="btn btn--secondary" onClick={onUseSimulator}>
                Use simulated location
              </RippleButton>
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
              <RippleButton type="button" className="btn btn--secondary" onClick={onUseSimulator}>
                Use simulated location
              </RippleButton>
            )}
          </>
        )}

        <section className="facts facts--rule time-card time-card--stats">
          <div className="fact">
            <StatIcon type="streak" />
            <span className="fact__value">{stats.currentStreakDays}</span>
            <span className="overline">Day streak</span>
          </div>
          <div className="fact">
            <StatIcon type="walks" />
            <span className="fact__value">{stats.totalWalks}</span>
            <span className="overline">Walks</span>
          </div>
          <div className="fact">
            <StatIcon type="distance" />
            <span className="fact__value">{(stats.totalMeters / 1000).toFixed(1)} km</span>
            <span className="overline">Total</span>
          </div>
        </section>
        <div className="screen__spacer" />
      </div>

      <div className="screen__footer time-home__footer">
        <RippleButton
          type="button"
          className="btn btn--primary"
          onClick={onFind}
          disabled={locating}
        >
          {locating ? "Finding you…" : "Find me a walk"}
          {!locating && <span aria-hidden="true">→</span>}
        </RippleButton>
        <RippleButton type="button" className="btn btn--link" onClick={onOpenCalendar}>
          <span aria-hidden="true">▣</span> Import my calendar
        </RippleButton>
      </div>
    </div>
  );
}
