import { int, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * game.db schema — powered by expo-sqlite + Drizzle ORM.
 *
 * Three save slots (matching Grok Phase 16), each storing:
 * - Player state (position, health, level, XP)
 * - Inventory items
 * - Quest progress
 * - World seed + chunk modifications
 * - Timestamp for display in the load menu
 */

/** Save slot metadata */
export const saveSlots = sqliteTable('save_slots', {
  id: int().primaryKey(),
  /** World seed phrase that generated this save */
  seedPhrase: text().notNull(),
  /** Display name for the save (e.g. "Slot 1 - Golden Meadow") */
  displayName: text().notNull(),
  /** ISO timestamp of last save */
  savedAt: text().notNull(),
  /** Total play time in seconds */
  playTimeSeconds: int().notNull().default(0),
});

/** Player state per save slot */
export const playerState = sqliteTable('player_state', {
  id: int().primaryKey(),
  saveSlotId: int()
    .notNull()
    .references(() => saveSlots.id),
  /** Player position as JSON: {x, y, z} */
  position: text().notNull(),
  /** Camera yaw in radians */
  cameraYaw: real().notNull(),
  health: int().notNull().default(100),
  stamina: int().notNull().default(100),
  /** Player level */
  level: int().notNull().default(1),
  /** Current XP */
  xp: int().notNull().default(0),
  /** Game time of day (0-1) */
  timeOfDay: real().notNull().default(0.333),
  /** Total gems collected */
  gemsCollected: int().notNull().default(0),
});

/** Inventory items per save slot */
export const inventoryItems = sqliteTable('inventory_items', {
  id: int().primaryKey(),
  saveSlotId: int()
    .notNull()
    .references(() => saveSlots.id),
  /** Item definition ID from content/items/ */
  itemId: text().notNull(),
  quantity: int().notNull().default(1),
  /** Equipment slot if equipped, null if in inventory */
  equippedSlot: text(),
});

/** Quest progress per save slot */
export const questProgress = sqliteTable('quest_progress', {
  id: int().primaryKey(),
  saveSlotId: int()
    .notNull()
    .references(() => saveSlots.id),
  /** Quest definition ID from content/quests/ */
  questId: text().notNull(),
  /** Current state */
  status: text().notNull().default('active'),
  /** Current step index (for linear quests) */
  currentStep: int().notNull().default(0),
  /** Chosen branch label (for branching quests) */
  chosenBranch: text(),
  /** JSON blob for quest-specific flags */
  flags: text(),
});

/** World chunk modifications per save slot (collected gems, etc.) */
export const chunkDeltas = sqliteTable('chunk_deltas', {
  id: int().primaryKey(),
  saveSlotId: int()
    .notNull()
    .references(() => saveSlots.id),
  /** Chunk key (e.g. "0,0") */
  chunkKey: text().notNull(),
  /** JSON array of collected gem IDs */
  collectedGems: text().notNull().default('[]'),
});

/** Unlocked skill perks per save slot */
export const unlockedPerks = sqliteTable('unlocked_perks', {
  id: int().primaryKey(),
  saveSlotId: int()
    .notNull()
    .references(() => saveSlots.id),
  /** Perk ID from skill tree */
  perkId: text().notNull(),
  /** When it was unlocked (ISO timestamp) */
  unlockedAt: text().notNull(),
});
