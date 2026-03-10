/**
 * Loads game.db and populates the content store.
 *
 * Platform dispatch:
 *   - Web (Vite): fetches game.db as ArrayBuffer, opens with sql.js
 *   - Native (Expo): expo-sqlite opens from bundled asset
 *
 * Call this once during the loading screen, before any game system
 * tries to read content.
 */

import initSqlJs from 'sql.js';
import { initItemLoader } from '../game/world/item-loader';
import { initContentStore } from './content-queries';

/** Load game.db from the server and initialize the content store */
export async function loadContentDb(): Promise<void> {
  // Fetch the compiled game.db
  const response = await fetch('/game.db');
  if (!response.ok) {
    throw new Error(`Failed to fetch game.db: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();

  // Initialize sql.js with WASM
  const SQL = await initSqlJs({
    // sql.js will load its WASM from CDN by default
    // For production, bundle sql-wasm.wasm in public/
    locateFile: (file: string) => `/${file}`,
  });

  const db = new SQL.Database(new Uint8Array(buffer));

  // ── Query all content tables ──────────────────────────────────────

  const queryAll = (sql: string) => {
    const stmt = db.prepare(sql);
    const rows: Record<string, unknown>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  };

  // Monsters
  const monstersRaw = queryAll('SELECT id, data FROM monsters') as Array<{
    id: string;
    data: string;
  }>;

  // Items
  const itemsRaw = queryAll('SELECT id, data FROM items') as Array<{
    id: string;
    data: string;
  }>;

  // Encounter tables with entries joined
  const encounterTablesRaw = queryAll(
    'SELECT id, danger_tier, loot_table_id FROM encounter_tables',
  ) as Array<{ id: string; danger_tier: number; loot_table_id: string | null }>;

  const encounterEntriesRaw = queryAll(
    'SELECT table_id, monster_id, weight, count_min, count_max FROM encounter_entries',
  ) as Array<{
    table_id: string;
    monster_id: string;
    weight: number;
    count_min: number;
    count_max: number;
  }>;

  // Group entries by table
  const entriesByTable = new Map<string, typeof encounterEntriesRaw>();
  for (const entry of encounterEntriesRaw) {
    const existing = entriesByTable.get(entry.table_id) ?? [];
    existing.push(entry);
    entriesByTable.set(entry.table_id, existing);
  }

  const encounterTables = encounterTablesRaw.map((t) => ({
    ...t,
    entries: (entriesByTable.get(t.id) ?? []).map((e) => ({
      monster_id: e.monster_id,
      weight: e.weight,
      count_min: e.count_min,
      count_max: e.count_max,
    })),
  }));

  // Loot tables with entries joined
  const lootTablesRaw = queryAll('SELECT id FROM loot_tables') as Array<{
    id: string;
  }>;

  const lootEntriesRaw = queryAll(
    'SELECT table_id, item_id, weight, quantity_min, quantity_max FROM loot_entries',
  ) as Array<{
    table_id: string;
    item_id: string;
    weight: number;
    quantity_min: number;
    quantity_max: number;
  }>;

  const lootEntriesByTable = new Map<string, typeof lootEntriesRaw>();
  for (const entry of lootEntriesRaw) {
    const existing = lootEntriesByTable.get(entry.table_id) ?? [];
    existing.push(entry);
    lootEntriesByTable.set(entry.table_id, existing);
  }

  const lootTables = lootTablesRaw.map((t) => ({
    id: t.id,
    entries: (lootEntriesByTable.get(t.id) ?? []).map((e) => ({
      item_id: e.item_id,
      weight: e.weight,
      quantity_min: e.quantity_min,
      quantity_max: e.quantity_max,
    })),
  }));

  // Named NPCs
  const npcsNamedRaw = queryAll('SELECT id, data FROM npcs_named') as Array<{
    id: string;
    data: string;
  }>;

  // NPC Pools
  const npcPoolsRaw = queryAll(
    'SELECT archetype, data FROM npc_pools',
  ) as Array<{ archetype: string; data: string }>;

  // Buildings
  const buildingsRaw = queryAll('SELECT id, data FROM buildings') as Array<{
    id: string;
    data: string;
  }>;

  // Towns
  const townsRaw = queryAll('SELECT id, data FROM towns') as Array<{
    id: string;
    data: string;
  }>;

  // Features
  const featuresRaw = queryAll('SELECT id, data FROM features') as Array<{
    id: string;
    data: string;
  }>;

  // Quests
  const questsRaw = queryAll('SELECT id, data FROM quests') as Array<{
    id: string;
    data: string;
  }>;

  // Dungeons
  const dungeonsRaw = queryAll('SELECT id, data FROM dungeons') as Array<{
    id: string;
    data: string;
  }>;

  // Narrative encounters
  const encountersRaw = queryAll('SELECT id, data FROM encounters') as Array<{
    id: string;
    data: string;
  }>;

  // Road spine
  const roadSpineRow = queryAll(
    "SELECT data FROM road_spine WHERE key = 'main'",
  ) as Array<{ data: string }>;

  // Pacing config
  const pacingRow = queryAll(
    "SELECT data FROM pacing_config WHERE key = 'main'",
  ) as Array<{ data: string }>;

  // ── Populate the in-memory content store ──────────────────────────

  initContentStore({
    monsters: monstersRaw,
    items: itemsRaw,
    encounterTables,
    lootTables,
    npcsNamed: npcsNamedRaw,
    npcPools: npcPoolsRaw,
    buildings: buildingsRaw,
    towns: townsRaw,
    features: featuresRaw,
    quests: questsRaw,
    dungeons: dungeonsRaw,
    encounters: encountersRaw,
    roadSpine: roadSpineRow[0]?.data ?? null,
    pacingConfig: pacingRow[0]?.data ?? null,
  });

  // Populate the ECS item-registry from the content store
  initItemLoader();

  // Close the sql.js database (content is now in memory)
  db.close();
}
