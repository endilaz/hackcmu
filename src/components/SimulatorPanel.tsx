import { useState } from "react";
import type { SimulatorPanelProps } from "../screenProps";
import { SIM_SPEED_OPTIONS } from "../constants";

/** Collapsible demo-control drawer pinned to the bottom of the screen (plan.md 8.2). */
export default function SimulatorPanel({
  settings,
  onSettingsChange,
  enabled,
  onToggleEnabled,
  paused,
  onPauseToggle,
  walkActive,
  onApplyStart,
  onJumpToArrival,
}: SimulatorPanelProps) {
  const [open, setOpen] = useState(false);
  const [latText, setLatText] = useState(String(settings.startLat));
  const [lngText, setLngText] = useState(String(settings.startLng));
  const [applyError, setApplyError] = useState<string | null>(null);

  const statusWord = !enabled ? "off" : paused ? "paused" : "walking";
  const handleLabel = `SIM · ${settings.speedMultiplier}× · ${statusWord}`;

  function handleApply() {
    const lat = Number(latText);
    const lng = Number(lngText);
    const valid =
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180;
    if (!valid) {
      setApplyError("Enter a valid lat (±90) and lng (±180).");
      return;
    }
    setApplyError(null);
    onApplyStart(lat, lng);
  }

  return (
    <div className="sim-drawer">
      <button
        type="button"
        className="sim-drawer__handle"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{handleLabel}</span>
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="sim-drawer__body">
          <div className="sim-row">
            <span className="sim-row__label">Simulated location</span>
            <button
              type="button"
              className={`sim-btn${enabled ? " sim-btn--on" : ""}`}
              aria-pressed={enabled}
              onClick={() => onToggleEnabled(!enabled)}
            >
              {enabled ? "Simulator on" : "Simulator off"}
            </button>
            <p className="faint">
              {enabled
                ? "Turn off to hand control back to real GPS."
                : "Turn on to drive location for the demo."}
            </p>
          </div>

          <div className="sim-row">
            <span className="sim-row__label">Start location</span>
            <div className="sim-grid">
              <input
                id="sim-start-lat"
                className="sim-input"
                type="text"
                inputMode="decimal"
                aria-label="Start latitude"
                placeholder="Lat"
                value={latText}
                onChange={(e) => setLatText(e.target.value)}
                disabled={walkActive}
              />
              <input
                id="sim-start-lng"
                className="sim-input"
                type="text"
                inputMode="decimal"
                aria-label="Start longitude"
                placeholder="Lng"
                value={lngText}
                onChange={(e) => setLngText(e.target.value)}
                disabled={walkActive}
              />
            </div>
            <button
              type="button"
              className="sim-btn"
              onClick={handleApply}
              disabled={walkActive}
            >
              Apply
            </button>
            {walkActive ? (
              <p className="faint">End the current walk to change the start location.</p>
            ) : (
              applyError && <p className="faint">{applyError}</p>
            )}
          </div>

          <div className="sim-row">
            <span className="sim-row__label">Speed</span>
            <div className="sim-grid">
              {SIM_SPEED_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`sim-btn${settings.speedMultiplier === n ? " sim-btn--on" : ""}`}
                  aria-pressed={settings.speedMultiplier === n}
                  onClick={() => onSettingsChange({ speedMultiplier: n })}
                >
                  {n}×
                </button>
              ))}
            </div>
          </div>

          <div className="sim-row">
            <span className="sim-row__label">Auto-walk</span>
            <button
              type="button"
              className={`sim-btn${settings.autoWalk ? " sim-btn--on" : ""}`}
              aria-pressed={settings.autoWalk}
              onClick={() => onSettingsChange({ autoWalk: !settings.autoWalk })}
            >
              {settings.autoWalk ? "Auto-walk on" : "Auto-walk off"}
            </button>
          </div>

          <div className="sim-row">
            <span className="sim-row__label">Noise</span>
            <button
              type="button"
              className={`sim-btn${settings.noise ? " sim-btn--on" : ""}`}
              aria-pressed={settings.noise}
              onClick={() => onSettingsChange({ noise: !settings.noise })}
            >
              {settings.noise ? "Noise on" : "Noise off"}
            </button>
          </div>

          <div className="sim-row">
            <span className="sim-row__label">Playback</span>
            <button type="button" className="sim-btn" onClick={onPauseToggle}>
              {paused ? "Resume" : "Pause"}
            </button>
          </div>

          <div className="sim-row">
            <span className="sim-row__label">Jump to arrival</span>
            <button
              type="button"
              className="sim-btn"
              onClick={onJumpToArrival}
              disabled={!walkActive}
            >
              Jump to arrival
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
