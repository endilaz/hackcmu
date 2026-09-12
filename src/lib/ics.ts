import { MIN_FREE_MINUTES, MAX_FREE_MINUTES } from "../constants";
import type { CalEvent, Gap } from "../types";

/**
 * A small, forgiving .ics (iCalendar) parser and gap finder. This is NOT a
 * full RFC 5545 implementation - just enough to read a Google/Apple Calendar
 * export well enough to find free time today. Anything we can't confidently
 * parse is skipped rather than thrown, so a weird calendar never crashes the
 * app - the user just sees fewer (or zero) gaps.
 */

/** Unfold logical lines: a line starting with a space/tab continues the previous one. */
function unfoldLines(text: string): string[] {
  const rawLines = text.split(/\r\n|\r|\n/);
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

type ParsedProp = {
  name: string;
  params: string;
  value: string;
};

/** Split "NAME;PARAM=X:value" into name / params / value, on the FIRST colon only. */
function parseLine(line: string): ParsedProp | null {
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return null;
  const head = line.slice(0, colonIdx);
  const value = line.slice(colonIdx + 1);
  const semiIdx = head.indexOf(";");
  const name = (semiIdx === -1 ? head : head.slice(0, semiIdx)).trim().toUpperCase();
  const params = semiIdx === -1 ? "" : head.slice(semiIdx + 1);
  return { name, params, value };
}

/**
 * Parse a DTSTART/DTEND value into epoch ms, or null if we can't/won't handle
 * it. Supported forms:
 *   - "20260912T140000Z"                         UTC (trailing Z)
 *   - ";TZID=...:20260912T140000"                treated as LOCAL wall-clock
 *     time (no real timezone database here - a hackathon-scope shortcut)
 *   - ";VALUE=DATE:20260912"                      all-day - returns null,
 *     since we deliberately skip all-day events (see parseIcs).
 */
function parseDateValue(prop: ParsedProp): number | null {
  const isAllDay = /(^|;)VALUE=DATE(;|$)/i.test(prop.params);
  if (isAllDay) return null;

  const value = prop.value.trim();

  // Basic UTC form: YYYYMMDDTHHMMSSZ
  const utcMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (utcMatch) {
    const [, y, mo, d, h, mi, s] = utcMatch;
    return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  }

  // Local / TZID form: YYYYMMDDTHHMMSS (no trailing Z) - parse wall-clock
  // digits as local time, ignoring whatever TZID says.
  const localMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(value);
  if (localMatch) {
    const [, y, mo, d, h, mi, s] = localMatch;
    return new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    ).getTime();
  }

  // A bare date with no VALUE=DATE param - still all-day shaped, skip it too.
  if (/^\d{8}$/.test(value)) return null;

  return null;
}

/**
 * Parse the events out of raw .ics text. Deliberately forgiving: unknown or
 * malformed input never throws, it just yields fewer events (possibly []).
 *
 * All-day events (VALUE=DATE) are skipped entirely - they're usually things
 * like "Birthday" or "PTO" that span the whole day and would swallow every
 * gap, leaving nothing to suggest.
 */
export function parseIcs(text: string): CalEvent[] {
  try {
    if (typeof text !== "string" || text.trim() === "") return [];

    const lines = unfoldLines(text);
    const events: CalEvent[] = [];

    let inEvent = false;
    let summary: string | null = null;
    let start: number | null = null;
    let end: number | null = null;
    let sawAllDay = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "BEGIN:VEVENT") {
        inEvent = true;
        summary = null;
        start = null;
        end = null;
        sawAllDay = false;
        continue;
      }
      if (trimmed === "END:VEVENT") {
        if (inEvent && !sawAllDay && summary !== null && start !== null && end !== null && end > start) {
          events.push({ summary, start, end });
        }
        inEvent = false;
        continue;
      }
      if (!inEvent) continue;

      const prop = parseLine(line);
      if (prop === null) continue;

      if (prop.name === "SUMMARY") {
        summary = prop.value.trim() || "Busy";
      } else if (prop.name === "DTSTART") {
        if (/(^|;)VALUE=DATE(;|$)/i.test(prop.params)) {
          sawAllDay = true;
        } else {
          start = parseDateValue(prop);
        }
      } else if (prop.name === "DTEND") {
        if (/(^|;)VALUE=DATE(;|$)/i.test(prop.params)) {
          sawAllDay = true;
        } else {
          end = parseDateValue(prop);
        }
      }
    }

    events.sort((a, b) => a.start - b.start);
    return events;
  } catch {
    // Malformed input must never crash the app.
    return [];
  }
}

/**
 * Merge overlapping/back-to-back events so adjacent meetings don't produce
 * bogus negative gaps. A merged block keeps the earliest-starting event's
 * summary (there's no single "correct" label for a block made of several
 * overlapping meetings, so we just pick a consistent one).
 */
function mergeEvents(events: CalEvent[]): CalEvent[] {
  const sorted = [...events].sort((a, b) => a.start - b.start);
  const merged: CalEvent[] = [];
  for (const ev of sorted) {
    const last = merged[merged.length - 1];
    if (last && ev.start <= last.end) {
      if (ev.end > last.end) last.end = ev.end;
    } else {
      merged.push({ ...ev });
    }
  }
  return merged;
}

/**
 * Find the free gaps between `now` and `now + horizonHours` hours, given a
 * list of calendar events. Never throws.
 */
export function findGaps(events: CalEvent[], now: number, horizonHours = 12): Gap[] {
  try {
    const horizonMs = horizonHours * 60 * 60 * 1000;
    const windowEnd = now + horizonMs;

    const relevant = events.filter((ev) => ev.end > now && ev.start < windowEnd);
    const merged = mergeEvents(relevant);

    const gaps: Gap[] = [];

    const pushGap = (start: number, end: number, afterEvent: string | null, beforeEvent: string | null) => {
      const minutes = Math.floor((end - start) / (60 * 1000));
      if (minutes < MIN_FREE_MINUTES) return;
      gaps.push({
        start,
        end,
        minutes: Math.min(minutes, MAX_FREE_MINUTES),
        afterEvent,
        beforeEvent,
      });
    };

    if (merged.length === 0) {
      // No events in the window at all - nothing to report a gap "between",
      // per spec we don't invent a trailing/open-ended gap in this case.
      return [];
    }

    // Gap from now until the first upcoming event.
    const first = merged[0];
    if (first.start > now) {
      pushGap(now, first.start, null, first.summary);
    }

    // Gaps between consecutive (already-merged, non-overlapping) events.
    for (let i = 0; i < merged.length - 1; i++) {
      const cur = merged[i];
      const next = merged[i + 1];
      const gapStart = Math.max(cur.end, now);
      if (next.start > gapStart) {
        pushGap(gapStart, next.start, cur.summary, next.summary);
      }
    }

    // No trailing gap after the last event - an open-ended evening isn't a
    // "gap between commitments".

    return gaps;
  } catch {
    return [];
  }
}
