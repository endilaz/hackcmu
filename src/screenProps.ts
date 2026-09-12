/**
 * Prop contracts for every screen.
 *
 * These live apart from the components so that App.tsx (the state machine) and
 * the screens themselves can be written against the same fixed surface without
 * waiting on each other. Screens are presentational: they receive data and
 * callbacks and own no app state beyond local form/UI state.
 */

import type { Destination, LatLng, Walk } from "./types";
import type { Suggestion } from "./lib/selection";
import type { LocationError, SimSettings } from "./location/LocationProvider";

export type TimeInputScreenProps = {
  minutes: number;
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
};

export type SuggestionScreenProps = {
  suggestion: Suggestion;
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
  /** Straight-line metres left to the destination. */
  remainingMeters: number;
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
  totalDestinations: number;
  visitedCount: number;
  totalDistanceMeters: number;
  onSelectWalk: (walkId: string) => void;
  onBack: () => void;
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
