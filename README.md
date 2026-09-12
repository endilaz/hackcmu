# Spare Walk

College students have odd 20–60 minute gaps between commitments. Spare Walk asks how
many free minutes you have, reads your location, and picks **one** nearby place you can
walk to and back in that time. It shows the destination on a map, then tracks the walk
live with browser geolocation — drawing your GPS trail and accumulating distance — until
it detects that you've arrived. Afterwards you get a summary of the walk, and the app
nudges you toward places you haven't been yet. No accounts, no backend, no API keys:
everything lives in your browser.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-checks with tsc, then builds to dist/
npm test         # unit tests for the geo / selection / tracking math
```

Browser geolocation needs a secure context. `localhost` counts, so the desktop flow
works with no extra setup.

### Running on a real phone (HTTPS)

A phone browser will refuse to give up GPS over plain `http://`, so pick one:

**Option A — HTTPS on the dev server**

```bash
npm install -D @vitejs/plugin-basic-ssl
```

Then in `vite.config.ts`:

```ts
import basicSsl from "@vitejs/plugin-basic-ssl";
export default defineConfig({ plugins: [react(), basicSsl()], server: { host: true } });
```

Run `npm run dev` and open the `https://<your-lan-ip>:5173` address it prints. You'll get
a self-signed-certificate warning — accept it.

**Option B — tunnel**

```bash
npx ngrok http 5173
```

Open the `https://` URL ngrok gives you. (Add `server.allowedHosts` in `vite.config.ts`
if Vite blocks the tunnel host.)

Neither is needed for the simulated desktop demo.

---

## The GPS simulator

The demo is recorded on a desktop browser with simulated GPS, so the simulator is a
real feature rather than a dev convenience. It implements the same `LocationProvider`
interface as real GPS (`src/location/LocationProvider.ts`), so the app never branches on
which one is active — they're swappable at runtime without a reload.

**Turn it on** either way:

- add `?sim=1` to the URL — e.g. `http://localhost:5173/?sim=1`, or
- toggle **Enabled** in the simulator drawer at the bottom of the screen.

The setting persists in `localStorage`. Whenever it's on, a **SIM** badge sits in the top
bar, so a recording is always honest about what it's showing.

**Drawer controls** (tap the handle at the bottom to expand):

| Control | What it does |
|---|---|
| Enabled | Switches between simulated and real GPS. Works mid-walk; the trail continues. |
| Start location | Lat/lng of the simulated walker. **Apply** only works when no walk is running. Defaults to the CMU Fence. |
| Speed | 1× / 4× / 10× / 30×. Default **10×**, which records a ~12-minute walk in ~72 seconds. |
| Auto-walk | On by default. Starting a walk generates a path to the destination and walks it. |
| Pause / Resume | Freezes emission (and the simulated clock). |
| Jump to arrival | Teleports next to the destination and fires arrival immediately. The demo's escape hatch. |
| Noise | Adds ~4 m Gaussian jitter and realistic accuracy values. On by default. |

### How simulated time works (the important part)

The simulator keeps **its own clock**, exposed as `provider.now()`. It emits one fix per
real second, but each emit advances the simulated clock by `1s × speed multiplier` and
moves the walker `1.35 m/s × multiplier` metres. So the implied speed is always a
walking 1.35 m/s, at every multiplier.

This matters for two reasons:

1. The trail filter rejects anything implying more than 3 m/s as a GPS jump. If the
   simulator emitted real-time timestamps at 10×, every single point would be discarded
   and the trail would never draw.
2. The summary reports a plausible "12 min, 1.2 km" instead of "1.2 km in 72 seconds."

Anything walk-related therefore reads `provider.now()`, never `Date.now()`.

---

## Where the knobs are

Every tunable number lives in **`src/constants.ts`**:

