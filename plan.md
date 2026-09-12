```markdown
# HANDOFF: "Spare Walk" — mobile web app MVP for HackCMU 2026

You are implementing a complete, working MVP in one pass. Read this entire document
before writing code. Do not add features beyond what is listed. Do not skip anything
listed under "Must ship." Where this document says "decision," treat it as settled.
Where it says "OPEN DECISION," use the stated default unless the human has edited it.

---

## 0. Situation

- Event: HackCMU 2026 (Carnegie Mellon). Hard submission deadline: **Saturday
  Sept 12, 2026, 4:00 PM ET** via Google Form (project description + track). Showcase
  4:00–6:30 PM, judges walk table to table.
- Judging criteria (equal weight): real-life usefulness, technological complexity,
  originality, presentation/demo quality.
- Demo format: **a screen recording of the app running with a simulated GPS
  location.** No live GPS demo is planned. The simulator (Section 8) is therefore a
  first-class deliverable, not a dev convenience.
- Single fake user. No accounts, no auth, no backend, no database. All state lives in
  the browser (localStorage).
- Time budget is hours, not days. Prefer boring, reliable choices. A smaller thing
  that works beats a bigger thing that half-works.

---

## 1. Product in one paragraph

College students have odd 20–60 minute gaps between commitments. The user enters how
many free minutes they have. The app reads their location, picks **one** destination
from a hand-curated list that they can walk to (and back) in that time, shows it on a
map, and then tracks the walk live using browser geolocation — drawing the GPS trail
and accumulating distance — until they arrive. Afterward it shows a summary of the
walk. The app nudges toward places the user hasn't visited yet. The purpose is
fitness plus discovering nearby places.

---

## 2. Decisions already made (do not revisit)

| Topic | Decision |
|---|---|
| Platform | Web app, used in a phone browser while walking. Mobile-first, portrait. |
| Time input | User types free minutes manually. **No** calendar sync. |
| Travel mode | Walking only. |
| Destinations | Hand-curated static list of coordinates in a file. No Places API, no user submissions. |
| Suggestion count | Exactly **one** destination at a time. A "Show me another" button rerolls to a different single destination. |
| Activity metric | Distance and GPS trail only. **No step counting.** No calories. |
| Tracking | Live: start walk → GPS positions recorded → distance accumulates → arrival detected → walk ends. |
| Fitness trackers | Out of scope (no Apple Health, Strava, Fitbit, etc.). |
| Heatmap | Out of scope for MVP. But persist walk history so it can be built later. |
| Points / badges / rewards | Out of scope. |
| Friends / social | Out of scope for MVP. No friend UI at all. |
| Users | One implicit local user. No login screen. |
| Arrival | Auto-detected by proximity (Section 7.4). |
| Post-walk summary | Yes: trail on map, distance, elapsed time. |
| Exploration bias | Prefer destinations not yet visited when picking. |
| Walk history | Yes: list of completed walks, in localStorage. |
| Map library | Leaflet + OpenStreetMap raster tiles. No API keys. |
| Routing | **None.** Walk time is estimated from straight-line distance (Section 7.1). Do not call any routing API. |
| Nothing fits | If no destination fits the time budget, show the nearest one with a warning that it may run over. |
| "Works anywhere" | Architecture must be location-agnostic (nothing hardcoded to Pittsburgh except the seed data file and the simulator's default start point). |

---

## 3. OPEN DECISIONS (defaults apply unless edited by the human)

1. **Round trip vs. one-way.** DEFAULT: **round trip** — a destination fits if
   `estimated_walk_minutes * 2 <= free_minutes`. If the human changes this to
   one-way, the filter is `estimated_walk_minutes <= free_minutes`. Implement this
   as a single constant `ROUND_TRIP = true` so it's a one-line change.
2. **Tech stack.** DEFAULT: **Vite + React + TypeScript**, plain `leaflet` package
   (not react-leaflet, to avoid version friction), no CSS framework required (plain
   CSS or CSS modules). If the human names a different stack, use it; all
   requirements below are stack-independent.
3. **Simulator default start location.** DEFAULT: **the CMU Fence area, approx.
   `40.4428, -79.9430`** (center of CMU campus). This only affects the simulator
   and the seed data selection.

---

## 4. Tech stack & project setup

- Vite + React + TypeScript (per OPEN DECISION 2).
- `leaflet` for the map. Import Leaflet CSS. Use OSM tiles:
  `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with attribution
  `© OpenStreetMap contributors`.
