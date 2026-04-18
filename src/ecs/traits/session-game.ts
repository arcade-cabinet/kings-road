import { trait } from 'koota';
import * as THREE from 'three';
import type {
  AABB,
  ActiveEncounter,
  ChunkData,
  ChunkDelta,
  InputState,
  Interactable,
  LegacyChunkType,
} from '@/types/game';
import { PLAYER_HEIGHT } from '@/utils/worldGen';
import type { SpatialDungeon } from '@/world/dungeon-generator';

/**
 * Runtime weather state tracked per-frame. Moved from the old
 * `src/stores/gameStore.ts` during the Zustand → Koota purge. Read by
 * WeatherSystem, CombatFeedback, and audio mixing.
 */
export interface WeatherState {
  condition: 'clear' | 'overcast' | 'foggy' | 'rainy' | 'stormy';
  fogDensity: number;
  rainIntensity: number;
  windStrength: number;
  regionId: string;
}

export const DEFAULT_WEATHER: WeatherState = {
  condition: 'clear',
  fogDensity: 0,
  rainIntensity: 0,
  windStrength: 0.1,
  regionId: '',
};

export interface ActiveDungeon {
  id: string;
  name: string;
  spatial: SpatialDungeon;
  currentRoomIndex: number;
  overworldPosition: THREE.Vector3;
  overworldYaw: number;
}

// ── Boolean pause / mode flags ────────────────────────────────────────────
export const GameFlags = trait(() => ({
  gameActive: false,
  paused: false,
  inDialogue: false,
  inCombat: false,
  inDungeon: false,
  isDead: false,
  isGrounded: true,
  isSprinting: false,
}));

// ── Player body state ─────────────────────────────────────────────────────
export const PlayerState = trait(() => ({
  playerPosition: new THREE.Vector3(0, PLAYER_HEIGHT, 0),
  playerVelocityY: 0,
  velocity: 0,
  stamina: 100,
  health: 100,
}));

// ── Camera orientation ────────────────────────────────────────────────────
export const CameraState = trait(() => ({
  cameraYaw: Math.PI,
  cameraPitch: 0,
  /** @deprecated legacy input system */
  angularVelocity: 0,
}));

// ── Seed phrase ───────────────────────────────────────────────────────────
export const SeedState = trait(() => ({
  seedPhrase: '',
}));

// ── Active chunk graph + collision + interactables ────────────────────────
export const ChunkState = trait(() => ({
  currentChunkKey: '',
  currentChunkName: 'The Realm',
  currentChunkType: 'WILD' as LegacyChunkType,
  activeChunks: new Map<string, ChunkData>(),
  globalAABBs: [] as AABB[],
  globalInteractables: [] as Interactable[],
  chunkDeltas: {} as Record<string, ChunkDelta>,
}));

// ── Time of day / weather / collectibles ──────────────────────────────────
export const EnvironmentState = trait(() => ({
  timeOfDay: 8 / 24, // 8 AM
  gemsCollected: 0,
  currentWeather: { ...DEFAULT_WEATHER } as WeatherState,
}));

// ── Play time tracker ─────────────────────────────────────────────────────
// Ticks every frame when the player is alive, the game is active, and the
// pause menu is not open. Continues ticking during dialogue, combat, and
// inventory-open — those are all states the player is actively engaged in.
// Save payloads read this to report an accurate "2h 14m walked" figure on
// the load screen. See PlayerController for the authoritative tick gate.
export const PlayTime = trait(() => ({
  playTimeSeconds: 0,
}));

// ── Combat session (encounter in flight) ──────────────────────────────────
export const CombatSession = trait(() => ({
  activeEncounter: null as ActiveEncounter | null,
}));

// ── Dungeon session (player inside a dungeon) ─────────────────────────────
export const DungeonSession = trait(() => ({
  activeDungeon: null as ActiveDungeon | null,
}));

// ── Dialogue / interactable in focus ──────────────────────────────────────
export const InteractionState = trait(() => ({
  currentInteractable: null as Interactable | null,
  dialogueName: '',
  dialogueText: '',
  dialogueType: 'wanderer',
}));

// ── Legacy input (kept for InteractionSystem's `keys.action` + touch) ─────
export const InputLegacy = trait(() => ({
  keys: {
    w: false,
    a: false,
    s: false,
    d: false,
    q: false,
    e: false,
    space: false,
    shift: false,
    action: false,
  } as InputState,
  joystickVector: { x: 0, y: 0 } as { x: number; y: number },
  joystickDist: 0,
  mouseDown: false,
}));
