import { useEffect, useRef, useState } from "react";
import type { TimeInputScreenProps } from "../screenProps";
import { MIN_FREE_MINUTES, MAX_FREE_MINUTES, QUICK_PICK_MINUTES } from "../constants";

/**
 * Home. The free-minutes value is the hero: a 116px serif numeral you tap to
 * edit, not a form field. Everything else on the screen is subordinate to it.
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
  const [editing, setEditing] = useState(false);

  const discoveredPct =
    totalDestinations > 0 ? Math.round((visitedCount / totalDestinations) * 100) : 0;

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

        <button
          type="button"
          className="hero"
          onClick={() => setEditing(true)}
          aria-label={`${minutes} minutes free. Tap to change.`}
        >
          <span className="hero__value">
            {minutes}
            <span className="hero__pencil" aria-hidden="true">
              ✎
            </span>
          </span>
          <span className="overline">Minutes free</span>
        </button>

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

      {editing && (
        <MinutesSheet
          minutes={minutes}
          onCommit={onMinutesChange}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

type SheetProps = {
  minutes: number;
  onCommit: (minutes: number) => void;
  onClose: () => void;
};

/**
 * Tap-the-numeral editor. Raw text lives locally so the field can be cleared
 * and retyped freely; only a parsed, in-range value is ever committed, and
 * clamping happens once on close rather than fighting the user mid-keystroke.
 */
function MinutesSheet({ minutes, onCommit, onClose }: SheetProps) {
  const [text, setText] = useState(String(minutes));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const parsed = Number(text);
  const valid = text.trim() !== "" && Number.isFinite(parsed);

  function commitAndClose() {
    if (valid) {
      onCommit(Math.min(MAX_FREE_MINUTES, Math.max(MIN_FREE_MINUTES, Math.round(parsed))));
    }
    onClose();
  }

  return (
    <div
      className="scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Set minutes free"
      onClick={commitAndClose}
    >
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2>How many minutes?</h2>

        <div>
          <input
            ref={inputRef}
            className="input input--hero"
            inputMode="numeric"
            value={text}
            aria-label="Minutes free"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitAndClose();
            }}
          />
          <p className="faint" style={{ textAlign: "center", marginTop: 8 }}>
            {MIN_FREE_MINUTES} to {MAX_FREE_MINUTES} minutes
          </p>
        </div>

        <div className="chips" role="group" aria-label="Quick pick minutes">
          {QUICK_PICK_MINUTES.map((value) => (
            <button
              key={value}
              type="button"
              className={`chip${String(value) === text ? " chip--on" : ""}`}
              aria-pressed={String(value) === text}
              onClick={() => setText(String(value))}
            >
              {value}
            </button>
          ))}
        </div>

        <button type="button" className="btn btn--primary" onClick={commitAndClose}>
          Done
        </button>
      </div>
    </div>
  );
}
