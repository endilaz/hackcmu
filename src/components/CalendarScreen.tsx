import { useState } from "react";
import type { ChangeEvent } from "react";
import type { CalendarScreenProps } from "../screenProps";
import type { Gap } from "../types";
import { parseIcs, findGaps } from "../lib/ics";
import RippleButton from "./RippleButton";

type Status =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | { kind: "gaps"; gaps: Gap[] };

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

/** "2:15 PM – 2:50 PM" style window label. */
function formatWindow(gap: Gap): string {
  return `${timeFormatter.format(new Date(gap.start))} – ${timeFormatter.format(new Date(gap.end))}`;
}

/** "after Lecture, before Office Hours" (either half may be missing). */
function formatBounds(gap: Gap): string | null {
  if (gap.afterEvent && gap.beforeEvent) return `after ${gap.afterEvent}, before ${gap.beforeEvent}`;
  if (gap.beforeEvent) return `before ${gap.beforeEvent}`;
  if (gap.afterEvent) return `after ${gap.afterEvent}`;
  return null;
}

/**
 * Import a .ics calendar export, find today's free gaps, and let the user
 * tap one straight into the walk flow. Everything happens client-side: the
 * file is read into memory, parsed, and never persisted or uploaded - that's
 * the whole privacy story, so all state here is local and lives only for
 * this session.
 */
export default function CalendarScreen({ onUseGap, onBack }: CalendarScreenProps) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Let the user re-pick the same file name and still get a change event.
    e.target.value = "";
    if (!file) return;

    setFileName(file.name);

    let text: string;
    try {
      text = await file.text();
    } catch {
      setStatus({ kind: "error", message: "Couldn't read that file. Please try again." });
      return;
    }

    if (!/BEGIN:VCALENDAR/i.test(text)) {
      setStatus({
        kind: "error",
        message: "That doesn't look like an .ics calendar file.",
      });
      return;
    }

    const events = parseIcs(text);
    const gaps = findGaps(events, Date.now());

    setStatus(gaps.length === 0 ? { kind: "empty" } : { kind: "gaps", gaps });
  }

  return (
    <div className="screen">
      <div className="screen__pad">
        <RippleButton type="button" className="btn btn--icon" onClick={onBack} aria-label="Back">
          ←
        </RippleButton>

        <div>
          <h1>Import your calendar</h1>
          <p className="muted">
            Import today's calendar to see the free gaps between your events - no upload,
            nothing saved, it all stays on this device.
          </p>
        </div>

        <div className="dropzone">
          <span className="dropzone__icon" aria-hidden="true">
            🗓
          </span>
          <label htmlFor="ics-file" className="dropzone__label">
            Choose an .ics file
          </label>
          <p className="faint">
            Google Calendar: Settings → Import/Export → Export.
            <br />
            Apple Calendar: File → Export.
          </p>
          <input
            id="ics-file"
            className="dropzone__input"
            type="file"
            accept=".ics,text/calendar"
            onChange={(e) => {
              void handleFile(e);
            }}
          />
        </div>

        {status.kind === "idle" && (
          <div className="empty">
            <p className="empty__mark">Nothing imported yet.</p>
            <p className="faint">
              Export your calendar above and we'll find today's free time for you.
            </p>
          </div>
        )}

        {status.kind === "error" && (
          <div className="banner banner--error">
            <span>{status.message}</span>
          </div>
        )}

        {status.kind === "empty" && (
          <div className="empty">
            <p className="empty__mark">No free gaps found today{fileName ? ` in ${fileName}` : ""}.</p>
            <p className="faint">Your day looks fully booked - try entering time manually instead.</p>
          </div>
        )}

        {status.kind === "gaps" && (
          <>
            <h2>Today's free gaps</h2>
            <ul className="rows">
              {status.gaps.map((gap) => {
                const bounds = formatBounds(gap);
                return (
                  <li key={`${gap.start}-${gap.end}`}>
                    <button
                      type="button"
                      className="row"
                      onClick={() => onUseGap(gap.minutes)}
                    >
                      <span className="row__lead">
                        {gap.minutes}
                        <span className="tile__unit"> min</span>
                      </span>
                      <div className="row__main">
                        <span className="muted">{formatWindow(gap)}</span>
                        {bounds && <span className="faint">{bounds}</span>}
                      </div>
                      <span className="row__chevron" aria-hidden="true">
                        ›
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
