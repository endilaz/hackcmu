import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GPS_TIMEOUT_MS,
  MAX_FREE_MINUTES,
  MIN_FREE_MINUTES,
} from "./constants";
import { FRIENDS } from "./data/friends";
import { DESTINATIONS } from "./data/destinations";
import { computeBadges, computeStats } from "./lib/achievements";
import { buildLeaderboard } from "./lib/social";
import { haversineMeters } from "./lib/geo";
import { progressAlongRoute } from "./lib/directions";
import { pickDestination, type Suggestion } from "./lib/selection";
import {
  loadSim,
  loadState,
  newId,
  saveSim,
  saveState,
  type SimPersisted,
} from "./lib/storage";
import { acceptFix, initTracker, type TrackerState } from "./lib/tracking";
import type {
  Fix,
  LocationError,
  LocationProvider,
  SimSettings,
} from "./location/LocationProvider";
import { RealLocationProvider } from "./location/RealLocationProvider";
import { SimulatedLocationProvider } from "./location/SimulatedLocationProvider";
import type { Tab } from "./screenProps";
import type { AppState, Destination, LatLng, Walk } from "./types";
import { useWalkingRoute } from "./useWalkingRoute";

export type Screen =
  | "time"
  | "suggestion"
  | "active"
  | "summary"
  | "history"
  | "historyDetail"
  | "achievements"
  | "calendar"
  | "friends";

/**
 * Which tab a screen belongs to. The focused flows (suggestion, active walk,
 * summary, calendar import) all live under Walk, so the tab bar never loses
 * its place while you're mid-loop.
 */
const TAB_FOR_SCREEN: Record<Screen, Tab> = {
  time: "walk",
  suggestion: "walk",
  active: "walk",
  summary: "walk",
  calendar: "walk",
  history: "history",
  historyDetail: "history",
  achievements: "progress",
  friends: "friends",
};

/** Screens that are places you browse, rather than one-decision flows. */
const TABBED_SCREENS: ReadonlySet<Screen> = new Set<Screen>([
  "time",
  "history",
  "achievements",
  "friends",
]);

function clampMinutes(m: number): number {
  if (!Number.isFinite(m)) return MIN_FREE_MINUTES;
  return Math.min(MAX_FREE_MINUTES, Math.max(MIN_FREE_MINUTES, Math.round(m)));
}

/** ?sim=1 forces the simulator on, regardless of what was persisted. */
function simForcedByUrl(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("sim") === "1";
  } catch {
    return false;
  }
}

/**
 * The whole app state machine. Screens are presentational; every transition,
 * every provider swap and every write to localStorage happens here.
 */