- No backend. No server-side code. No environment variables. No API keys.
- State: React state + a thin persistence layer over `localStorage`.
- Geolocation: `navigator.geolocation.watchPosition` in real mode; the simulator
  (Section 8) must present the **same interface** so the app code doesn't branch.
- Must run with `npm install && npm run dev` and build with `npm run build`.
- Browser geolocation requires a secure context. `localhost` counts. For testing on a
  real phone, document in the README how to enable HTTPS on the Vite dev server
  (e.g. `@vitejs/plugin-basic-ssl`) or tunnel (e.g. ngrok). Do not make HTTPS
  mandatory for the desktop simulator flow.

Suggested structure (adjust if the stack changes):

```
src/
  main.tsx
  App.tsx                     # top-level state machine + routing between screens
  types.ts                    # Destination, Walk, TrailPoint, AppState
  data/destinations.ts        # hand-curated seed list (Section 6)
  lib/geo.ts                  # haversine, walk-time estimate, bearing
  lib/selection.ts            # destination filtering + picking
  lib/tracking.ts             # trail filtering, distance accumulation, arrival check
  lib/storage.ts              # localStorage read/write, schema versioning
  location/
    LocationProvider.ts       # interface: start(cb), stop()
    RealLocationProvider.ts   # wraps navigator.geolocation.watchPosition
    SimulatedLocationProvider.ts  # Section 8
  components/
    MapView.tsx               # Leaflet wrapper: markers, polyline, user dot
    TimeInputScreen.tsx
    SuggestionScreen.tsx
    ActiveWalkScreen.tsx
    SummaryScreen.tsx
    HistoryScreen.tsx
    SimulatorPanel.tsx        # dev/demo controls
  styles/
README.md
```

---

## 5. Data model

```ts
type Destination = {
  id: string;            // stable slug, e.g. "phipps-conservatory"
  name: string;
  lat: number;
  lng: number;
  blurb: string;         // 1–2 sentences: why it's worth walking to
  category?: string;     // free text: "park" | "view" | "art" | "food" | "campus" | ...
};

type TrailPoint = {
  lat: number;
  lng: number;
  t: number;             // epoch ms
  accuracy?: number;     // meters, from GeolocationCoordinates.accuracy
};

type Walk = {
  id: string;            // uuid or timestamp-based
  destinationId: string;
  startedAt: number;     // epoch ms
  endedAt: number | null;
  status: "active" | "completed" | "abandoned";
  freeMinutes: number;   // what the user entered
  estimatedMinutes: number;  // one-way estimate at time of suggestion
  trail: TrailPoint[];   // filtered points only (Section 7.3)
  distanceMeters: number;
  arrived: boolean;      // true if auto-arrival fired; false if ended manually
};

type AppState = {
  schemaVersion: 1;
  walks: Walk[];         // all completed/abandoned walks, newest last
  activeWalk: Walk | null;
  visitedDestinationIds: string[];  // derived-able but store for convenience
};
```

localStorage key: `sparewalk.state.v1`. Write on every meaningful change (new trail
point may be throttled to at most once per 5 seconds; everything else immediately).
On load, if `activeWalk` is non-null, resume it (Section 9.3).

---

## 6. Destination seed data

Create `src/data/destinations.ts` exporting `Destination[]`.

Requirements:
- **At least 12 entries**, all within ~25 minutes' walk of the simulator default
  start (CMU Fence, ~40.4428, -79.9430), so the reroll button always has options and
  the filter has something to exclude at small time budgets.
- Include a spread of distances: several within 5–8 min, several 8–15 min, a few
  15–25 min.
- Each has a real, specific `blurb`.
- Coordinates below are **approximate starting points from memory; verify each one**
  (e.g. via OpenStreetMap / Nominatim if you have web access; otherwise flag them in
  the README for the team to verify). Do not invent places.

Starter list (verify coordinates):

