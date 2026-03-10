import { int, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ═══════════════════════════════════════════════════════════════════════
// CONTENT TABLES — read-only, populated by scripts/compile-content-db.ts
// ═══════════════════════════════════════════════════════════════════════

/** Monster archetypes — wolves, bandits, dragons, etc. */
export const monsters = sqliteTable('monsters', {
  id: text().primaryKey(),
  name: text().notNull(),
  bodyType: text('body_type').notNull(),
  size: real().notNull(),
  dangerTier: int('danger_tier').notNull(),
  health: int().notNull(),
  damage: int().notNull(),
  colorPrimary: text('color_primary').notNull(),
  colorSecondary: text('color_secondary'),
  colorAccent: text('color_accent'),
  spawnBiome: text('spawn_biome'),
  xpReward: int('xp_reward'),
  /** Full JSON blob for optional fields (abilities, appendages, etc.) */
  data: text({ mode: 'json' }),
});

/** Item definitions — weapons, consumables, quest items, etc. */
export const items = sqliteTable('items', {
  id: text().primaryKey(),
  name: text().notNull(),
  type: text().notNull(),
  description: text().notNull(),
  rarity: text(),
  stackable: int({ mode: 'boolean' }).notNull().default(false),
  value: int(),
  weight: real(),
  equipSlot: text('equip_slot'),
  /** Full JSON blob (statModifiers, effect, etc.) */
  data: text({ mode: 'json' }),
});

/** Encounter tables — tier-based random encounter pools */
export const encounterTables = sqliteTable('encounter_tables', {
  id: text().primaryKey(),
  dangerTier: int('danger_tier').notNull(),
  lootTableId: text('loot_table_id'),
});

/** Encounter table entries — monster + weight + count range */
export const encounterEntries = sqliteTable('encounter_entries', {
  id: int().primaryKey({ autoIncrement: true }),
  tableId: text('table_id').notNull(),
  monsterId: text('monster_id').notNull(),
  weight: real().notNull(),
  countMin: int('count_min').notNull(),
  countMax: int('count_max').notNull(),
});

/** Loot tables */
export const lootTables = sqliteTable('loot_tables', {
  id: text().primaryKey(),
});

/** Loot table entries — item + weight + quantity range */
export const lootEntries = sqliteTable('loot_entries', {
  id: int().primaryKey({ autoIncrement: true }),
  tableId: text('table_id').notNull(),
  itemId: text('item_id').notNull(),
  weight: real().notNull(),
  quantityMin: int('quantity_min').notNull(),
  quantityMax: int('quantity_max').notNull(),
});

/** Named story NPCs — Elara, Gerold, Captain Roderick, etc. */
export const npcsNamed = sqliteTable('npcs_named', {
  id: text().primaryKey(),
  name: text(),
  archetype: text().notNull(),
  fixed: int({ mode: 'boolean' }).notNull().default(false),
  /** Full NPCBlueprint as JSON */
  data: text({ mode: 'json' }).notNull(),
});

/** NPC archetype pools — blacksmith pool, merchant pool, etc. */
export const npcPools = sqliteTable('npc_pools', {
  archetype: text().primaryKey(),
  /** Full NPCDefinition pool as JSON */
  data: text({ mode: 'json' }).notNull(),
});

/** Building archetypes — tavern, smithy, chapel, etc. */
export const buildings = sqliteTable('buildings', {
  id: text().primaryKey(),
  footprintWidth: int('footprint_width').notNull(),
  footprintDepth: int('footprint_depth').notNull(),
  wallMaterial: text('wall_material').notNull(),
  roofStyle: text('roof_style').notNull(),
  /** Full BuildingArchetype as JSON */
  data: text({ mode: 'json' }).notNull(),
});

/** Town configurations — Ashford, Millbrook, Ravensgate, etc. */
export const towns = sqliteTable('towns', {
  id: text().primaryKey(),
  name: text().notNull(),
  anchorId: text('anchor_id'),
  layout: text().notNull(),
  boundary: text().notNull(),
  /** Full TownConfig as JSON */
  data: text({ mode: 'json' }).notNull(),
});

/** Roadside features — shrines, ruins, wells, etc. */
export const features = sqliteTable('features', {
  id: text().primaryKey(),
  name: text().notNull(),
  tier: text().notNull(),
  visualType: text('visual_type').notNull(),
  interactable: int({ mode: 'boolean' }).notNull().default(false),
  /** Full FeatureDefinition as JSON */
  data: text({ mode: 'json' }).notNull(),
});

/** Quest definitions — main chapters + side quests */
export const quests = sqliteTable('quests', {
  id: text().primaryKey(),
  name: text().notNull(),
  tier: text().notNull(),
  /** 'main' or 'side' */
  questType: text('quest_type').notNull(),
  /** Ordering index for main quest chapters */
  chapterIndex: int('chapter_index'),
  /** Full QuestDefinition as JSON */
  data: text({ mode: 'json' }).notNull(),
});

/** Dungeon layouts — room graphs with connections */
export const dungeons = sqliteTable('dungeons', {
  id: text().primaryKey(),
  name: text().notNull(),
  anchorId: text('anchor_id').notNull(),
  recommendedLevel: int('recommended_level').notNull(),
  /** Full DungeonLayout as JSON */
  data: text({ mode: 'json' }).notNull(),
});

/** Narrative encounters — authored combat/puzzle/social/stealth/survival */
export const encounters = sqliteTable('encounters', {
  id: text().primaryKey(),
  name: text().notNull(),
  encounterType: text('encounter_type').notNull(),
  difficulty: int().notNull(),
  /** Full EncounterDefinition as JSON */
  data: text({ mode: 'json' }).notNull(),
});

/** Road spine — world topology and anchor points */
export const roadSpine = sqliteTable('road_spine', {
  key: text().primaryKey().default('main'),
  /** Full RoadSpine as JSON */
  data: text({ mode: 'json' }).notNull(),
});

/** Pacing configuration */
export const pacingConfig = sqliteTable('pacing_config', {
  key: text().primaryKey().default('main'),
  /** Full PacingConfig as JSON */
  data: text({ mode: 'json' }).notNull(),
});

// ═══════════════════════════════════════════════════════════════════════
// SAVE STATE TABLES — read-write, populated at runtime
// ═══════════════════════════════════════════════════════════════════════

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
  /** Item definition ID → items.id */
  itemId: text().notNull(),
  quantity: int().notNull().default(1),
  /** Equipment slot if equipped, null if in inventory */
  equippedSlot: text(),
});

/** Quest progress per save slot */
export const questProgressTable = sqliteTable('quest_progress', {
  id: int().primaryKey(),
  saveSlotId: int()
    .notNull()
    .references(() => saveSlots.id),
  /** Quest definition ID → quests.id */
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
export const chunkDeltasTable = sqliteTable('chunk_deltas', {
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
