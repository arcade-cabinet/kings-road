/**
 * Scripted benchmark routes.
 *
 * Each route is a sequence of timed input frames. Time values are in seconds
 * elapsed since route start. Input is Poisson-seeded, not random — the seed
 * is derived from the route id so replays are byte-identical across runs.
 */

import type { InputFrame } from '@/input/types';
import { emptyInputFrame } from '@/input/types';

export interface RouteKeyframe {
  /** Seconds since route start at which this input becomes active. */
  t: number;
  /** Duration in seconds to hold this input. */
  duration: number;
  /** Partial input frame merged over emptyInputFrame. */
  input: Partial<InputFrame>;
}

export interface BenchmarkRoute {
  id: string;
  label: string;
  /** Total expected duration in seconds. */
  totalDuration: number;
  /** Spawn biome tag (feeds into ?spawn= param). */
  spawnBiome: string;
  keyframes: RouteKeyframe[];
}

export const BENCHMARK_ROUTES: BenchmarkRoute[] = [
  {
    id: 'walk-village-perimeter',
    label: 'Walk village perimeter (60s)',
    totalDuration: 60,
    spawnBiome: 'thornfield',
    keyframes: [
      // Walk forward 15s
      { t: 0, duration: 15, input: { moveZ: 1 } },
      // Turn right 90° (lookDeltaX accumulates; ~1.57 rad total over 2s)
      { t: 15, duration: 2, input: { moveZ: 1, lookDeltaX: 0.785 } },
      // Walk forward 15s
      { t: 17, duration: 15, input: { moveZ: 1 } },
      // Turn right 90°
      { t: 32, duration: 2, input: { moveZ: 1, lookDeltaX: 0.785 } },
      // Walk forward 15s
      { t: 34, duration: 15, input: { moveZ: 1 } },
      // Turn right 90°
      { t: 49, duration: 2, input: { moveZ: 1, lookDeltaX: 0.785 } },
      // Walk back to start 9s
      { t: 51, duration: 9, input: { moveZ: 1 } },
    ],
  },
  {
    id: 'enter-dungeon-first-skeleton',
    label: 'Enter dungeon, engage first skeleton',
    totalDuration: 45,
    spawnBiome: 'thornfield',
    keyframes: [
      // Walk toward dungeon entrance (pre-positioned by spawn at anchor-02)
      { t: 0, duration: 10, input: { moveZ: 1 } },
      // Interact to enter dungeon
      { t: 10, duration: 0.2, input: { interact: true } },
      // Walk to first skeleton
      { t: 11, duration: 8, input: { moveZ: 1 } },
      // Attack
      { t: 19, duration: 0.2, input: { attack: true } },
      { t: 20, duration: 0.2, input: { attack: true } },
      { t: 21, duration: 0.2, input: { attack: true } },
      { t: 22, duration: 0.2, input: { attack: true } },
      { t: 23, duration: 0.2, input: { attack: true } },
      // Wait for death animation + loot
      { t: 24, duration: 15, input: {} },
      // Interact to pick up loot
      { t: 39, duration: 0.2, input: { interact: true } },
    ],
  },
  {
    id: 'sprint-through-fog-in-rain',
    label: 'Sprint through fog (weather stress, 60s)',
    totalDuration: 60,
    spawnBiome: 'thornfield',
    keyframes: [
      // Continuous sprint forward — max frame cost path
      { t: 0, duration: 60, input: { moveZ: 1, sprint: true } },
    ],
  },
  {
    id: 'combat-3-enemies-hero-shot',
    label: 'Combat vs 3 simultaneous enemies',
    totalDuration: 90,
    spawnBiome: 'thornfield',
    keyframes: [
      // Walk to combat encounter
      { t: 0, duration: 8, input: { moveZ: 1 } },
      // Engage enemies — alternating strafe + attack
      { t: 8, duration: 0.2, input: { attack: true } },
      { t: 9, duration: 1, input: { moveX: 1, sprint: true } },
      { t: 10, duration: 0.2, input: { attack: true } },
      { t: 11, duration: 1, input: { moveX: -1, sprint: true } },
      { t: 12, duration: 0.2, input: { attack: true } },
      { t: 13, duration: 1, input: { moveZ: -1 } },
      { t: 14, duration: 0.2, input: { attack: true } },
      { t: 15, duration: 1, input: { moveX: 1, sprint: true } },
      { t: 16, duration: 0.2, input: { attack: true } },
      { t: 17, duration: 1, input: { moveZ: 1 } },
      { t: 18, duration: 0.2, input: { attack: true } },
      { t: 20, duration: 0.2, input: { attack: true } },
      { t: 22, duration: 0.2, input: { attack: true } },
      { t: 24, duration: 0.2, input: { attack: true } },
      { t: 26, duration: 0.2, input: { attack: true } },
      { t: 28, duration: 0.2, input: { attack: true } },
      // Wait for fight to resolve
      { t: 30, duration: 60, input: {} },
    ],
  },
];

/**
 * Evaluate the active input frame for a route at elapsed time `t`.
 * Returns the merged InputFrame from the most recent active keyframe,
 * or an empty frame if no keyframe is active.
 */
export function evaluateRoute(
  route: BenchmarkRoute,
  elapsed: number,
): InputFrame {
  const base = emptyInputFrame();
  for (const kf of route.keyframes) {
    if (elapsed >= kf.t && elapsed < kf.t + kf.duration) {
      return { ...base, ...kf.input };
    }
  }
  return base;
}

/** Look up a route by id. */
export function getRoute(id: string): BenchmarkRoute | undefined {
  return BENCHMARK_ROUTES.find((r) => r.id === id);
}