export function useWalkMachine() {
  const initialSim = useMemo<SimPersisted>(() => {
    const persisted = loadSim();
    return simForcedByUrl() ? { ...persisted, enabled: true } : persisted;
  }, []);
  // No resume-on-reload: an unfinished walk from a previous session is dropped.
  const initialState = useMemo<AppState>(
    () => ({ ...loadState(), activeWalk: null }),
    [],
  );

  const [appState, setAppState] = useState<AppState>(initialState);
  const [screen, setScreen] = useState<Screen>("time");
  const [minutes, setMinutesRaw] = useState(30);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [user, setUser] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [slowFix, setSlowFix] = useState(false);
  const [locError, setLocError] = useState<LocationError | null>(null);
  const [summaryWalk, setSummaryWalk] = useState<Walk | null>(null);
  const [detailWalkId, setDetailWalkId] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [simEnabled, setSimEnabled] = useState(initialSim.enabled);
  const [simSettings, setSimSettings] = useState<SimSettings>(initialSim);
  const [simPaused, setSimPaused] = useState(false);
  const [providerRunning, setProviderRunning] = useState(false);

  // appStateRef mirrors appState so transitions can compute the next state
  // synchronously (and persist it) without doing side effects inside a setState
  // updater, which StrictMode may invoke twice.
  const appStateRef = useRef(appState);
  appStateRef.current = appState;

  const trackerRef = useRef<TrackerState>(initTracker());

  const realRef = useRef<RealLocationProvider | null>(null);
  const simRef = useRef<SimulatedLocationProvider | null>(null);
  if (realRef.current === null) realRef.current = new RealLocationProvider();
  if (simRef.current === null) {
    simRef.current = new SimulatedLocationProvider(initialSim);
  }

  const provider: LocationProvider = simEnabled
    ? simRef.current
    : realRef.current;
  const providerRef = useRef(provider);
  providerRef.current = provider;

  const destinationsById = useMemo(() => {
    const map: Record<string, Destination> = {};
    for (const d of DESTINATIONS) map[d.id] = d;
    return map;
  }, []);

  const activeDestination = appState.activeWalk
    ? destinationsById[appState.activeWalk.destinationId]
    : undefined;

  const routeDestination = screen === "suggestion"
    ? suggestion?.destination ?? null
    : screen === "active"
      ? activeDestination ?? null
      : null;
  const walkingRouteState = useWalkingRoute(user, routeDestination);
  const walkingRoute = walkingRouteState.route;
  const routeProgress = useMemo(
    () => walkingRoute && user ? progressAlongRoute(walkingRoute, user) : null,
    [walkingRoute, user],
  );

  // --- persistence helpers -------------------------------------------------

  const commit = useCallback((next: AppState) => {
    appStateRef.current = next;
    setAppState(next);
    saveState(next);
  }, []);

  // --- walk completion -----------------------------------------------------

  const finishWalk = useCallback(
    (arrived: boolean) => {
      const current = appStateRef.current;
      const walk = current.activeWalk;
      if (!walk) return;
      const ended: Walk = {
        ...walk,
        endedAt: providerRef.current.now(),
        status: arrived ? "completed" : "abandoned",
        arrived,
      };
      const visited =
        arrived && !current.visitedDestinationIds.includes(walk.destinationId)
          ? [...current.visitedDestinationIds, walk.destinationId]
          : current.visitedDestinationIds;
      commit({
        ...current,
        walks: [...current.walks, ended],
        activeWalk: null,
        visitedDestinationIds: visited,
      });
      trackerRef.current = initTracker();
      simRef.current?.walkTo(null);
      setProviderRunning(false);
      setSummaryWalk(ended);
      setScreen("summary");
    },
    [commit],
  );

  // --- incoming fixes ------------------------------------------------------

  const handleFix = useCallback(
    (fix: Fix) => {
      setLocError(null);
      setUser({ lat: fix.lat, lng: fix.lng });

      const current = appStateRef.current;
      const walk = current.activeWalk;

      if (walk) {
        const dest = destinationsById[walk.destinationId];
        if (!dest) return;
        const result = acceptFix(trackerRef.current, fix, dest);
        trackerRef.current = result.state;
        if (result.accepted) {
          const updated: Walk = {
            ...walk,
            trail: result.state.trail,
            distanceMeters: result.state.distanceMeters,
          };
          // In-memory only - the finished walk is what gets persisted.
          const next = { ...current, activeWalk: updated };
          appStateRef.current = next;
          setAppState(next);
        }
        if (result.arrived) {
          const arrivedWalk: Walk = {
            ...walk,
            trail: result.state.trail,
            distanceMeters: result.state.distanceMeters,
          };
          appStateRef.current = { ...current, activeWalk: arrivedWalk };
          finishWalk(true);
        }
        return;
      }

      // Not walking: a fix while "Find me a walk" is pending opens the suggestion.
      if (locating) {
        setLocating(false);
        setSlowFix(false);
        const picked = pickDestination({
          from: { lat: fix.lat, lng: fix.lng },
          freeMinutes: minutes,
          destinations: DESTINATIONS,
          visitedIds: current.visitedDestinationIds,
          excludeIds: [],
        });
        setExcludeIds([]);
        setSuggestion(picked);
        setScreen("suggestion");
      }
    },
    [commit, destinationsById, finishWalk, locating, minutes],
  );

  const handleError = useCallback((err: LocationError) => {
    setLocError(err);
    setLocating(false);
    setSlowFix(false);
    setProviderRunning(false);
  }, []);

  // Keep the live callbacks in refs so changing them doesn't tear down and
  // restart the location watch on every render.
  const onFixRef = useRef(handleFix);
  onFixRef.current = handleFix;
  const onErrorRef = useRef(handleError);
  onErrorRef.current = handleError;

  useEffect(() => {
    if (!providerRunning) return;
    const p = providerRef.current;
    p.start(
      (fix) => onFixRef.current(fix),
      (err) => onErrorRef.current(err),
    );
    return () => p.stop();
  }, [providerRunning, simEnabled]);

  // "Still looking for you..." after GPS_TIMEOUT_MS without a fix.
  useEffect(() => {
    if (!locating) {
      setSlowFix(false);
      return;
    }
    const id = setTimeout(() => setSlowFix(true), GPS_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [locating]);

  // Live elapsed clock. Reads the PROVIDER's clock, so simulated walks report
  // simulated minutes rather than the handful of real seconds they took.
  useEffect(() => {
    if (screen !== "active") return;
    const tick = () => {
      const walk = appStateRef.current.activeWalk;
      if (walk) setElapsedMs(Math.max(0, providerRef.current.now() - walk.startedAt));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [screen]);

  // Persist simulator settings whenever they change.
  useEffect(() => {
    saveSim({ ...simSettings, enabled: simEnabled });
    simRef.current?.updateSettings(simSettings);
  }, [simSettings, simEnabled]);

  // --- actions -------------------------------------------------------------

  const setMinutes = useCallback((m: number) => setMinutesRaw(m), []);

  const findWalk = useCallback((overrideMinutes?: number) => {
    const m = clampMinutes(overrideMinutes ?? minutes);
    setMinutesRaw(m);
    setLocError(null);
    setSuggestion(null);
    setExcludeIds([]);
    setLocating(true);
    setProviderRunning(true);
  }, [minutes]);

  const reroll = useCallback(() => {
    if (!user || !suggestion) return;
    const nextExcludes = [...excludeIds, suggestion.destination.id];
    const picked = pickDestination({
      from: user,
      freeMinutes: minutes,
      destinations: DESTINATIONS,
      visitedIds: appStateRef.current.visitedDestinationIds,
      excludeIds: nextExcludes,
    });
    if (!picked) return;
    // The picker wraps around rather than dead-ending; when it does, forget the
    // exclusions so the next reroll has the full list again.
    setExcludeIds(picked.excludesReset ? [] : nextExcludes);
    setSuggestion(picked);
  }, [excludeIds, minutes, suggestion, user]);

  const startWalk = useCallback(() => {
    if (!suggestion || !user) return;
    const dest = suggestion.destination;
    const walk: Walk = {
      id: newId(),
      destinationId: dest.id,
      startedAt: providerRef.current.now(),
      endedAt: null,
      status: "active",
      freeMinutes: minutes,
      estimatedMinutes: walkingRoute
        ? Math.round(walkingRoute.durationSeconds / 60)
        : suggestion.oneWayMinutes,
      trail: [],
      distanceMeters: 0,
      arrived: false,
    };
    trackerRef.current = initTracker();
    commit({ ...appStateRef.current, activeWalk: walk });
    if (simEnabled) {
      simRef.current?.setPosition(user);
      simRef.current?.walkTo(dest, walkingRoute?.geometry);
      simRef.current?.resume();
      setSimPaused(false);
    }
    setElapsedMs(0);
    setProviderRunning(true);
    setScreen("active");
  }, [commit, minutes, simEnabled, suggestion, user, walkingRoute]);

  const endWalkEarly = useCallback(() => finishWalk(false), [finishWalk]);

  const goTime = useCallback(() => {
    setSuggestion(null);
    setExcludeIds([]);
    setProviderRunning(false);
    setScreen("time");
  }, []);

  const goHistory = useCallback(() => {
    setDetailWalkId(null);
    setScreen("history");
  }, []);

  const goBackFromHistory = useCallback(() => {
    if (detailWalkId) {
      setDetailWalkId(null);
      setScreen("history");
      return;
    }
    setScreen(appStateRef.current.activeWalk ? "active" : "time");
  }, [detailWalkId]);

  /**
   * Tab navigation. Tapping Walk mid-walk returns you to the walk in progress
   * rather than dumping you back on the time picker and stranding it.
   */
  const selectTab = useCallback((tab: Tab) => {
    setDetailWalkId(null);
    switch (tab) {
      case "walk":
        setScreen(appStateRef.current.activeWalk ? "active" : "time");
        return;
      case "history":
        setScreen("history");
        return;
      case "progress":
        setScreen("achievements");
        return;
      case "friends":
        setScreen("friends");
        return;
    }
  }, []);

  const goCalendar = useCallback(() => setScreen("calendar"), []);

  /** A gap picked from an imported calendar goes straight into a search. */
  const useGap = useCallback(
    (gapMinutes: number) => {
      setMinutesRaw(clampMinutes(gapMinutes));
      findWalk(gapMinutes);
    },
    [findWalk],
  );

  const selectWalk = useCallback((walkId: string) => {
    setDetailWalkId(walkId);
    setScreen("historyDetail");
  }, []);

  // --- simulator controls --------------------------------------------------

  const toggleSim = useCallback(
    (on: boolean) => {
      setSimEnabled(on);
      setLocError(null);
      // Carry the current position across so the dot doesn't jump, then resume
      // any walk in progress against the new provider (plan section 10).
      if (on && user) simRef.current?.setPosition(user);
      const walk = appStateRef.current.activeWalk;
      if (on && walk) {
        const dest = destinationsById[walk.destinationId];
        if (dest) simRef.current?.walkTo(dest, walkingRoute?.geometry);
      }
      if (on) {
        simRef.current?.resume();
        setSimPaused(false);
      }
    },
    [destinationsById, user, walkingRoute],
  );

  const updateSimSettings = useCallback((patch: Partial<SimSettings>) => {
    setSimSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const applySimStart = useCallback(
    (lat: number, lng: number) => {
      if (appStateRef.current.activeWalk) return;
      setSimSettings((prev) => ({ ...prev, startLat: lat, startLng: lng }));
      simRef.current?.setPosition({ lat, lng });
      setUser({ lat, lng });
    },
    [],
  );

  const toggleSimPause = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    if (sim.isPaused()) {
      sim.resume();
      setSimPaused(false);
    } else {
      sim.pause();
      setSimPaused(true);
    }
  }, []);

  const jumpToArrival = useCallback(() => {
    simRef.current?.jumpToArrival();
  }, []);

  // --- derived -------------------------------------------------------------

  const remainingMeters =
    routeProgress?.remainingMeters ??
    (user && activeDestination ? haversineMeters(user, activeDestination) : 0);

  const detailWalk = detailWalkId
    ? (appState.walks.find((w) => w.id === detailWalkId) ?? null)
    : null;

  const stats = useMemo(
    () => computeStats(appState.walks, appState.visitedDestinationIds),
    [appState.walks, appState.visitedDestinationIds],
  );
  const badges = useMemo(
    () => computeBadges(appState.walks, stats),
    [appState.walks, stats],
  );
  const leaderboard = useMemo(() => buildLeaderboard(FRIENDS, stats), [stats]);

  const totalDistanceMeters = appState.walks.reduce(
    (sum, w) => sum + w.distanceMeters,
    0,
  );

  return {
    screen,
    appState,
    minutes,
    setMinutes,
    suggestion,
    walkingRoute,
    routeLoading: walkingRouteState.loading,
    routeError: walkingRouteState.error,
    remainingRoute: routeProgress?.geometry ??
      (user && activeDestination ? [user, activeDestination] : []),
    user,
    locating,
    slowFix,
    locError,
    elapsedMs,
    remainingMeters,
    summaryWalk,
    detailWalk,
    activeDestination,
    destinationsById,
    destinations: DESTINATIONS,
    totalDestinations: DESTINATIONS.length,
    visitedCount: appState.visitedDestinationIds.length,
    totalDistanceMeters,
    findWalk,
    reroll,
    startWalk,
    endWalkEarly,
    goTime,
    goHistory,
    goBackFromHistory,
    selectWalk,
    selectTab,
    activeTab: TAB_FOR_SCREEN[screen],
    showTabs: TABBED_SCREENS.has(screen),
    goCalendar,
    useGap,
    stats,
    badges,
    leaderboard,
    friends: FRIENDS,
    simEnabled,
    simSettings,
    simPaused,
    toggleSim,
    updateSimSettings,
    applySimStart,
    toggleSimPause,
    jumpToArrival,
  };
}
