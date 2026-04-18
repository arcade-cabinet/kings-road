/**
 * Save/Load service — serializes game state to/from IndexedDB.
 *
 * Uses the delta persistence pattern: the world is deterministic from the
 * seed phrase, so we only persist player changes (position, health, inventory,
 * quest progress, chunk deltas). On load, the kingdom is regenerated from
 * the seed, then deltas are applied on top.
 *
 * Persistence layer uses IndexedDB directly for broad browser support.
 * expo-sqlite can be wired in later for native builds.
 */

import type * as THREE from 'three';
import type { EquippedItems, ItemStack } from '@/ecs/traits/inventory';
import type { ActiveQuest } from '@/stores/questStore';

// ── Serializable types ────────────────────────────────────────────────

/** Serializable save data — the bridge between runtime state and persistence */
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
  inventory: {
    items: Array<{ itemId: string; quantity: number }>;
    gold: number;
    equipment: EquippedItems;
  };
  quests: {
    activeQuests: ActiveQuest[];
    completedQuests: string[];
    triggeredQuests: string[];
  };
  chunkDeltas: Record<string, { gems: number[] }>;
  unlockedPerks: string[];
  /** Dungeon state — if the player was inside a dungeon when they saved */
  dungeon?: {
    id: string;
    currentRoomIndex: number;
    overworldPosition: { x: number; y: number; z: number };
    overworldYaw: number;
  };
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

// ── Snapshot: runtime state → SaveData ────────────────────────────────

/** Store shape expected by snapshotGameState (subset of gameStore) */
export interface GameStoreSnapshot {
  seedPhrase: string;
  playerPosition: THREE.Vector3;
  cameraYaw: number;
  health: number;
  stamina: number;
  timeOfDay: number;
  gemsCollected: number;
  chunkDeltas: Record<string, { gems: number[] }>;
  inDungeon: boolean;
  activeDungeon: {
    id: string;
    currentRoomIndex: number;
    overworldPosition: THREE.Vector3;
    overworldYaw: number;
  } | null;
}

/** Quest store shape expected by snapshotGameState */
export interface QuestStoreSnapshot {
  activeQuests: ActiveQuest[];
  completedQuests: string[];
  triggeredQuests: string[];
}

/** ECS inventory/equipment snapshot */
export interface InventorySnapshot {
  items: ItemStack[];
  gold: number;
  equipment: EquippedItems;
}

/**
 * Snapshot the current game state into a SaveData object.
 * Reads from all three state sources: Zustand game store, quest store, and ECS.
 */
export function snapshotGameState(
  gameStore: GameStoreSnapshot,
  questStore: QuestStoreSnapshot,
  inventory: InventorySnapshot,
  displayName: string,
  playTimeSeconds: number,
): SaveData {
  return {
    seedPhrase: gameStore.seedPhrase,
    displayName,
    savedAt: new Date().toISOString(),
    playTimeSeconds,
    player: {
      position: {
        x: gameStore.playerPosition.x,
        y: gameStore.playerPosition.y,
        z: gameStore.playerPosition.z,
      },
      cameraYaw: gameStore.cameraYaw,
      health: gameStore.health,
      stamina: gameStore.stamina,
      level: 1,
      xp: 0,
      timeOfDay: gameStore.timeOfDay,
      gemsCollected: gameStore.gemsCollected,
    },
    inventory: {
      items: inventory.items.map((s) => ({
        itemId: s.itemId,
        quantity: s.quantity,
      })),
      gold: inventory.gold,
      equipment: { ...inventory.equipment },
    },
    quests: {
      activeQuests: questStore.activeQuests.map((q) => ({ ...q })),
      completedQuests: [...questStore.completedQuests],
      triggeredQuests: [...questStore.triggeredQuests],
    },
    chunkDeltas: structuredClone(gameStore.chunkDeltas),
    unlockedPerks: [],
    dungeon:
      gameStore.inDungeon && gameStore.activeDungeon
        ? {
            id: gameStore.activeDungeon.id,
            currentRoomIndex: gameStore.activeDungeon.currentRoomIndex,
            overworldPosition: {
              x: gameStore.activeDungeon.overworldPosition.x,
              y: gameStore.activeDungeon.overworldPosition.y,
              z: gameStore.activeDungeon.overworldPosition.z,
            },
            overworldYaw: gameStore.activeDungeon.overworldYaw,
          }
        : undefined,
  };
}

// ── IndexedDB persistence ─────────────────────────────────────────────

