/**
 * Prop contracts for every screen.
 *
 * These live apart from the components so that App.tsx (the state machine) and
 * the screens themselves can be written against the same fixed surface without
 * waiting on each other. Screens are presentational: they receive data and
 * callbacks and own no app state beyond local form/UI state.
 */

import type {
  Badge,
  Destination,
  Friend,
  LatLng,
  LeaderboardRow,
  Stats,
  Walk,
} from "./types";
import type { Suggestion } from "./lib/selection";
import type { WalkingRoute } from "./lib/directions";
import type { LocationError, SimSettings } from "./location/LocationProvider";

/** The four primary destinations in the bottom tab bar. */
export type Tab = "walk" | "history" | "progress" | "friends";

export type TimeInputScreenProps = {
  minutes: number;
  /** Real streak / discovery numbers for the quiet header strip. */
  stats: Stats;
  visitedCount: number;
  totalDestinations: number;
  onMinutesChange: (minutes: number) => void;
  /** Disabled while locating. */
  onFind: () => void;
  /** True once "Find me a walk" is pressed and we're waiting for a first fix. */
  locating: boolean;
  /** True when locating has run past GPS_TIMEOUT_MS - show "Still looking for you...". */
  slowFix: boolean;
  error: LocationError | null;
  /** Shown when there's an error or a slow fix; turns the simulator on. */
  onUseSimulator: () => void;
  simEnabled: boolean;
  /** Opens the .ics import screen instead of typing minutes by hand. */
  onOpenCalendar: () => void;
};

export type SuggestionScreenProps = {
  suggestion: Suggestion;
  walkingRoute: WalkingRoute | null;
  routeLoading: boolean;
  user: LatLng | null;
  freeMinutes: number;
  onStart: () => void;
  onReroll: () => void;
  onChangeTime: () => void;
};

export type ActiveWalkScreenProps = {
  walk: Walk;
  destination: Destination;
  user: LatLng | null;
  /** Live elapsed time in ms, driven by the provider's clock (not Date.now()). */
  elapsedMs: number;
  /** Routed metres left when available; straight-line fallback otherwise. */
  remainingMeters: number;
  /** The unwalked portion of the planned route. */
  remainingRoute: LatLng[];
  onEndEarly: () => void;
};

export type SummaryScreenProps = {
  walk: Walk;
  /** Undefined if the destination was removed from the seed data since the walk. */
  destination: Destination | undefined;
  /** True when opened from History - swaps the footer for a Back button. */
  readOnly?: boolean;
  onWalkAgain?: () => void;
  onViewHistory?: () => void;
  onBack?: () => void;
};

export type HistoryScreenProps = {
  /** Newest last, as stored. The screen reverses for display. */
  walks: Walk[];
  destinationsById: Record<string, Destination>;
  /** Full seed list - the map view pins the ones actually reached. */
  destinations: Destination[];
  visitedDestinationIds: string[];
  totalDestinations: number;
  visitedCount: number;
  totalDistanceMeters: number;
  onSelectWalk: (walkId: string) => void;
};

export type SimulatorPanelProps = {
  settings: SimSettings;
  onSettingsChange: (patch: Partial<SimSettings>) => void;
  enabled: boolean;
  onToggleEnabled: (on: boolean) => void;
  paused: boolean;
  onPauseToggle: () => void;
  /** Start lat/lng may only be applied when no walk is running. */
  walkActive: boolean;
  onApplyStart: (lat: number, lng: number) => void;
  onJumpToArrival: () => void;
};

export type HeatmapScreenProps = {
  /** Every recorded walk; their trails are the heat source. */
  walks: Walk[];
  destinations: Destination[];
  visitedDestinationIds: string[];
};

export type AchievementsScreenProps = {
  stats: Stats;
  badges: Badge[];
  walks: Walk[];
  destinationsById: Record<string, Destination>;
};

export type CalendarScreenProps = {
  /** Chosen gap length, in whole minutes; the machine takes it from here. */
  onUseGap: (minutes: number) => void;
  onBack: () => void;
};

export type FriendsScreenProps = {
  rows: LeaderboardRow[];
  friends: Friend[];
};
