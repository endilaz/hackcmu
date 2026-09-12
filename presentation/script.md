# Walkable — 3-minute demo script

**Track:** Travel · **Format:** live demo, pre-recorded screencast as backup
**Budget:** 180 s. Spoken content is ~440 words (~175 s at a calm 150 wpm), leaving ~5 s of slack.

Slide content is written inline under each beat. Build the deck from the `ON SLIDE` blocks; deliver the `SAY` blocks.

Everything in here is checked against the repo. Numbers you can defend are marked ✅. Nothing is invented — see [Facts you can defend](#facts-you-can-defend) at the bottom for provenance, and [Technical deep-dive](#technical-deep-dive) for the detail behind every claim you make on stage.

> **Naming:** the project is **Walkable**. Internal identifiers still read `sparewalk.*` (the localStorage keys, the header comment in `constants.ts`) — that's a rename that didn't touch storage keys on purpose, since changing them would wipe the demo history. If a judge notices, that's the answer.

---

## Running order

| # | Beat | Time | Runs |
|---|---|---|---|
| 1 | Hook | 0:00–0:19 | Slide |
| 2 | What it does | 0:19–0:36 | Slide |
| 3 | **Live demo** | 0:36–1:54 | App |
| 4 | Under the hood | 1:54–2:27 | Slide |
| 5 | Travel track + calendar | 2:27–2:49 | Slide |
| 6 | Close | 2:49–3:00 | Slide |

The demo is 78 s — the single largest block — because *Demo Quality* is its own rubric column and the thing is genuinely fun to watch draw.

---

## 1 · Hook — 0:00–0:19

> **ON SLIDE 1**
>
> # Walkable
> ### You have 30 minutes. Where can you actually go?
>
> `HackCMU · Travel track`

**SAY:**

> Between a 3:20 lecture and a 4:00 recitation you've got half an hour. Too short to plan anything — so you scroll.
>
> Every travel app asks *where do you want to go.* Walkable asks the only question that actually matters: **how much time do you have?**

*(Beat. Let the inversion land — it's the originality claim, and it's the whole pitch.)*

---

## 2 · What it does — 0:19–0:36

> **ON SLIDE 2**
>
> ### Three steps
>
> **Minutes** → **One place** → **Walk tracked**
>
> *Not a list. One.*

**SAY:**

> You give it your free minutes. It picks **one** place — not a list, one — that you can walk to and back inside that gap. Then it tracks the walk live on GPS until it detects you've arrived.
>
> Let me just show you.

*(Switch to the browser. Have it already on `localhost:5173/?sim=1`, home screen, nothing tapped.)*

---

## 3 · Live demo — 0:36–1:54

### Beat 3a — the home screen · 0:36–0:48

*(Home screen. The hero serif numeral is the whole screen. Point at the **SIM** badge in the top bar.)*

**SAY:**

> This is the home screen — one number, how long I've got. I'm on a laptop, so GPS is simulated. That's the **SIM** badge, top right. It's the same code path as real GPS; I'll come back to why that matters.

*(Drag the slider to **30**.)*

> Thirty minutes.

> **Say the simulator out loud.** Judges who spot an unannounced fake demo stop trusting everything else. Judges who are *told* about the simulator and then hear the architecture behind it in Beat 4 count it as engineering. The badge is in the product for exactly this reason.

### Beat 3b — the suggestion · 0:48–1:01

*(Tap the primary button. Suggestion screen: map + floating paper card with the destination, One way / Round trip / Kind.)*

**SAY:**

> [**Read whatever it picked.**] — thirteen minutes each way, twenty-six round trip, inside my thirty. And notice it picked the *longest* walk that still fits. A gap is for using, not for saving. If you don't like it, there's a reroll — it'll pick something you haven't been to yet.

> ⚠️ **Do not hardcode the destination name.** At 30 free minutes from the CMU Fence the app picks at random from the three longest walks that still fit ✅:
> | Destination | Straight-line | Round trip |
> |---|---|---|
> | Cathedral of Learning | 878 m | 28.2 min |
> | Schenley Plaza | 809 m | 26.0 min |
> | Panther Hollow Lake | 795 m | 25.5 min |
>
> All three are landmarks a Pittsburgh judge will recognise, which is why 30 is the number to demo. Read the card, don't recite a rehearsed name.

### Beat 3c — the walk drawing · 1:01–1:29

*(Tap start. The trail begins drawing over the route line. Let it run — this is the money shot. Say nothing for the first ~3 s.)*

**SAY:**

> Now it's tracking. The pale line is the route; the dark line drawing over it is where I've actually walked — real GPS fixes accumulating one per second at ten times speed, so a thirteen-minute walk draws in about eighty seconds.
>
> And every fix has to get past a filter first. Worse than fifty metres of accuracy — dropped. Under three metres of movement — dropped, that's you standing still. Faster than three metres per second — dropped, that's a GPS jump, not a step. Without those three, standing still turns your trail into a scribble and your distance is just wrong.

*(Live stats are updating: Walked / Elapsed / To go.)*

### Beat 3d — arrival + summary · 1:29–1:54

*(Open the simulator drawer, hit **Jump to arrival**. Say this while you do it — don't do it silently.)*

**SAY:**

> I'll skip us to the end. And arrival isn't a button I'm pressing — it fires on its own when two consecutive *accepted* fixes land within forty metres. One noisy fix can't end your walk.

*(Summary screen lands: Distance / Time / Avg pace + the collectible badge.)*

> Distance, time, pace — and a badge you actually keep.

*(Tap through to the pinboard. Drag one badge. ~4 s, no narration — let it breathe.)*

---

## 4 · Under the hood — 1:54–2:27

> **ON SLIDE 3**
>
> ### No LLM. No backend. No accounts.
>
> - Ranking is **local**: haversine × 1.3 detour ÷ 1.35 m/s — zero API calls
> - GPS filter: accuracy · step · implied speed
> - Arrival: 40 m × 2 consecutive accepted fixes
> - One `LocationProvider` — real GPS and sim, swappable mid-walk
> - The simulator runs **its own clock**
>
> **57 unit tests** · ~5,400 lines TypeScript

**SAY:**

> There's no language model in this and no server. The hard part was geospatial.
>
> Ranking sixteen destinations against your time budget is pure local math — haversine distance, inflated by a detour factor for real streets, over walking speed — so finding you a suggestion costs zero API calls. We only ask Mapbox for a real pedestrian route once you've picked one.
>
> And real GPS and the simulator implement **one interface**, swappable at runtime — the app never branches on which is live. The simulator even runs its own clock, because at ten-x, real timestamps make every fix look like a sprint, and that filter I just described would drop every single point.
>
> Fifty-seven unit tests over that math.

*(The clock detail is the best answer to "is this a wrapper?" — it's a bug that only exists if you actually built the thing. If you're running long, cut the Mapbox sentence, not this one.)*

---

## 5 · Travel track + calendar — 2:27–2:49

> **ON SLIDE 4**
>
> ### Travel, at the scale you have time for
>
> - **16 destinations**, Oakland & Schenley
> - Every coordinate verified against **OpenStreetMap**
> - Drop in a calendar export → it finds today's gaps
> - Parsed in the browser. Nothing uploaded. No OAuth.

**SAY:**

> For the travel track: this is travel at the scale you actually have time for. Sixteen destinations around Oakland and Schenley, and every single coordinate was checked against OpenStreetMap rather than guessed.
>
> And you don't even have to type your gap. Drop in a calendar export and it finds today's gaps between your commitments and hands them to you as one-tap choices. Parsed entirely in the browser — nothing uploaded, no OAuth, works offline.

---

## 6 · Close — 2:49–3:00

> **ON SLIDE 5**
>
> # Walkable
> ### Runs entirely in your browser. No account.
>
> *The friends leaderboard is seeded demo data — and the app says so, on screen.*

**SAY:**

> The whole thing runs in your browser off one localStorage key. No account, no sign-up.
>
> The friends leaderboard is seeded demo data, and the app says so on screen in a banner you can't dismiss — we'd rather show you the honest version.
>
> Walkable. Go outside.

---

## Technical deep-dive

Not spoken. This is what you pull from when a judge pushes on any claim in Beat 4. Each block names the file, so you can open it if they ask to see it.

### 1 · Destination selection — `src/lib/selection.ts`

Ranking never touches the network. For each of the 16 destinations: haversine metres → `estimateWalkMinutes` (`× DETOUR_FACTOR 1.3 ÷ WALK_SPEED_MPS 1.35`) → doubled, because `ROUND_TRIP` is on.

The picker is more careful than "filter and sort":

- Destinations under **75 m** (`MIN_DESTINATION_DISTANCE_M`) are dropped — you're already there. This is what keeps the Fence itself out of the results when the Fence is your start point.
- Unvisited destinations are preferred **before** the top-N cut, not after: the pool is filtered to unvisited ones, and only falls back to the full candidate list if you've been everywhere that fits.
- It then picks uniformly among the **3 longest** that still fit (`TOP_CANDIDATE_POOL`) — deliberate variety, so two people with the same gap don't get the same answer.
- **Reroll wrap-around:** rerolling accumulates an exclude list. When exclusions empty the candidate pool, it clears them and re-picks rather than dead-ending, and reports `excludesReset` so the UI can forget the exclusions too.
- **Nothing fits at all** (say, 5 free minutes): rather than returning null and showing an empty screen, it falls back to the *nearest* eligible destination and returns `overBudget` with `overByMinutes`, so the UI can say "this one's 4 minutes over" instead of "no results".

### 2 · The GPS filter and arrival — `src/lib/tracking.ts`

`acceptFix` is a pure reducer: `(state, fix, destination) → { state, accepted, arrived }`. Three rejection rules, in order:

| Rule | Threshold | Why |
|---|---|---|
| Accuracy | `> 50 m` → drop | An urban-canyon fix that could be a block away |
| Step size | `< 3 m` from last accepted point → drop | Standing still. Without this, jitter accumulates as real distance |
| Implied speed | `> 3.0 m/s` → drop | A jump between cell-tower fixes, not a walk |

The subtle part: **distance only accumulates over accepted points**, and arrival is only evaluated on accepted points. A rejected fix advances nothing — so a burst of garbage can neither inflate your distance nor end your walk. Arrival needs `ARRIVAL_CONSECUTIVE_POINTS = 2` consecutive accepted fixes inside 40 m, and the counter **resets to zero** on any accepted fix outside the radius — it's a consecutive run, not a tally.

### 3 · The provider abstraction — `src/location/LocationProvider.ts`

One interface: `kind`, `now()`, `start(onFix, onError)`, `stop()`. Real GPS wraps `navigator.geolocation.watchPosition`; the simulator implements the same four members plus demo controls. `useWalkMachine` holds both instances and selects one — **no `if (sim)` anywhere in app code, screens, or the tracker.**

`now()` is the part that makes it work rather than just look tidy. Everything walk-related — `startedAt`, `endedAt`, the live elapsed clock — reads `provider.now()`, never `Date.now()`.

You can toggle the simulator **mid-walk**: the current position is carried into the simulator, the walk is re-issued against the new provider, and the trail continues rather than restarting.

### 4 · The simulator's clock — `src/location/SimulatedLocationProvider.ts`

One `setInterval` at 1 Hz of **real** time. Each tick advances the **simulated** clock by `1000 ms × multiplier` and moves the walker `1.35 m/s × multiplier × 1 s`. Both scale by the multiplier, so the implied speed between consecutive fixes is *always exactly 1.35 m/s* — at 1×, at 10×, at 30×.

That invariant is the whole trick. Emit real timestamps at 10× and each fix implies 13.5 m/s, the filter's 3 m/s rule rejects **every single point**, and the trail never draws at all. It also means the summary reads "12 min, 1.2 km" instead of "1.2 km in 72 seconds".

Two more details worth having ready:

- **Noise is applied only to the emitted fix, never to the walker's true position** — otherwise jitter feeds back into the path and the walker drifts off-route over a few hundred ticks. Jitter is a Box–Muller Gaussian sample at σ = 4 m, with a reported accuracy of 8–20 m.
- **The clock only advances on ticks that actually emit**, and never while paused — so pausing the sim freezes elapsed time instead of silently racking up minutes.

### 5 · "Jump to arrival" is harder than it looks — same file

It can't just teleport onto the destination: a single point can't trigger arrival (that needs two consecutive), and two points 0 m apart are rejected as standing-still jitter. So it synthesises two fixes that must satisfy **three constraints at once** — both within 40 m of the destination, more than 3 m apart, and no more than 3 m/s apart given the simulated time between them.

At 1× speed one tick's worth of simulated time (1 s) allows at most 3 m of movement, which collides with the 3 m minimum step. So it spends as many ticks' worth of simulated time as the gap needs (up to 20), then places both points along the current bearing to the destination so the jump reads as the last few steps rather than a teleport from nowhere.

### 6 · Routing and route-trimming — `src/lib/directions.ts`, `src/useWalkingRoute.ts`

Once you pick a destination, Mapbox Directions returns the walking geometry, distance and duration. Two things we had to get right:

- **Route trimming.** `progressAlongRoute` projects your position onto the closest route segment — point-to-segment projection in a local equirectangular frame, longitude scaled by `cos(latitude)`, the parameter clamped to `[0, 1]` so you project onto the segment rather than its infinite extension — then returns only the geometry *ahead* of you, plus remaining distance and perpendicular off-route distance. That's why the route shortens as you walk instead of sitting there as a static line.
- **Not re-requesting per fix.** The naive version fires a Directions request on every GPS fix — one per second. The hook deliberately omits `from` from its dependency array and re-requests only when off-route distance exceeds **45 m**, so one walk is one or two requests. In-flight requests are cancelled with an `AbortController` when the destination changes.

If the token is missing or the request fails, the app keeps the local straight-line estimate and the walk flow is unaffected — routing is an enhancement, not a dependency.

### 7 · Calendar import — `src/lib/ics.ts`

A deliberately forgiving RFC 5545 subset: line unfolding (continuation lines starting with space/tab), `NAME;PARAM=X:value` split on the *first* colon only, and `try/catch` around the whole parse so a malformed file yields zero gaps instead of a crash.

Gap-finding merges overlapping and back-to-back events first — without that, two overlapping meetings produce a bogus negative gap. Gaps shorter than 5 minutes are dropped, and there's no trailing gap after your last event, because an open-ended evening isn't a gap between commitments.

### 8 · Streaks use local calendar days — `src/lib/achievements.ts`

The day key is built from local `getFullYear/getMonth/getDate`, **not** `toISOString`. Using UTC fields shifts any walk before 8 PM Eastern into the next day and silently breaks the streak for everyone west of UTC. Those local y/m/d values go into `Date.UTC` purely to get an integer that increments once per local day — never rendered, never compared to a real UTC time, so DST can't skew it.

`now` is a parameter, not `Date.now()` inside the function, so tests can pin "today" instead of being time-dependent.

---

## Challenges we overcame

Four things that actually broke, and what fixing them required. These are the best material for *Technical Difficulty* — every one of them is in the git history.

### "L.heatLayer is not a function"

`leaflet.heat` predates ES modules: it attaches itself to a **global `L`** rather than importing Leaflet. Under Vite there is no such global, so it throws `L is not defined`. The obvious fix — assign the `import * as L` namespace object to `globalThis.L` — fails in a much worse way: **module namespace objects are non-extensible per spec**, so the plugin's `L.heatLayer = ...` silently does nothing and you get `L.heatLayer is not a function` at the call site instead, with no error at import time.

The fix (`src/lib/globalLeaflet.ts`) hands the plugin Leaflet's CJS interop `default` export, which *is* the real extensible object, and `lib/heat.ts` reads `heatLayer` back off that same object — with an explicit throw if it didn't attach, so the next person gets a real message instead of "not a function". The import order in `heat.ts` is load-bearing and commented as such.

### React 19 StrictMode vs. an imperative map library

StrictMode mounts, cleans up and remounts every component in development. Leaflet throws `Map container is already initialized` on the second mount. Destroying the map in the effect cleanup isn't enough on its own — every cached layer ref (markers, polylines, the heat layer) has to be forgotten too, or the sync effect calls `setLatLng` on markers that no longer belong to any map.

Two related map problems, same file (`src/components/MapView.tsx`):

- **Leaflet's default marker images are broken by bundlers**, so every pin is a `divIcon` styled by existing CSS classes, each anchored at its own centre.
- **The container is often 0 px tall on first paint** inside a flex column that hasn't laid out yet, which renders as a blank grey map. Fixed with an `invalidateSize` on the next animation frame plus one on the next tick.

### Telling a user's drag apart from our own `setView`

Auto-follow has to stop when the user drags the map — otherwise you can't look anywhere else while a walk is running. But Leaflet fires `movestart`/`zoomstart` for **programmatic** moves too, so there's no event that means "the human did this".

The solution is a guard flag set immediately before any move we trigger and cleared once Leaflet settles on `moveend` — plus a timeout fallback, because a `setView` to where the map already is never fires `moveend` at all and would leave the guard stuck on forever. Double-tapping the map hands automatic control back.

### The simulator walked like it was drunk

The generated demo path wobbles perpendicular to the straight line so it doesn't look like a ruler. First attempt aimed to make the generated path's length actually match `DETOUR_FACTOR` (1.3×) — but a symmetric zigzag adds very little length, so hitting 1.3× needs roughly 50% amplitude, which on screen reads as a sawtooth, not a person.

The call: nothing in the app ever compares the generated path against `DETOUR_FACTOR` (it's only used to *estimate* time when suggesting), so wobble was cut to 10–25% of a leg and optimised for looking believable, landing around 1.05–1.15× straight-line. Commit `4f53afd`, and the reasoning is written into the constant so nobody "fixes" it back.

*(Since then the simulator prefers the real Mapbox route geometry when one is available, and only generates a synthetic path as a fallback — so in the demo you're usually watching it walk actual streets.)*

---

## Pre-flight checklist

Run through this in the ten minutes before you're called.

- [ ] `npm run dev`, open `http://localhost:5173/?sim=1`
- [ ] `.env.local` has a working `VITE_MAPBOX_ACCESS_TOKEN` — without it you lose the route line, though the walk still works
- [ ] **SIM** badge visible in the top bar
- [ ] Simulator drawer: **Enabled** on · **Speed 10×** · **Auto-walk** on · **Noise** on
- [ ] Start location = CMU Fence default (`40.4428, -79.943`) — if you moved it, hit **Apply** before any walk starts; Apply is ignored mid-walk
- [ ] Seed history first: complete 2–3 walks *before* presenting, so History, Progress, Friends and the pinboard aren't empty shelves
- [ ] Browser zoom at 100%, laptop display mirrored, notifications off
- [ ] `.ics` file on the desktop in case a judge asks to see calendar import
- [ ] Backup screencast open in a second tab, paused at frame 0

---

## If the live demo dies

| Failure | Do this |
|---|---|
| Trail won't draw | Check speed is 10× and noise is on. Don't debug on stage — **Jump to arrival**, keep talking. |
| Route line missing | Mapbox token problem. Say "routing's an enhancement, the walk math is local" — it's true — and carry on. |
| Map tiles don't load (venue wifi) | OSM tiles are the one hard network dependency. Say so, switch to the recording. |
| Walk stalls mid-route | **Jump to arrival**. It's a product feature, not a rescue — no need to apologise. |
| Anything worse | Second tab, play the recording, narrate the same script over it. Nothing above changes. |

---

## Q&A prep

**"Isn't this just a maps app?"**
Maps answers *how do I get to X.* This answers *what is X,* given a time budget — and commits to one answer. The selection math is entirely local: straight-line distance × 1.3 ÷ 1.35 m/s, no API call. Mapbox only draws the route for the one destination you've already accepted.

**"Why only 16 destinations? Why not a Places API?"**
Deliberate. A curated list means every entry has a reason to walk there written by a human, and selection works offline with no key and no quota. A live Places API is on the roadmap ✅.

**"Are the OSM coordinates really verified?"**
Yes, all 16 against Nominatim on 2026-09-12 — with one documented exception you should volunteer if pushed: `westinghouse-memorial` uses the adjacent, explicitly named Westinghouse Pond (OSM way 27574440) as a proxy, because OSM has no node for the monument itself. It's flagged in the source file and in the README ✅. **Volunteering this makes you more credible, not less.**

**"What's actually hard here?"**
Go to [Challenges we overcame](#challenges-we-overcame) — lead with the simulator clock or the `leaflet.heat` global. Then: arrival needs two consecutive *accepted* fixes so one noisy fix can't end a walk; route trimming is a point-to-segment projection, not nearest-vertex; and streaks use local calendar days rather than UTC, which is the bug every streak feature ships with.

**"How do you know the filter works if the demo is simulated?"**
The simulator emits Gaussian noise at σ = 4 m with realistic accuracy values, so the filter is doing real work on stage — points *are* being rejected during the demo. And `tracking.ts` is a pure function, unit-tested against hand-built fixes: a low-accuracy fix, a sub-3 m step, a 50 m teleport, and an arrival run that a noisy fix interrupts.

**"Could you swap in real GPS right now?"**
Yes — toggle **Enabled** off in the drawer, mid-walk, and the trail continues on real fixes. That's the point of the provider interface. (On a laptop you'll then get one fix and no movement, which is why the demo runs simulated.)

**"What doesn't work?"** — answer plainly, it scores better than dodging ✅
- Calendar import doesn't handle recurring events; `TZID` times are read as local wall-clock; all-day events are skipped on purpose so they don't swallow the day.
- An in-progress walk is discarded on page reload.
- Friends are seeded — there's no server to sync with.
- No step counting, no health-API integration, no turn-by-turn directions.

**"How long did this take?"**
Roughly ten hours — first commit 04:27, last 15:05, same day ✅.

---

## Facts you can defend

Every ✅ above, with where it comes from. Don't cite a number that isn't on this list.

| Claim | Source |
|---|---|
| 16 destinations | `src/data/destinations.ts` |
| 57 tests, 8 files, all passing | `npm test`, verified |
| ~5,400 lines TS/TSX (+968 test) | `wc -l` over `src/` |
| Detour 1.3 · speed 1.35 m/s · round-trip on | `src/constants.ts` |
| Filter: 50 m accuracy · 3 m step · 3 m/s | `src/constants.ts`, `src/lib/tracking.ts` |
| Arrival: 40 m × 2 consecutive accepted fixes | `src/constants.ts`, `src/lib/tracking.ts` |
| Picks among the 3 longest that still fit | `TOP_CANDIDATE_POOL`, `src/lib/selection.ts` |
| Unvisited preferred before the top-3 cut | `src/lib/selection.ts` |
| Over-budget fallback to nearest, with `overByMinutes` | `src/lib/selection.ts` |
| Round-trip times from the Fence (878 m / 809 m / 795 m) | `haversineMeters` + `estimateWalkMinutes`, computed |
| Sim: own clock, 10× default, 1 emit/s, σ = 4 m noise | `src/location/SimulatedLocationProvider.ts` |
| Implied speed always 1.35 m/s at any multiplier | same file, the time-model comment |
| One `LocationProvider`, no branching, swappable mid-walk | `src/location/LocationProvider.ts`, `src/useWalkMachine.ts` |
| Route trimming by point-to-segment projection | `progressAlongRoute`, `src/lib/directions.ts` |
| Re-route only past 45 m off-route | `REROUTE_DISTANCE_M`, `src/useWalkingRoute.ts` |
| Routing degrades to the local estimate | `src/useWalkingRoute.ts` |
| No backend · one localStorage key | `sparewalk.state.v1`, `src/constants.ts` |
| Leaflet + OSM tiles, no API key for tiles | `package.json`, `TILE_URL` in `src/components/MapView.tsx` |
| `.ics` parsed in-browser, overlapping events merged | `src/lib/ics.ts` |
| 8 badges · points = 10/walk + 1/100 m + 25/place | `src/lib/achievements.ts` |
| Streaks use local calendar days | `src/lib/achievements.ts` |
| Friends are seeded, banner is undismissable | `src/data/friends.ts`, `src/components/FriendsScreen.tsx` |
| `leaflet.heat` global-`L` fix | `src/lib/globalLeaflet.ts`, commit `8f5ab3c` |
| Simulator wobble reduced to 10–25% | `src/location/SimulatedLocationProvider.ts`, commit `4f53afd` |

---

## Cut list, if you're over time

Cut in this order — each is a clean removal, no rewrites:

1. The reroll clause in Beat 3b (−5 s)
2. The pinboard drag at the end of Beat 3d (−4 s)
3. The Mapbox sentence in Beat 4 (−8 s)
4. The route-line clause in Beat 3c — just say "real GPS fixes accumulating" (−6 s)
5. The banner sentence in Beat 6 (−6 s) — *last resort; the honesty plays well*

**Never cut:** the SIM badge callout (3a), the noise filter (3c), or the simulator clock (4). Those three are the entire *Technical Difficulty* score.