| id | name | approx lat, lng | category |
|---|---|---|---|
| cmu-fence | The Fence (CMU) | 40.4428, -79.9430 | campus |
| walking-to-the-sky | Walking to the Sky sculpture | 40.4440, -79.9440 | art |
| flagstaff-hill | Flagstaff Hill | 40.4406, -79.9457 | park |
| schenley-plaza | Schenley Plaza | 40.4426, -79.9530 | park |
| cathedral-of-learning | Cathedral of Learning | 40.4443, -79.9532 | view |
| carnegie-museums | Carnegie Museums of Art & Natural History (Dippy statue) | 40.4437, -79.9505 | art |
| phipps-conservatory | Phipps Conservatory | 40.4392, -79.9478 | park |
| westinghouse-memorial | Westinghouse Memorial | 40.4372, -79.9430 | park |
| panther-hollow-lake | Panther Hollow Lake | 40.4355, -79.9480 | park |
| schenley-visitor-center | Schenley Park Visitor Center / Café | 40.4376, -79.9465 | food |
| frick-fine-arts | Frick Fine Arts Building | 40.4415, -79.9515 | campus |
| craig-street | S. Craig Street shops | 40.4450, -79.9490 | food |
| walnut-street | Walnut Street, Shadyside | 40.4515, -79.9330 | food |
| schenley-park-overlook | Schenley Park Overlook (near Anderson Playground) | 40.4340, -79.9420 | view |

Add more if easy. Fewer is unacceptable (<12).

---

## 7. Core algorithms

### 7.1 Walk-time estimate (no routing API)

```
straight_m      = haversine(user, destination)              // meters
route_m         = straight_m * DETOUR_FACTOR                 // DETOUR_FACTOR = 1.3
walk_minutes    = route_m / WALK_SPEED_MPS / 60              // WALK_SPEED_MPS = 1.35
```

Expose `DETOUR_FACTOR`, `WALK_SPEED_MPS`, `ROUND_TRIP` as named constants in one
place. Display estimates rounded to the nearest whole minute.

### 7.2 Destination selection

Input: user location, `freeMinutes`, list of destinations, set of visited IDs,
optional `excludeIds` (destinations already rerolled past in this session).

```
fits(d)  = ROUND_TRIP ? walk_minutes(d) * 2 <= freeMinutes
                      : walk_minutes(d)     <= freeMinutes
also exclude any d with straight_m < 75 m  // you're already there

candidates = destinations.filter(fits).filter(not excluded)
if candidates is empty:
    fallback = nearest destination overall (not excluded); flag `overBudget = true`
    return fallback
unvisited = candidates.filter(d => !visited.has(d.id))
pool      = unvisited.length > 0 ? unvisited : candidates
// Prefer using most of the time budget: weight toward longer walks that still fit.
// Simple version: sort pool by walk_minutes descending, pick randomly among top 3.
return random(pool.slice(0, 3))
```

"Show me another": push current destination ID onto `excludeIds`, rerun. When
`excludeIds` exhausts all candidates, clear `excludeIds` and start over (never dead-end).

### 7.3 Trail filtering & distance accumulation

Raw GPS is noisy; do not naively sum every point. For each incoming position:

```
reject if accuracy > 50 m
reject if no previous accepted point → accept as first point, distance += 0
d  = haversine(prev, current)
dt = (current.t - prev.t) / 1000   // seconds
reject if d < 3 m                  // jitter while standing still
reject if dt > 0 and d / dt > 3.0  // > 3 m/s is not walking → GPS jump
accept: trail.push(current); distanceMeters += d
```

Keep the constants (`MAX_ACCURACY_M=50`, `MIN_STEP_M=3`, `MAX_SPEED_MPS=3.0`) named
and adjustable. The simulator should produce points that pass these filters.

### 7.4 Arrival detection

Arrived when `haversine(current, destination) <= ARRIVAL_RADIUS_M` (default **40 m**)
on **two consecutive accepted points** (prevents a single noisy point from ending the
walk). On arrival: set `arrived = true`, `status = "completed"`, `endedAt = now`,
stop the location provider, add destination to `visitedDestinationIds`, move walk to
`walks`, clear `activeWalk`, navigate to Summary.

### 7.5 Elapsed time

`endedAt - startedAt` for completed walks; live ticking `now - startedAt` during an
active walk. Display as `m:ss` under 1 hour, `h:mm:ss` otherwise.

---

## 8. GPS simulator (REQUIRED — this is how the demo is recorded)

Implement `SimulatedLocationProvider` with the same `start(callback)` / `stop()`
interface as `RealLocationProvider`. The app must be able to switch providers at
runtime without reloading.