const DB_NAME = 'kings-road-saves';
const DB_VERSION = 1;
const STORE_NAME = 'save_slots';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'slotId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Stored record shape in IndexedDB */
interface SaveSlotRecord {
  slotId: number;
  data: SaveData;
}

/** Save game state to a numbered slot (1-3). */
export async function saveToSlot(
  slotId: number,
  data: SaveData,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ slotId, data } satisfies SaveSlotRecord);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** Load save data from a slot. Returns undefined if the slot is empty. */
export async function loadFromSlot(
  slotId: number,
): Promise<SaveData | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(slotId);
    request.onsuccess = () => {
      db.close();
      const record = request.result as SaveSlotRecord | undefined;
      resolve(record?.data);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/** Delete a save slot. */
export async function deleteSlot(slotId: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(slotId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** List all save slot summaries for the load menu. */
export async function listSaveSlots(): Promise<SaveSlotSummary[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      db.close();
      const records = request.result as SaveSlotRecord[];
      const summaries: SaveSlotSummary[] = records.map((r) => ({
        slotId: r.slotId,
        displayName: r.data.displayName,
        seedPhrase: r.data.seedPhrase,
        savedAt: r.data.savedAt,
        playTimeSeconds: r.data.playTimeSeconds,
        level: r.data.player.level,
      }));
      summaries.sort((a, b) => a.slotId - b.slotId);
      resolve(summaries);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/** Check if any save slot has data (for "Continue" button on main menu). */
export async function hasAnySave(): Promise<boolean> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();
    request.onsuccess = () => {
      db.close();
      resolve(request.result > 0);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/** Get the most recent save across all slots (for quick "Continue"). */
export async function getMostRecentSave(): Promise<SaveData | undefined> {
  const slots = await listSaveSlots();
  if (slots.length === 0) return undefined;

  // Sort by savedAt descending
  slots.sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );

  return loadFromSlot(slots[0].slotId);
}

// ── Restore: SaveData → runtime state ─────────────────────────────────

/** Stores / setters needed to restore game state from SaveData. */
export interface RestoreTarget {
  /** Start the game with seed, position, and yaw (sets gameActive=true). */
  startGame: (
    seed: string,
    position: { x: number; y: number; z: number },
    yaw: number,
  ) => void;
  /** Direct state merge on the game store (Zustand setState). */
  mergeGameState: (partial: {
    health: number;
    stamina: number;
    timeOfDay: number;
    gemsCollected: number;
    chunkDeltas: Record<string, { gems: number[] }>;
  }) => void;
  /** Restore inventory to the UI store. */
  restoreInventory: (
    items: Array<{ itemId: string; quantity: number }>,
    gold: number,
    equipment: EquippedItems,
  ) => void;
  /** Restore quest state — uses restoreQuests to preserve currentStep. */
  restoreQuests: (
    activeQuests: ActiveQuest[],
    completedQuests: string[],
    triggeredQuests: string[],
  ) => void;
  /** Restore dungeon state if the player was in a dungeon. */
  restoreDungeon?: (dungeon: {
    id: string;
    currentRoomIndex: number;
    overworldPosition: { x: number; y: number; z: number };
    overworldYaw: number;
  }) => void;
}

/**
 * Apply SaveData to all runtime stores after the kingdom has been regenerated.
 *
 * Call this AFTER generateWorld() and resolveNarrative() have completed.
 * It sets up player position, vitals, inventory, quests (with step progress),
 * and chunk deltas in one shot.
 */
export function restoreGameState(data: SaveData, target: RestoreTarget): void {
  // 1. Start game — sets position, yaw, gameActive, and resets transient state
  target.startGame(
    data.seedPhrase,
    data.player.position,
    data.player.cameraYaw,
  );

  // 2. Overlay saved vitals and deltas (startGame resets these to defaults)
  target.mergeGameState({
    health: data.player.health,
    stamina: data.player.stamina,
    timeOfDay: data.player.timeOfDay,
    gemsCollected: data.player.gemsCollected,
    chunkDeltas: structuredClone(data.chunkDeltas),
  });

  // 3. Restore quests with their saved currentStep values
  target.restoreQuests(
    data.quests.activeQuests,
    data.quests.completedQuests,
    data.quests.triggeredQuests,
  );

  // 4. Restore inventory
  target.restoreInventory(
    data.inventory.items,
    data.inventory.gold,
    data.inventory.equipment,
  );

  // 5. Restore dungeon state if present
  if (data.dungeon && target.restoreDungeon) {
    target.restoreDungeon(data.dungeon);
  }
}
