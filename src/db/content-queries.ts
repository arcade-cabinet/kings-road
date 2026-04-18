/**
 * Content query layer — typed read-only access to game.db content tables.
 *
 * This replaces 120+ individual JSON imports across EncounterSystem,
 * town-configs, feature-placement, and combat-resolver. All content
 * is queried from the SQLite database compiled by scripts/compile-content-db.ts.
 *
 * Usage:
 *   import { getMonster, getItemsByType, getEncounterTable } from '@/db/content-queries';
 *   const wolf = getMonster('wolf');
 *   const consumables = getItemsByType('consumable');
 *   const tier2 = getEncounterTable(2);
 */

import type { BuildingArchetype } from '@/schemas/building.schema';
import type { DungeonLayout } from '@/schemas/dungeon.schema';
import type { EncounterDefinition } from '@/schemas/encounter.schema';
import type {
  EncounterTable,
  LootTable,
} from '@/schemas/encounter-table.schema';
import type { FeatureDefinition } from '@/schemas/feature.schema';
import type { ItemDefinition } from '@/schemas/item.schema';
import type { MonsterArchetype } from '@/schemas/monster.schema';
import type { NPCDefinition } from '@/schemas/npc.schema';
import type { NPCBlueprint } from '@/schemas/npc-blueprint.schema';
import type { TownConfig } from '@/schemas/town.schema';

// ── In-memory content store ────────────────────────────────────────────
// Populated once at startup from game.db, then read-only.
// This avoids async DB queries in hot render loops (useFrame).

interface ContentStore {
  monsters: Map<string, MonsterArchetype>;
  items: Map<string, ItemDefinition>;
  encounterTables: Map<number, EncounterTable>;
  lootTables: Map<string, LootTable>;
  npcsNamed: Map<string, NPCBlueprint>;
  npcPools: Map<string, NPCDefinition>;
  buildings: Map<string, BuildingArchetype>;
  towns: Map<string, TownConfig>;
  features: Map<string, FeatureDefinition>;
  quests: Map<string, unknown>;
  dungeons: Map<string, DungeonLayout>;
  encounters: Map<string, EncounterDefinition>;
  roadSpine: unknown | null;
  pacingConfig: unknown | null;
}

let store: ContentStore | null = null;

/**
 * Initialize the content store from raw DB query results.
 * Called once during game startup (loading screen phase).
 */
export function initContentStore(rows: {
  monsters: Array<{ id: string; data: string }>;
  items: Array<{ id: string; data: string }>;
  encounterTables: Array<{
    id: string;
    danger_tier: number;
    loot_table_id: string | null;
    entries: Array<{
      monster_id: string;
      weight: number;
      count_min: number;
      count_max: number;
    }>;
  }>;
  lootTables: Array<{
    id: string;
    entries: Array<{
      item_id: string;
      weight: number;
      quantity_min: number;
      quantity_max: number;
    }>;
  }>;
  npcsNamed: Array<{ id: string; data: string }>;
  npcPools: Array<{ archetype: string; data: string }>;
  buildings: Array<{ id: string; data: string }>;
  towns: Array<{ id: string; data: string }>;
  features: Array<{ id: string; data: string }>;
  quests: Array<{ id: string; data: string }>;
  dungeons: Array<{ id: string; data: string }>;
  encounters: Array<{ id: string; data: string }>;
  roadSpine: string | null;
  pacingConfig: string | null;
}): void {
  store = {
    monsters: new Map(rows.monsters.map((r) => [r.id, JSON.parse(r.data)])),
    items: new Map(rows.items.map((r) => [r.id, JSON.parse(r.data)])),
    encounterTables: new Map(
      rows.encounterTables.map((r) => [
        r.danger_tier,
        {
          id: r.id,
          dangerTier: r.danger_tier,
          lootTable: r.loot_table_id ?? undefined,
          entries: r.entries.map((e) => ({
            monsterId: e.monster_id,
            weight: e.weight,
            count: [e.count_min, e.count_max] as [number, number],
          })),
        },
      ]),
    ),
    lootTables: new Map(
      rows.lootTables.map((r) => [
        r.id,
        {
          id: r.id,
          entries: r.entries.map((e) => ({
            itemId: e.item_id,
            weight: e.weight,
            quantity: [e.quantity_min, e.quantity_max] as [number, number],
          })),
        },
      ]),
    ),
    npcsNamed: new Map(rows.npcsNamed.map((r) => [r.id, JSON.parse(r.data)])),
    npcPools: new Map(
      rows.npcPools.map((r) => [r.archetype, JSON.parse(r.data)]),
    ),
    buildings: new Map(rows.buildings.map((r) => [r.id, JSON.parse(r.data)])),
    towns: new Map(rows.towns.map((r) => [r.id, JSON.parse(r.data)])),
    features: new Map(rows.features.map((r) => [r.id, JSON.parse(r.data)])),
    quests: new Map(rows.quests.map((r) => [r.id, JSON.parse(r.data)])),
    dungeons: new Map(rows.dungeons.map((r) => [r.id, JSON.parse(r.data)])),
    encounters: new Map(rows.encounters.map((r) => [r.id, JSON.parse(r.data)])),
    roadSpine: rows.roadSpine ? JSON.parse(rows.roadSpine) : null,
    pacingConfig: rows.pacingConfig ? JSON.parse(rows.pacingConfig) : null,
  };
}

