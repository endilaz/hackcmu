import { describe, it, expect } from "vitest";
import { parseIcs, findGaps } from "./ics";
import { MIN_FREE_MINUTES, MAX_FREE_MINUTES } from "../constants";

/** Format an epoch-ms timestamp as a basic UTC .ics DTSTART/DTEND value. */
function icsUtc(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
    d.getUTCHours(),
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

describe("parseIcs", () => {
  it("parses a simple two-event calendar", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Lecture
DTSTART:20260912T140000Z
DTEND:20260912T143000Z
END:VEVENT
BEGIN:VEVENT
SUMMARY:Office Hours
DTSTART:20260912T150000Z
DTEND:20260912T160000Z
END:VEVENT
END:VCALENDAR`;

    const events = parseIcs(ics);
    expect(events).toHaveLength(2);
    expect(events[0].summary).toBe("Lecture");
    expect(events[0].start).toBe(Date.UTC(2026, 8, 12, 14, 0, 0));
    expect(events[0].end).toBe(Date.UTC(2026, 8, 12, 14, 30, 0));
    expect(events[1].summary).toBe("Office Hours");
  });

  it("unfolds continuation lines before parsing", () => {
    // "SUMMARY:Alpha" folded with a continuation line " Beta" (the leading
    // space is the fold marker and must be stripped, not treated as content).
    const ics = `BEGIN:VEVENT
SUMMARY:Alpha
 Beta
DTSTART:20260912T140000Z
DTEND:20260912T150000Z
END:VEVENT`;

    const events = parseIcs(ics);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe("AlphaBeta");
  });

  it("skips all-day VALUE=DATE events entirely", () => {
    const ics = `BEGIN:VEVENT
SUMMARY:Birthday
DTSTART;VALUE=DATE:20260912
DTEND;VALUE=DATE:20260913
END:VEVENT
BEGIN:VEVENT
SUMMARY:Lunch
DTSTART:20260912T170000Z
DTEND:20260912T173000Z
END:VEVENT`;

    const events = parseIcs(ics);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe("Lunch");
  });

  it("treats a TZID local time as wall-clock local, not UTC", () => {
    const ics = `BEGIN:VEVENT
SUMMARY:Standup
DTSTART;TZID=America/New_York:20260912T090000
DTEND;TZID=America/New_York:20260912T093000
END:VEVENT`;

    const events = parseIcs(ics);
    expect(events).toHaveLength(1);
    // Parsed as local wall-clock digits (new Date(y, m, d, h, mi, s)), not UTC.
    expect(events[0].start).toBe(new Date(2026, 8, 12, 9, 0, 0).getTime());
    expect(events[0].end).toBe(new Date(2026, 8, 12, 9, 30, 0).getTime());
  });

  it("never throws on garbage input or empty string, returning []", () => {
    expect(parseIcs("")).toEqual([]);
    expect(parseIcs("this is not an ics file at all {}\n\t???")).toEqual([]);
    expect(parseIcs("BEGIN:VEVENT\nSUMMARY:Unterminated")).toEqual([]);
    // @ts-expect-error - deliberately passing a non-string to prove it never throws.
    expect(parseIcs(null)).toEqual([]);
  });

  it("returns events sorted by start ascending", () => {
    const ics = `BEGIN:VEVENT
SUMMARY:Second
DTSTART:20260912T150000Z
DTEND:20260912T153000Z
END:VEVENT
BEGIN:VEVENT
SUMMARY:First
DTSTART:20260912T090000Z
DTEND:20260912T093000Z
END:VEVENT`;

    const events = parseIcs(ics);
    expect(events.map((e) => e.summary)).toEqual(["First", "Second"]);
  });
});

describe("findGaps", () => {
  it("finds the gap between two events, with correct minutes and bounding summaries", () => {
    const ics = `BEGIN:VEVENT
SUMMARY:Lecture
DTSTART:20260912T140000Z
DTEND:20260912T143000Z
END:VEVENT
BEGIN:VEVENT
SUMMARY:Office Hours
DTSTART:20260912T150000Z
DTEND:20260912T160000Z
END:VEVENT`;
    const events = parseIcs(ics);
    const now = Date.UTC(2026, 8, 12, 13, 0, 0);

    const gaps = findGaps(events, now);

    // Gap 1: now -> Lecture start (60 min, no afterEvent).
    // Gap 2: Lecture end -> Office Hours start (30 min).
    expect(gaps).toHaveLength(2);
    const between = gaps[1];
    expect(between.minutes).toBe(30);
    expect(between.afterEvent).toBe("Lecture");
    expect(between.beforeEvent).toBe("Office Hours");
    expect(between.start).toBe(Date.UTC(2026, 8, 12, 14, 30, 0));
    expect(between.end).toBe(Date.UTC(2026, 8, 12, 15, 0, 0));

    const first = gaps[0];
    expect(first.afterEvent).toBeNull();
    expect(first.beforeEvent).toBe("Lecture");
    expect(first.minutes).toBe(60);
  });

  it("merges overlapping events and never produces a negative gap", () => {
    const ics = `BEGIN:VEVENT
SUMMARY:A
DTSTART:20260912T140000Z
DTEND:20260912T150000Z
END:VEVENT
BEGIN:VEVENT
SUMMARY:B
DTSTART:20260912T143000Z
DTEND:20260912T153000Z
END:VEVENT
BEGIN:VEVENT
SUMMARY:C
DTSTART:20260912T160000Z
DTEND:20260912T170000Z
END:VEVENT`;
    const events = parseIcs(ics);
    const now = Date.UTC(2026, 8, 12, 13, 0, 0);

    const gaps = findGaps(events, now);

    for (const gap of gaps) {
      expect(gap.minutes).toBeGreaterThanOrEqual(0);
      expect(gap.end).toBeGreaterThanOrEqual(gap.start);
    }
    // A and B overlap into one 14:00-15:30 block; C follows separately.
    // Expected gaps: now->14:00 (60 min) and 15:30->16:00 (30 min).
    expect(gaps).toHaveLength(2);
    expect(gaps[0].minutes).toBe(60);
    expect(gaps[0].beforeEvent).toBe("A");
    expect(gaps[1].minutes).toBe(30);
    // The merged A+B block reports the earliest-starting event's summary.
    expect(gaps[1].afterEvent).toBe("A");
    expect(gaps[1].beforeEvent).toBe("C");
  });

  it("drops gaps shorter than MIN_FREE_MINUTES", () => {
    const aStart = Date.UTC(2026, 8, 12, 14, 0, 0);
    const aEnd = Date.UTC(2026, 8, 12, 15, 0, 0);
    // Gap is one minute under the threshold, however it's configured.
    const bStart = aEnd + (MIN_FREE_MINUTES - 1) * 60 * 1000;
    const bEnd = bStart + 60 * 60 * 1000;

    const ics = `BEGIN:VEVENT
SUMMARY:A
DTSTART:${icsUtc(aStart)}
DTEND:${icsUtc(aEnd)}
END:VEVENT
BEGIN:VEVENT
SUMMARY:B
DTSTART:${icsUtc(bStart)}
DTEND:${icsUtc(bEnd)}
END:VEVENT`;
    const events = parseIcs(ics);
    // now == A's start, so there's no leading gap to muddy the result -
    // only the too-short A->B gap is at stake.
    const gaps = findGaps(events, aStart);
    expect(gaps).toHaveLength(0);
  });

  it("ignores events entirely in the past relative to now", () => {
    const ics = `BEGIN:VEVENT
SUMMARY:Yesterday's meeting
DTSTART:20260912T080000Z
DTEND:20260912T090000Z
END:VEVENT
BEGIN:VEVENT
SUMMARY:Future
DTSTART:20260912T160000Z
DTEND:20260912T170000Z
END:VEVENT`;
    const events = parseIcs(ics);
    const now = Date.UTC(2026, 8, 12, 14, 0, 0);

    const gaps = findGaps(events, now);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].afterEvent).toBeNull();
    expect(gaps[0].beforeEvent).toBe("Future");
    expect(gaps[0].minutes).toBe(120);
  });

  it("clamps reported minutes to MAX_FREE_MINUTES", () => {
    const ics = `BEGIN:VEVENT
SUMMARY:Only event
DTSTART:20260912T220000Z
DTEND:20260912T230000Z
END:VEVENT`;
    const events = parseIcs(ics);
    const now = Date.UTC(2026, 8, 12, 0, 0, 0);

    const gaps = findGaps(events, now, 24);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].minutes).toBe(MAX_FREE_MINUTES);
    expect(gaps[0].minutes).toBeLessThanOrEqual(MAX_FREE_MINUTES);
  });

  it("never throws on empty input", () => {
    expect(findGaps([], Date.now())).toEqual([]);
  });
});
