/**
 * Save/Load service — serializes ECS world state to/from expo-sqlite via Drizzle.
 *
 * expo-sqlite is cross-platform: uses native SQLite on iOS/Android,
 * OPFS-backed SQLite on web. No fallbacks needed.
 *
 * The service is consumed by the MainMenu (load/continue) and pause menu (save).
 */

import type * as THREE from 'three';

/** Serializable save data — the bridge between ECS state and persistence */
export interface SaveData {
  seedPhrase: string;
  displayName: string;
  savedAt: string;
  playTimeSeconds: number;
  player: {
    position: { x: number; y: number; z: number };
    cameraYaw: number;
    health: number;
    stamina: number;
    level: number;
    xp: number;
    timeOfDay: number;
    gemsCollected: number;
  };
  inventory: Array<{
    itemId: string;
    quantity: number;
    equippedSlot: string | null;
  }>;
  quests: Array<{
    questId: string;
    status: string;
    currentStep: number;
    chosenBranch: string | null;
    flags: Record<string, unknown> | null;
  }>;
  chunkDeltas: Record<string, { gems: number[] }>;
  unlockedPerks: string[];
}

/** Save slot summary for the load menu */
export interface SaveSlotSummary {
  slotId: number;
  displayName: string;
  seedPhrase: string;
  savedAt: string;
  playTimeSeconds: number;
  level: number;
}

/**
 * Snapshot the current game state into a SaveData object.
 * This is platform-independent — just reads from the Zustand store.
 */
export function snapshotGameState(
  store: {
    seedPhrase: string;
    playerPosition: THREE.Vector3;
    cameraYaw: number;
    health: number;
    stamina: number;
    timeOfDay: number;
    gemsCollected: number;
    chunkDeltas: Record<string, { gems: number[] }>;
  },
  displayName: string,
  playTimeSeconds: number,
): SaveData {
  return {
    seedPhrase: store.seedPhrase,
    displayName,
    savedAt: new Date().toISOString(),
    playTimeSeconds,
    player: {
      position: {
        x: store.playerPosition.x,
        y: store.playerPosition.y,
        z: store.playerPosition.z,
      },
      cameraYaw: store.cameraYaw,
      health: store.health,
      stamina: store.stamina,
      level: 1, // TODO: read from ECS when leveling is implemented
      xp: 0,
      timeOfDay: store.timeOfDay,
      gemsCollected: store.gemsCollected,
    },
    inventory: [], // TODO: populate from inventory ECS trait
    quests: [], // TODO: populate from quest store
    chunkDeltas: store.chunkDeltas,
    unlockedPerks: [],
  };
}
