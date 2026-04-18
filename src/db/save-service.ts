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
import type { ActiveQuest } from '@/ecs/traits/session-quest';

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

// ── Capacitor SQLite persistence ──────────────────────────────────────
//
// Single table `save_slots(slotId INTEGER PRIMARY KEY, payload TEXT)`.
// One row per slot, payload is the JSON-serialized SaveData. The
// connection + schema are managed by `./save-db`.

import { sqlQuery, sqlRun } from './save-db';

interface SlotRow {
  slotId: number;
  payload: string;
}

/** Save game state to a numbered slot (0=auto, 1-3=manual). */
export async function saveToSlot(
  slotId: number,
  data: SaveData,
): Promise<void> {
  const payload = JSON.stringify(data);
  await sqlRun(
    `INSERT INTO save_slots (slotId, payload) VALUES (?, ?)
     ON CONFLICT(slotId) DO UPDATE SET payload = excluded.payload;`,
    [slotId, payload],
  );
}

/** Load save data from a slot. Returns undefined if the slot is empty. */
export async function loadFromSlot(
  slotId: number,
): Promise<SaveData | undefined> {
  const rows = await sqlQuery<SlotRow>(
    `SELECT slotId, payload FROM save_slots WHERE slotId = ? LIMIT 1;`,
    [slotId],
  );
  const row = rows[0];
  if (!row) return undefined;
  try {
    return JSON.parse(row.payload) as SaveData;
  } catch (err) {
    console.error(
      `[save-service] Failed to parse payload for slot ${slotId}:`,
      err,
    );
    return undefined;
  }
}

/** Delete a save slot. */
export async function deleteSlot(slotId: number): Promise<void> {
  await sqlRun(`DELETE FROM save_slots WHERE slotId = ?;`, [slotId]);
}

/** List all save slot summaries for the load menu. */
export async function listSaveSlots(): Promise<SaveSlotSummary[]> {
  const rows = await sqlQuery<SlotRow>(
    `SELECT slotId, payload FROM save_slots ORDER BY slotId ASC;`,
  );
  const summaries: SaveSlotSummary[] = [];
  for (const row of rows) {
    try {
      const data = JSON.parse(row.payload) as SaveData;
      summaries.push({
        slotId: row.slotId,
        displayName: data.displayName,
        seedPhrase: data.seedPhrase,
        savedAt: data.savedAt,
        playTimeSeconds: data.playTimeSeconds,
        level: data.player.level,
      });
    } catch {
      // Skip corrupt rows — they'll be overwritten on next save.
    }
  }
  return summaries;
}

/** Check if any save slot has data (for "Continue" affordance on main menu). */
export async function hasAnySave(): Promise<boolean> {
  const rows = await sqlQuery<{ n: number }>(
    `SELECT COUNT(*) AS n FROM save_slots;`,
  );
  return (rows[0]?.n ?? 0) > 0;
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
