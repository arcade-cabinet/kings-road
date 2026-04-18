import type { InputFrame } from '@/input/types';
import { emptyInputFrame } from '@/input/types';

/** A single scripted input event at a time offset (seconds from route start). */
export interface ScriptedEvent {
  t: number;
  frame: Partial<InputFrame>;
}

/** A named benchmark route with total duration and deterministic input script. */
export interface BenchmarkRoute {
  id: string;
  label: string;
  spawnBiome: string;
  durationSeconds: number;
  /** Ordered list of input events. The runner replays them by time. */
  script: ScriptedEvent[];
}

/** Fixed-interval direction changes: turns every 8s using evenly-spaced heading angles. */
function walkScript(durationSeconds: number): ScriptedEvent[] {
  const events: ScriptedEvent[] = [];
  const changeInterval = 8;
  let t = 0;
  let turn = 0;
  while (t < durationSeconds) {
    const angle = (turn * Math.PI) / 3;
    events.push({
      t,
      frame: {
        moveX: Math.sin(angle) * 0.5,
        moveZ: Math.cos(angle) * 0.8,
      },
    });
    t += changeInterval;
    turn++;
  }
  return events;
}

export const BENCHMARK_ROUTES: BenchmarkRoute[] = [
  {
    id: 'walk-village-perimeter',
    label: 'Walk village perimeter (60s)',
    spawnBiome: 'thornfield',
    durationSeconds: 60,
    script: walkScript(60),
  },
  {
    id: 'enter-dungeon-first-skeleton',
    label: 'Enter dungeon + engage first skeleton',
    spawnBiome: 'thornfield',
    durationSeconds: 90,
    script: [
      // Walk forward toward dungeon entrance
      { t: 0, frame: { moveZ: 1 } },
      // Sprint the last stretch
      { t: 20, frame: { moveZ: 1, sprint: true } },
      // Stop and interact with dungeon entrance
      { t: 35, frame: { moveZ: 0, sprint: false, interact: true } },
      // Release interact, move into first room
      { t: 36, frame: { interact: false } },
      { t: 37, frame: { moveZ: 1 } },
      // Stop and attack skeleton
      { t: 50, frame: { moveZ: 0, attack: true } },
      // Sustain attacks
      { t: 51, frame: { attack: true } },
      { t: 52, frame: { attack: true } },
      { t: 53, frame: { attack: true } },
      { t: 55, frame: { attack: false } },
    ],
  },
  {
    id: 'sprint-through-fog-in-rain',
    label: 'Sprint stress: fog + rain (45s)',
    spawnBiome: 'thornfield',
    durationSeconds: 45,
    script: [
      { t: 0, frame: { moveZ: 1, sprint: true } },
      { t: 10, frame: { moveX: 0.5, moveZ: 0.8, sprint: true } },
      { t: 18, frame: { moveX: -0.5, moveZ: 0.8, sprint: true } },
      { t: 26, frame: { moveX: 0, moveZ: 1, sprint: true } },
      { t: 34, frame: { moveX: 0.3, moveZ: 0.9, sprint: true } },
      { t: 42, frame: { moveZ: 1, sprint: true } },
    ],
  },
  {
    id: 'combat-3-enemies-hero-shot',
    label: 'Combat: 3 simultaneous enemies (60s)',
    spawnBiome: 'thornfield',
    durationSeconds: 60,
    script: [
      { t: 0, frame: { moveZ: 1 } },
      { t: 5, frame: { moveZ: 0 } },
      // First enemy
      { t: 6, frame: { attack: true } },
      { t: 7, frame: { attack: false } },
      { t: 8, frame: { attack: true } },
      { t: 9, frame: { attack: false } },
      // Strafe to expose second enemy
      { t: 10, frame: { moveX: 1 } },
      { t: 13, frame: { moveX: 0, attack: true } },
      { t: 14, frame: { attack: false } },
      { t: 15, frame: { attack: true } },
      { t: 16, frame: { attack: false } },
      // Back to center, third enemy
      { t: 17, frame: { moveX: -0.5 } },
      { t: 19, frame: { moveX: 0, attack: true } },
      { t: 20, frame: { attack: false } },
      { t: 21, frame: { attack: true } },
      { t: 22, frame: { attack: false } },
      { t: 23, frame: { attack: true } },
      { t: 24, frame: { attack: false } },
      // Finish up
      { t: 30, frame: {} },
    ],
  },
];

/** Look up a route by id. Returns undefined for unknown ids. */
export function getRoute(id: string): BenchmarkRoute | undefined {
  return BENCHMARK_ROUTES.find((r) => r.id === id);
}

/**
 * Given a route and elapsed time, return the active InputFrame.
 * Finds the latest script event with t <= elapsed.
 */
export function getFrameAtTime(
  route: BenchmarkRoute,
  elapsed: number,
): InputFrame {
  const frame = emptyInputFrame();
  for (const event of route.script) {
    if (event.t > elapsed) break;
    Object.assign(frame, event.frame);
  }
  return frame;
}
