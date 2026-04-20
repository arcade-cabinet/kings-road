/**
 * Shared time constants for the day/night cycle.
 *
 * `DAY_DURATION` is the single source of truth for the length of one
 * in-game day expressed in real-time seconds. Both the DayNightCycle
 * renderer (`app/systems/Environment.tsx`) and the autosave throttle
 * derivation (`src/ecs/actions/game.ts`) import it from here so that
 * changing the day length is a one-line edit.
 */

/** Real-time seconds per in-game day (10 real minutes = 1 game day). */
export const DAY_DURATION = 600.0;