### 8.1 Activation

- Simulator is on when either: URL has `?sim=1`, **or** the user toggles it in the
  SimulatorPanel. Persist the toggle in localStorage (`sparewalk.sim.v1`).
- Show a small, always-visible "SIM" badge in a corner when active so the recording
  is honest about it (judges will ask).

### 8.2 SimulatorPanel controls (collapsible drawer, bottom of screen)

- **Start location:** lat/lng inputs, prefilled with the default (OPEN DECISION 3).
  "Apply" sets the simulated current position when no walk is active.
- **Speed multiplier:** 1× / 4× / 10× / 30×. Default 10× so a 12-minute walk records
  in ~72 seconds.
- **Auto-walk to destination:** ON by default. When a walk starts, the simulator
  generates a path from current position to the destination and emits positions along
  it at simulated walking speed (1.35 m/s × multiplier), one emit per 1 s of real time.
- **Pause / Resume** emission.
- **Jump to arrival:** teleports to within 10 m of the destination and emits two
  points there (so arrival detection fires).
- **Noise:** toggle; when ON, add Gaussian jitter of σ ≈ 4 m to each emitted point and
  set `accuracy` to a random 8–20 m. When OFF, `accuracy = 5`. Default ON (looks
  realistic in the recording, still passes filters).

### 8.3 Path generation

Straight line from start to destination is acceptable but looks fake. Do this instead:
- Divide the straight segment into N = 6–10 legs.
- Offset each interior waypoint perpendicular to the segment by a random
  ±(10–25% of leg length), with sign alternating or random.
- Linearly interpolate along the resulting polyline at the simulated speed.
- Total generated path length should be roughly `straight_m × 1.2–1.4`, consistent
  with `DETOUR_FACTOR`.

### 8.4 Idle behavior

When no walk is active, the simulator emits the start position every 2 s (with noise
if enabled) so the "current location" dot exists on the Suggestion screen.

---

## 9. Screens & flows

All screens are mobile-first (design for ~390×844 viewport; must not break at 360
wide). Large touch targets (≥44 px). Map should occupy most of the vertical space
where present. A minimal top bar shows the app name and a History icon.

### 9.1 Time Input screen (home)

- Heading: something like "How much time do you have?"
- Numeric input for minutes with quick-pick chips: 15, 20, 30, 45, 60. Range 5–180.
- Primary button "Find me a walk" → requests location (real or sim) → Suggestion.
- If geolocation is denied/unavailable in real mode, show an inline error with a
  button "Use simulated location" that turns on the simulator.
- If `activeWalk` exists on load, skip this screen and go to Active Walk (resume).

### 9.2 Suggestion screen

- Map: user location dot, destination marker, a dashed straight line between them
  (clearly a "as the crow flies" indicator, not a route). Fit bounds to both.
- Card: destination name, blurb, "~N min walk" (one-way), and if `ROUND_TRIP`
  also "~2N min round trip". "New to you" tag if unvisited; "Visited before" if not.
- If `overBudget`: amber banner "Nothing fits in N min — this is the closest, it may
  run about M min over."
- Buttons: **Start walk** (primary), **Show me another** (secondary), **Change time**
  (back link).

### 9.3 Active Walk screen

- Map: destination marker, live user dot, trail polyline growing as points are
  accepted. Map follows the user (recenters when user dot nears edge; a "recenter"
  button if the user pans).
- Stats bar: distance (m under 1000, km with 2 decimals above), elapsed time,
  straight-line remaining distance to destination.
- Button: **End walk early** → confirm → `status = "abandoned"`, `arrived = false`,
  go to Summary.
- Arrival fires automatically (7.4) → Summary.
- Persist `activeWalk` so a page reload lands back here with trail intact, and the
  location provider restarts automatically.

### 9.4 Summary screen

- Header: "You made it to {name}!" if arrived; "Walk ended" if abandoned.
- Static map: full trail polyline, start marker, destination marker, fit bounds.
- Stats: distance, elapsed time, average pace (min/km) if distance > 100 m.
- Buttons: **Walk again** (→ Time Input), **View history**.

### 9.5 History screen

- Reverse-chronological list of walks: destination name, date/time, distance,
  duration, arrived/ended-early badge.
- Tap a walk → its Summary view (read-only).
- Small stats header: total walks, total distance, unique destinations visited out of
  total destinations (e.g. "5 of 14 places discovered"). This is the exploration
  hook standing in for the future heatmap.
