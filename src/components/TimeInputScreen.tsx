import { useState } from "react";
import type { TimeInputScreenProps } from "../screenProps";
import { MIN_FREE_MINUTES, MAX_FREE_MINUTES, QUICK_PICK_MINUTES } from "../constants";

/** Home screen: ask how much free time the user has, then go find them a walk. */
export default function TimeInputScreen({
  minutes,
  onMinutesChange,
  onFind,
  locating,
  slowFix,
  error,
  onUseSimulator,
  simEnabled,
  onOpenCalendar,
}: TimeInputScreenProps) {
  // Raw text lives locally so the user can freely clear/retype; only parsed,
  // in-range values are ever clamped, and only on blur (plan.md 9.1).
  const [text, setText] = useState(String(minutes));

  const parsed = text.trim() === "" ? null : Number(text);
  const isOutOfRange =
    parsed !== null &&
    Number.isFinite(parsed) &&
    (parsed < MIN_FREE_MINUTES || parsed > MAX_FREE_MINUTES);

  function handleChange(next: string) {
    setText(next);
    const n = Number(next);
    if (next.trim() !== "" && Number.isFinite(n)) {
      onMinutesChange(n);
    }
  }

  function handleBlur() {
    const n = Number(text);
    if (text.trim() === "" || !Number.isFinite(n)) {
      setText(String(minutes));
      return;
    }
    const clamped = Math.min(MAX_FREE_MINUTES, Math.max(MIN_FREE_MINUTES, n));
    setText(String(clamped));
    onMinutesChange(clamped);
  }

  function handleQuickPick(value: number) {
    setText(String(value));
    onMinutesChange(value);
  }

  return (
    <div className="screen">
      <div className="screen__pad">
        <div>
          <h1>How much time do you have?</h1>
          <p className="muted">
            We'll find a nearby spot you can walk to and back within your window.
          </p>
        </div>

        <div>
          <label htmlFor="free-minutes" className="faint">
            Minutes free
          </label>
          <input
            id="free-minutes"
            className="input"
            inputMode="numeric"
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
          />
          {isOutOfRange && (
            <p className="faint">
              {MIN_FREE_MINUTES}-{MAX_FREE_MINUTES} minutes
            </p>
          )}
        </div>

        <div className="chips" role="group" aria-label="Quick pick minutes">
          {QUICK_PICK_MINUTES.map((value) => (
            <button
              key={value}
              type="button"
              className={`chip${value === minutes ? " chip--on" : ""}`}
              aria-pressed={value === minutes}
              onClick={() => handleQuickPick(value)}
            >
              {value}
            </button>
          ))}
        </div>

        {locating && slowFix && (
          <>
            <div className="banner banner--warn">
              <span>Still looking for you…</span>
            </div>
            {!simEnabled && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={onUseSimulator}
              >
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
              <button
                type="button"
                className="btn btn--secondary"
                onClick={onUseSimulator}
              >
                Use simulated location
              </button>
            )}
          </>
        )}
      </div>

      <div className="screen__footer">
        <button
          type="button"
          className="btn btn--primary"
          onClick={onFind}
          disabled={locating}
        >
          {locating ? "Finding you…" : "Find me a walk"}
        </button>
        <button type="button" className="btn btn--link" onClick={onOpenCalendar}>
          Or import my calendar
        </button>
      </div>
    </div>
  );
}
