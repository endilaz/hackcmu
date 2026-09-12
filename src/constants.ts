/**
 * Every tunable number in Spare Walk lives here. See plan.md sections 7 and 8.
 */

// --- Walk-time estimate (plan.md 7.1) -------------------------------------
/** Straight-line distance is multiplied by this to approximate real streets. */
export const DETOUR_FACTOR = 1.3;
/** Average walking speed in meters per second. */
export const WALK_SPEED_MPS = 1.35;
/** true: a destination fits if there's time to walk there AND back. */
export const ROUND_TRIP = true;

// --- Destination selection (plan.md 7.2) ----------------------------------
/** Destinations closer than this are skipped - you're already there. */
export const MIN_DESTINATION_DISTANCE_M = 75;
/** Pick randomly among this many longest-but-still-fitting candidates. */
export const TOP_CANDIDATE_POOL = 3;

// --- Trail filtering (plan.md 7.3) ----------------------------------------
/** Reject fixes less precise than this. */
export const MAX_ACCURACY_M = 50;
/** Reject movement smaller than this - GPS jitter while standing still. */
export const MIN_STEP_M = 3;
/** Reject implied speeds above this - a GPS jump, not a walk. */
export const MAX_SPEED_MPS = 3.0;

// --- Arrival detection (plan.md 7.4) --------------------------------------
/** Within this many meters of the destination counts as arrived... */
export const ARRIVAL_RADIUS_M = 40;
/** ...but only after this many consecutive accepted points inside the radius. */
export const ARRIVAL_CONSECUTIVE_POINTS = 2;

// --- Simulator (plan.md 8) ------------------------------------------------
/** CMU Fence - the simulator's default start point. */
export const DEFAULT_SIM_START = { lat: 40.4428, lng: -79.943 };
export const SIM_SPEED_OPTIONS = [1, 4, 10, 30] as const;
export const DEFAULT_SIM_SPEED = 10;
/** One emit per second of real time. */
export const SIM_EMIT_INTERVAL_MS = 1000;
/** While no walk is active the simulator re-emits the start position this often. */
export const SIM_IDLE_INTERVAL_MS = 2000;
/** Gaussian jitter applied to emitted points when noise is on. */
export const SIM_NOISE_SIGMA_M = 4;
/** "Jump to arrival" teleports to within this distance of the destination. */
export const SIM_JUMP_DISTANCE_M = 10;

// --- Persistence ----------------------------------------------------------
export const STORAGE_KEY = "sparewalk.state.v1";
export const SIM_STORAGE_KEY = "sparewalk.sim.v1";
/** Trail writes are throttled to at most one per this interval. */
export const TRAIL_PERSIST_THROTTLE_MS = 5000;

// --- Input limits (plan.md 10) --------------------------------------------
export const MIN_FREE_MINUTES = 5;
export const MAX_FREE_MINUTES = 180;
export const QUICK_PICK_MINUTES = [15, 20, 30, 45, 60];
/** How long to wait for a first real GPS fix before offering the simulator. */
export const GPS_TIMEOUT_MS = 10000;