- Empty state text if no walks.

---

## 10. Edge cases (handle all)

- Geolocation permission denied → 9.1 error path.
- Geolocation permission granted but no fix within 10 s → show "Still looking for
  you…" with option to switch to simulator.
- User enters a time < 5 or > 180 → clamp with a hint.
- No destination fits → over-budget fallback (7.2).
- All destinations visited → selection still works (falls back to `candidates`).
- Reroll exhausts candidates → wraps around (7.2).
- Reload during an active walk → resume (9.3).
- Switching simulator on/off mid-walk → allowed; provider restarts; trail continues.
- localStorage unavailable or corrupted → start with empty state, don't crash.
- Leaflet container resize on orientation change → call `map.invalidateSize()`.

---

## 11. Explicitly OUT OF SCOPE — do not build, do not stub UI for

- Calendar sync of any kind
- Friends, sharing, joining walks, leaderboards, any social UI
- Heatmap
- Points, badges, streaks, rewards
- Fitness-tracker or health-API integration
- Step counting, calories
- Routing / turn-by-turn / walking directions API
- Places API or any dynamic destination source
- User accounts, login, backend, database
- Multiple destinations per walk, loops, itineraries
- Push notifications, PWA install, service worker (unless trivially free and zero-risk)

A "Coming soon" line in the README is fine. In-app placeholders are not.

---

## 12. Deliverables

1. Working app: `npm install && npm run dev` runs; `npm run build` succeeds with no
   TypeScript errors.
2. `README.md` containing:
   - One-paragraph description.
   - Run instructions (dev, build, phone-over-HTTPS).
   - **Demo recording script** (Section 13) verbatim.
   - How the simulator works and how to toggle it.
   - Where to edit constants (`DETOUR_FACTOR`, `WALK_SPEED_MPS`, `ROUND_TRIP`,
     `ARRIVAL_RADIUS_M`, filter thresholds).
   - How to add destinations.
   - List of destination coordinates you could not verify, if any.
   - "Roadmap / not in MVP" list mirroring Section 11.
3. Seed data with ≥12 verified-or-flagged destinations.
4. No console errors during the demo script.

---

## 13. Demo recording script (acceptance test)

The app is done when this sequence works end to end with no manual intervention
beyond what's listed, on a desktop browser in a mobile-sized viewport with `?sim=1`:

1. Load app. SIM badge visible. Time Input screen shown.
2. Tap "30". Tap "Find me a walk."
3. Suggestion screen shows a destination with ~≤15 min one-way estimate, "New to
   you" tag, dashed line on map.
4. Tap "Show me another." A different destination appears.
5. Tap "Start walk." Active Walk screen. Within 3 seconds the user dot moves and the
   trail polyline begins drawing. Distance and time tick up.
6. Let it run at 10× until arrival (~1–2 min real time). Arrival fires automatically.
7. Summary screen shows full trail, distance, time, "You made it to {name}!"
8. Tap "View history." Shows 1 walk, "1 of N places discovered."
9. Tap "Walk again." Enter 15. Find a walk. Confirm the previously visited
   destination is not suggested first (exploration bias visible).
10. Start walk, tap "End walk early," confirm. Summary shows "Walk ended."
    History shows 2 walks with correct badges.
11. Reload the page mid-walk (start a third walk first, reload after ~10 s): Active
    Walk screen resumes with trail intact and continues moving.

Also verify once in real-GPS mode on a desktop (permission granted, stationary):
the user dot appears, no crash, distance stays at 0 while stationary (jitter filter
works).

---

## 14. Implementation order (recommended, to always have something demoable)

1. Project scaffold, types, storage layer, seed data.
2. `geo.ts` + `selection.ts` with unit-testable pure functions.
3. Location provider interface + **simulator first** (you can't test anything else
   without it at a desk), then real provider.
4. MapView wrapper.
5. Screens in flow order: Time Input → Suggestion → Active Walk → Summary → History.
6. Resume-on-reload, edge cases.
7. SimulatorPanel polish, SIM badge.
8. README + run the demo script twice.

If time runs short, cut in this order: History screen detail view → pace stat →
simulator noise toggle → path wobble (fall back to straight line). Never cut the
simulator itself, arrival detection, or the summary.
```
