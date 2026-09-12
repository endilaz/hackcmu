# Spare Walk — 3-minute demo script

**Track:** Travel · **Format:** live demo, pre-recorded screencast as backup
**Budget:** 180 s. Spoken content is ~420 words (~165 s at a calm 150 wpm), leaving ~15 s of slack for clicks and laughs.

Slide content is written inline under each beat. Build the deck from the `ON SLIDE` blocks; deliver the `SAY` blocks.

Everything in here is checked against the repo. Numbers you can defend are marked ✅. Nothing is invented — see [Facts you can defend](#facts-you-can-defend) at the bottom for provenance.

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
> # Spare Walk
> ### You have 30 minutes. Where can you actually go?
>
> `HackCMU · Travel track`

**SAY:**

> Between a 2:30 lecture and a 3:20 recitation you've got half an hour. Too short to plan anything — so you scroll.
>
> Every travel app asks *where do you want to go.* Spare Walk asks the only question that actually matters: **how much time do you have?**

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

*(Home screen. The 116 px serif numeral is the whole screen. Point at the **SIM** badge in the top bar.)*

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
> | Destination | Round trip |
> |---|---|
> | Cathedral of Learning | 28.2 min |
> | Schenley Plaza | 26.0 min |
> | Panther Hollow Lake | 25.5 min |
>
> All three are landmarks a Pittsburgh judge will recognise, which is why 30 is the number to demo. Read the card, don't recite a rehearsed name.

### Beat 3c — the walk drawing · 1:01–1:29

*(Tap start. The trail begins drawing. Let it run — this is the money shot. Say nothing for the first ~3 s.)*

**SAY:**

> Now it's tracking. That trail is real GPS fixes accumulating, one per second, at ten times speed — so a thirteen-minute walk draws in about eighty seconds.
>
> And every fix goes through a filter before it's allowed on that line. Anything less accurate than fifty metres, any step under three metres, anything implying faster than three metres per second — all dropped. Without that, standing still turns your trail into a scribble and your distance is just wrong.

*(Live stats are updating: Walked / Elapsed / To go.)*

### Beat 3d — arrival + summary · 1:29–1:54

*(Open the simulator drawer, hit **Jump to arrival**. Say this while you do it — don't do it silently.)*

**SAY:**

> I'll skip us to the end. And arrival isn't a button I'm pressing — it fires on its own when two consecutive clean fixes land within forty metres. One noisy fix can't end your walk.

*(Summary screen lands: Distance / Time / Avg pace + the collectible badge.)*

> Distance, time, pace — and a badge you actually keep.

*(Tap through to the pinboard. Drag one badge. ~4 s, no narration — let it breathe.)*

---

## 4 · Under the hood — 1:54–2:27

> **ON SLIDE 3**
>
> ### No LLM. No backend. No API keys.
>
> - Haversine × 1.3 detour ÷ 1.35 m/s
> - GPS noise filter: accuracy · step · implied speed
> - One `LocationProvider` — real GPS and sim, swappable at runtime
> - The simulator runs **its own clock**
>
> **55 unit tests** · ~5,000 lines TypeScript

**SAY:**

> There's no language model in this, and no server. The hard part was geospatial.
>
> Haversine distance, inflated by a detour factor to approximate real streets, over walking speed. An exploration bias that prefers places you haven't been. That noise filter.
>
> And real GPS and the simulator implement **one interface** — swappable at runtime, the app never branches on which is live. The simulator even runs its own clock, because at ten-x, real timestamps make every fix look like a sprint and the filter would drop every single one of them.
>
> Fifty-five unit tests over that math.

*(The clock detail is the best answer to "is this a wrapper?" — it's a bug that only exists if you actually built the thing. If you're running long, cut the exploration-bias clause, not this one.)*

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
> # Spare Walk
> ### Runs entirely in your browser. No account.
>
> *The friends leaderboard is seeded demo data — and the app says so, on screen.*

**SAY:**

> The whole thing runs in your browser off one localStorage key. No account, no sign-up.
>
> The friends leaderboard is seeded demo data, and the app says so on screen in a banner you can't dismiss — we'd rather show you the honest version.
>
> Spare Walk. Go outside.

---

## Pre-flight checklist

Run through this in the ten minutes before you're called.

- [ ] `npm run dev`, open `http://localhost:5173/?sim=1`
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
| Map tiles don't load (venue wifi) | OSM tiles are the one network dependency. Say so, switch to the recording. |
| Walk stalls mid-route | **Jump to arrival**. It's a product feature, not a rescue — no need to apologise. |
| Anything worse | Second tab, play the recording, narrate the same script over it. Nothing above changes. |

---

## Q&A prep

**"Isn't this just a maps app?"**
Maps answers *how do I get to X.* This answers *what is X,* given a time budget — and commits to one answer. There's no routing API at all; walk time is straight-line distance × 1.3 ÷ 1.35 m/s.

**"Why only 16 destinations? Why not a Places API?"**
Deliberate. A curated list means every entry has a reason to walk there written by a human, and the app works offline with no key and no quota. A live Places API is on the roadmap ✅.

**"Are the OSM coordinates really verified?"**
Yes, all 16 against Nominatim on 2026-09-12 — with one documented exception you should volunteer if pushed: `westinghouse-memorial` uses the adjacent, explicitly named Westinghouse Pond (OSM way 27574440) as a proxy, because OSM has no node for the monument itself. It's flagged in the source file and in the README ✅. **Volunteering this makes you more credible, not less.**

**"What's actually hard here?"**
The provider abstraction and its clock (Beat 4). Also: arrival needs two consecutive in-radius fixes specifically so one noisy fix can't end a walk, and streaks use *local* calendar days rather than UTC, which is the bug every streak feature ships with.

**"What doesn't work?"** — answer plainly, it scores better than dodging ✅
- Calendar import doesn't handle recurring events; `TZID` times are read as local wall-clock; all-day events are skipped on purpose so they don't swallow the day.
- An in-progress walk is discarded on page reload.
- Friends are seeded — there's no server to sync with.
- No step counting, no health-API integration, no turn-by-turn directions.

**"How long did this take?"**
Roughly eight hours — first commit 04:27, last 12:19, same day ✅.

---

## Facts you can defend

Every ✅ above, with where it comes from. Don't cite a number that isn't on this list.

| Claim | Source |
|---|---|
| 16 destinations | `src/data/destinations.ts` |
| 55 tests, 7 files, all passing | `npm test`, verified |
| ~5,000 lines TS/TSX (+929 test) | `wc -l` over `src/` |
| Detour 1.3 · speed 1.35 m/s · round-trip on | `src/constants.ts` |
| Filter: 50 m accuracy · 3 m step · 3 m/s | `src/constants.ts`, `src/lib/tracking.ts` |
| Arrival: 40 m × 2 consecutive fixes | `src/constants.ts`, `src/lib/tracking.ts` |
| Picks among the 3 longest that still fit | `TOP_CANDIDATE_POOL`, `src/lib/selection.ts` |
| Unvisited destinations preferred | `src/lib/selection.ts` |
| Sim: own clock, 10× default, 1 emit/s | `src/location/SimulatedLocationProvider.ts` |
| One `LocationProvider`, no branching | `src/location/LocationProvider.ts` |
| No backend · one localStorage key | `sparewalk.state.v1`, `src/constants.ts` |
| Leaflet + OSM tiles, no API key | `package.json`, `TILE_URL` in `src/components/MapView.tsx` |
| `.ics` parsed in-browser, gaps found | `src/lib/ics.ts` |
| 8 badges · points = 10/walk + 1/100 m + 25/place | `src/lib/achievements.ts` |
| Streaks use local calendar days | `src/lib/achievements.ts` |
| Friends are seeded, banner is undismissable | `src/data/friends.ts`, `src/components/FriendsScreen.tsx` |
| Round-trip times from the Fence | computed via `haversineMeters` + `estimateWalkMinutes` |

---

## Cut list, if you're over time

Cut in this order — each is a clean removal, no rewrites:

1. The reroll clause in Beat 3b (−5 s)
2. The pinboard drag at the end of Beat 3d (−4 s)
3. "An exploration bias that prefers places you haven't been" in Beat 4 (−5 s)
4. The banner sentence in Beat 6 (−6 s) — *last resort; the honesty plays well*

**Never cut:** the SIM badge callout (3a), the noise filter (3c), or the simulator clock (4). Those three are the entire *Technical Difficulty* score.