function getStore(): ContentStore {
  if (!store) {
    throw new Error(
      'Content store not initialized. Call initContentStore() during loading.',
    );
  }
  return store;
}

/** Check if the content store has been initialized */
export function isContentStoreReady(): boolean {
  return store !== null;
}

// ── Monster queries ────────────────────────────────────────────────────

export function getMonster(id: string): MonsterArchetype | undefined {
  return getStore().monsters.get(id);
}

export function getAllMonsters(): MonsterArchetype[] {
  return Array.from(getStore().monsters.values());
}

export function getMonstersByTier(tier: number): MonsterArchetype[] {
  return getAllMonsters().filter((m) => m.dangerTier === tier);
}

// ── Item queries ───────────────────────────────────────────────────────

export function getItem(id: string): ItemDefinition | undefined {
  return getStore().items.get(id);
}

export function getAllItems(): ItemDefinition[] {
  return Array.from(getStore().items.values());
}

export function getItemsByType(type: string): ItemDefinition[] {
  return getAllItems().filter((i) => i.type === type);
}

// ── Encounter table queries ────────────────────────────────────────────

export function getEncounterTable(tier: number): EncounterTable | undefined {
  return getStore().encounterTables.get(tier);
}

// ── Loot table queries ─────────────────────────────────────────────────

export function getLootTable(id: string): LootTable | undefined {
  return getStore().lootTables.get(id);
}

export function getLootTableByTier(tier: number): LootTable | undefined {
  return getStore().lootTables.get(`loot-tier-${tier}`);
}

// ── NPC queries ────────────────────────────────────────────────────────

export function getNamedNpc(id: string): NPCBlueprint | undefined {
  return getStore().npcsNamed.get(id);
}

export function getAllNamedNpcs(): NPCBlueprint[] {
  return Array.from(getStore().npcsNamed.values());
}

export function getNpcPool(archetype: string): NPCDefinition | undefined {
  return getStore().npcPools.get(archetype);
}

export function getAllNpcPools(): NPCDefinition[] {
  return Array.from(getStore().npcPools.values());
}

// ── Building queries ───────────────────────────────────────────────────

export function getBuilding(id: string): BuildingArchetype | undefined {
  return getStore().buildings.get(id);
}

export function getAllBuildings(): BuildingArchetype[] {
  return Array.from(getStore().buildings.values());
}

// ── Town queries ───────────────────────────────────────────────────────

export function getTown(id: string): TownConfig | undefined {
  return getStore().towns.get(id);
}

export function getAllTowns(): TownConfig[] {
  return Array.from(getStore().towns.values());
}

// ── Feature queries ────────────────────────────────────────────────────

export function getFeature(id: string): FeatureDefinition | undefined {
  return getStore().features.get(id);
}

export function getAllFeatures(): FeatureDefinition[] {
  return Array.from(getStore().features.values());
}

export function getFeaturesByTier(tier: string): FeatureDefinition[] {
  return getAllFeatures().filter((f) => f.tier === tier);
}

// ── Quest queries ──────────────────────────────────────────────────────

export function getQuest(id: string): unknown {
  return getStore().quests.get(id);
}

export function getAllQuests(): unknown[] {
  return Array.from(getStore().quests.values());
}

// ── Dungeon queries ────────────────────────────────────────────────────

export function getDungeon(id: string): DungeonLayout | undefined {
  return getStore().dungeons.get(id);
}

export function getAllDungeons(): DungeonLayout[] {
  return Array.from(getStore().dungeons.values());
}

// ── Encounter queries ──────────────────────────────────────────────────

export function getEncounter(id: string): EncounterDefinition | undefined {
  return getStore().encounters.get(id);
}

export function getEncountersByType(type: string): EncounterDefinition[] {
  return Array.from(getStore().encounters.values()).filter(
    (e) => e.type === type,
  );
}

// ── World data queries ─────────────────────────────────────────────────

export function getRoadSpine(): unknown {
  return getStore().roadSpine;
}

export function getPacingConfig(): unknown {
  return getStore().pacingConfig;
}
