# Walkable

**One-page summary · HackCMU · Travel track**
Built in ~10 hours (25 commits, 04:27 → 15:05, same day).

---

## The idea

Every travel app asks *where do you want to go*. Between a 2:30 lecture and a 3:20
recitation, that's the wrong question — the gap is too short to plan anything, so you
scroll instead.

Walkable asks the only question that matters: **how many minutes do you have?** Then it
picks **one** place you can walk to and back inside that gap, and tracks the walk live
until it detects you've arrived. One answer, not a list.

## The loop

1. **Minutes in** — type them, or drop in a calendar `.ics` export and it finds today's
   gaps between your commitments and offers them as one-tap choices.
2. **One place out** — the *longest* walk that still fits round-trip, biased toward
   places you haven't been yet. A gap is for using, not saving.
3. **The walk** — browser GPS draws your trail on the map and accumulates distance;
   arrival fires on its own, no button.
4. **After** — distance, time, pace, and a badge you keep. Walks feed a heatmap of
   everywhere you've been, streaks, and a leaderboard.

## What's actually hard here

No LLM, no backend, not a wrapper. The difficulty is geospatial:

- **GPS noise filtering.** Fixes are rejected on accuracy (>50 m), step size (<3 m) and
  implied speed (>3 m/s). Without it, standing still turns your trail into a scribble and
  your distance is simply wrong.
- **Arrival detection.** Two consecutive clean fixes within 40 m — so one noisy fix can't
  end your walk early.
- **One `LocationProvider` interface** for real GPS and the demo simulator, swappable at
  runtime; the app never branches on which is live. The simulator runs **its own clock**,
  because at 10× playback real timestamps make every fix look like a sprint and the noise
  filter would discard every single point.
- **Zero-API-call candidate ranking** — haversine × 1.3 detour ÷ 1.35 m/s ranks all
  destinations locally. Mapbox Directions is called only for the chosen route, and the
  app falls back to its local estimate if routing is unavailable.

**57 unit tests across 8 files, all passing.** ~5,400 lines of TypeScript (+970 test),
Leaflet and plain CSS — no UI framework, no component library.

## Travel-track relevance

Travel at the scale a student actually has. 16 curated destinations around Oakland and
Schenley, **every coordinate verified against OpenStreetMap Nominatim** — with one
documented proxy (the Westinghouse Memorial has no OSM node, so it uses the adjacent,
explicitly named Westinghouse Pond). Calendar files are parsed entirely in the browser:
nothing uploaded, no OAuth, no account, works offline.

## What we're honest about

- The laptop demo runs on **simulated GPS**, and a **SIM** badge sits in the product's
  own top bar so a recording can't quietly misrepresent itself.
- The friends leaderboard is **seeded demo data** — there's no server to sync with — and
  the app says so in a banner you can't dismiss. Your own numbers on it are real.
- Calendar import skips all-day events and doesn't handle recurring events or timezone
  conversion. An in-progress walk is discarded on reload.

## Run it

```bash
npm install && npm run dev      # http://localhost:5173/?sim=1  for the simulated demo
npm test                        # 57 tests over the geo / selection / tracking math
```

No backend, no database, no accounts — all state is one `localStorage` key.