| Constant | Default | Meaning |
|---|---|---|
| `ROUND_TRIP` | `true` | A destination fits if there's time to walk there *and back*. Flip to `false` for one-way. |
| `DETOUR_FACTOR` | `1.3` | Straight-line distance is multiplied by this to approximate real streets. |
| `WALK_SPEED_MPS` | `1.35` | Assumed walking speed. |
| `ARRIVAL_RADIUS_M` | `40` | How close counts as arrived. |
| `ARRIVAL_CONSECUTIVE_POINTS` | `2` | Consecutive in-radius points needed, so one noisy fix can't end a walk. |
| `MAX_ACCURACY_M` | `50` | Fixes less precise than this are dropped. |
| `MIN_STEP_M` | `3` | Movement smaller than this is treated as standing-still jitter. |
| `MAX_SPEED_MPS` | `3.0` | Anything faster is treated as a GPS jump, not a step. |
| `MIN_DESTINATION_DISTANCE_M` | `75` | Closer than this and you're already there. |
| `SIM_*` | — | Simulator defaults: start point, speed options, noise, emit intervals. |

There is no routing API. Walk time is estimated as
`haversine × DETOUR_FACTOR / WALK_SPEED_MPS`.

---

## Adding destinations

Edit **`src/data/destinations.ts`** and add an entry:

```ts
{
  id: "my-place",          // stable slug; used to track "visited"
  name: "My Place",
  lat: 40.4428,
  lng: -79.9430,
  blurb: "One or two sentences on why it's worth the walk.",
  category: "park",        // optional free text
}
```

Nothing else needs changing — selection, the exploration counter and history all read
from this list. Verify coordinates against OpenStreetMap rather than guessing:

```bash
curl -A "sparewalk/1.0" \
  "https://nominatim.openstreetmap.org/search?q=Phipps+Conservatory+Pittsburgh&format=json&limit=3"
```

Nominatim allows one request per second. It will also happily return a same-named place
in another state, so check the returned neighbourhood.

### Coordinate provenance

All 16 seeded destinations were verified against OpenStreetMap Nominatim on
2026-09-12, with one exception, also flagged in the file itself:

- **`westinghouse-memorial`** — OSM has no node tagged as the Westinghouse Memorial
  monument. The entry uses the adjacent, explicitly named "Westinghouse Pond"
  (OSM way 27574440) as a proxy; the bronze memorial sits immediately beside it.

---

## How it's built

- **Vite + React + TypeScript**, plain `leaflet` (not react-leaflet), plain CSS.
- **Leaflet + OpenStreetMap** raster tiles. No API key, no token, no tile account.
- **No backend, no database, no accounts.** State is a single `localStorage` key,
  `sparewalk.state.v1`.

```
src/
  constants.ts                 every tunable number
  types.ts                     Destination, Walk, TrailPoint, AppState
  screenProps.ts               prop contracts for each screen
  useWalkMachine.ts            the state machine: transitions, persistence, providers
  App.tsx                      shell + screen routing
  data/destinations.ts         hand-curated seed list
  lib/geo.ts                   haversine, walk-time estimate, formatting
  lib/selection.ts             destination filtering and picking
  lib/tracking.ts              trail filtering, distance, arrival detection
  lib/storage.ts               localStorage with validation and throttled writes
  location/                    LocationProvider interface, real GPS, simulator
  components/                  MapView + the five screens + simulator panel
```

The pure logic in `lib/` is unit-tested (`npm test`) — that's where the walk-time
estimate, the exploration bias and the GPS noise filtering live.

---

## Roadmap / not in the MVP

Deliberately out of scope for this build:

- Heatmap of everywhere you've walked (walk history is already persisted for this)
- Calendar sync instead of typing your free minutes
- Friends, shared walks, leaderboards
- Points, badges, streaks
- Fitness-tracker and health-API integration; step counting; calories
- Turn-by-turn walking directions (today's estimate is straight-line × a detour factor)
- A live Places API instead of a curated destination list
- Accounts and a backend, so history follows you between devices
- Resuming an in-progress walk after a page reload (an unfinished walk is discarded)
