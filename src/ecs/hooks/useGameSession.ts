/**
 * Reactive React hooks over the session-game traits.
 *
 * Each hook wraps `useTrait(session, TraitX)` and returns a stable-shape
 * default when the trait hasn't been attached yet. Components that only
 * need one slice of state should import the narrow hook (useFlags,
 * usePlayer, etc.) so re-renders stay scoped to the slice that changed.
 */

import { useTrait } from 'koota/react';
import * as THREE from 'three';
import {
  type ActiveDungeon,
  CameraState,
  ChunkState,
  CombatSession,
  DEFAULT_WEATHER,
  DungeonSession,
  EnvironmentState,
  GameFlags,
  InputLegacy,
  InteractionState,
  PlayerState,
  SeedState,
} from '@/ecs/traits/session-game';
import { getSessionEntity } from '@/ecs/world';
import type {
  AABB,
  ActiveEncounter,
  ChunkData,
  ChunkDelta,
  ChunkType,
  Interactable,
} from '@/types/game';
import { PLAYER_HEIGHT } from '@/utils/worldGen';

const DEFAULT_FLAGS = {
  gameActive: false,
  paused: false,
  inDialogue: false,
  inCombat: false,
  inDungeon: false,
  isDead: false,
  isGrounded: true,
  isSprinting: false,
};

const DEFAULT_PLAYER = {
  playerPosition: new THREE.Vector3(0, PLAYER_HEIGHT, 0),
  playerVelocityY: 0,
  velocity: 0,
  stamina: 100,
  health: 100,
};

const DEFAULT_CAMERA = {
  cameraYaw: Math.PI,
  cameraPitch: 0,
  angularVelocity: 0,
};

const DEFAULT_SEED = { seedPhrase: '' };

const DEFAULT_CHUNKS: {
  currentChunkKey: string;
  currentChunkName: string;
  currentChunkType: ChunkType;
  activeChunks: Map<string, ChunkData>;
  globalAABBs: AABB[];
  globalInteractables: Interactable[];
  chunkDeltas: Record<string, ChunkDelta>;
} = {
  currentChunkKey: '',
  currentChunkName: 'The Realm',
  currentChunkType: 'WILD',
  activeChunks: new Map(),
  globalAABBs: [],
  globalInteractables: [],
  chunkDeltas: {},
};

const DEFAULT_ENV = {
  timeOfDay: 8 / 24,
  gemsCollected: 0,
  currentWeather: DEFAULT_WEATHER,
};

const DEFAULT_COMBAT: { activeEncounter: ActiveEncounter | null } = {
  activeEncounter: null,
};
const DEFAULT_DUNGEON: { activeDungeon: ActiveDungeon | null } = {
  activeDungeon: null,
};

const DEFAULT_INTERACTION = {
  currentInteractable: null,
  dialogueName: '',
  dialogueText: '',
  dialogueType: 'wanderer',
};

const DEFAULT_INPUT = {
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
  },
  joystickVector: { x: 0, y: 0 },
  joystickDist: 0,
  mouseDown: false,
};

export function useFlags() {
  return useTrait(getSessionEntity(), GameFlags) ?? DEFAULT_FLAGS;
}

export function usePlayer() {
  return useTrait(getSessionEntity(), PlayerState) ?? DEFAULT_PLAYER;
}

export function useCamera() {
  return useTrait(getSessionEntity(), CameraState) ?? DEFAULT_CAMERA;
}

export function useSeed() {
  return useTrait(getSessionEntity(), SeedState) ?? DEFAULT_SEED;
}

export function useChunkState() {
  return useTrait(getSessionEntity(), ChunkState) ?? DEFAULT_CHUNKS;
}

export function useEnvironment() {
  return useTrait(getSessionEntity(), EnvironmentState) ?? DEFAULT_ENV;
}

export function useCombatSession() {
  return useTrait(getSessionEntity(), CombatSession) ?? DEFAULT_COMBAT;
}

export function useDungeonSession() {
  return useTrait(getSessionEntity(), DungeonSession) ?? DEFAULT_DUNGEON;
}

export function useInteraction() {
  return useTrait(getSessionEntity(), InteractionState) ?? DEFAULT_INTERACTION;
}

export function useInputLegacy() {
  return useTrait(getSessionEntity(), InputLegacy) ?? DEFAULT_INPUT;
}
