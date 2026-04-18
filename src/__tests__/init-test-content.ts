/**
 * Test helper — initializes the ContentStore from JSON files on disk.
 *
 * This mirrors what compile-content-db.ts + load-content-db.ts do at runtime,
 * but skips the SQLite step. Called once in vitest globalSetup so every test
 * file has content available.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { initContentStore } from '@/db/content-queries';

const ROOT = path.resolve(__dirname, '../..');
const CONTENT = path.join(ROOT, 'content');

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function readAllJson(dir: string): unknown[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => readJson(path.join(dir, f)));
}

export function initTestContent(): void {
  // --- Monsters ---
  const monsters = readAllJson(path.join(CONTENT, 'monsters')).map(
    (m: any) => ({
      id: m.id,
      data: JSON.stringify(m),
    }),
  );

  // --- Items ---
  const items = readAllJson(path.join(CONTENT, 'items')).map((i: any) => ({
    id: i.id,
    data: JSON.stringify(i),
  }));

  // --- Encounter tables (tier files) ---
  const encounterTables: Array<{
    id: string;
    danger_tier: number;
    loot_table_id: string | null;
    entries: Array<{
      monster_id: string;
      weight: number;
      count_min: number;
      count_max: number;
    }>;
  }> = [];

  for (let tier = 0; tier <= 4; tier++) {
    const tierFile = path.join(CONTENT, 'encounters', `tier-${tier}.json`);
    if (!fs.existsSync(tierFile)) continue;
    const table = readJson(tierFile) as any;
    encounterTables.push({
      id: table.id,
      danger_tier: table.dangerTier,
      loot_table_id: table.lootTable ?? null,
      entries: (table.entries ?? []).map((e: any) => ({
        monster_id: e.monsterId,
        weight: e.weight,
        count_min: e.count[0],
        count_max: e.count[1],
      })),
    });
  }

  // --- Loot tables ---
  const lootTablesRaw = readAllJson(path.join(CONTENT, 'loot'));
  const lootTables = lootTablesRaw.map((lt: any) => ({
    id: lt.id,
    entries: (lt.entries ?? []).map((e: any) => ({
      item_id: e.itemId,
      weight: e.weight,
      quantity_min: e.quantity[0],
      quantity_max: e.quantity[1],
    })),
  }));

  // --- Named NPCs ---
  const npcsNamedDir = path.join(CONTENT, 'npcs');
  const npcsNamed: Array<{ id: string; data: string }> = [];
  if (fs.existsSync(npcsNamedDir)) {
    for (const f of fs.readdirSync(npcsNamedDir).sort()) {
      if (!f.endsWith('.json')) continue;
      const fullPath = path.join(npcsNamedDir, f);
      if (fs.statSync(fullPath).isDirectory()) continue;
      const npc = readJson(fullPath) as any;
      npcsNamed.push({ id: npc.id, data: JSON.stringify(npc) });
    }
  }

  // --- NPC Pools ---
  const npcPools = readAllJson(path.join(CONTENT, 'npcs', 'pools')).map(
    (pool: any) => ({
      archetype: pool.id ?? pool.archetype,
      data: JSON.stringify(pool),
    }),
  );

  // --- Buildings ---
  const buildings = readAllJson(path.join(CONTENT, 'buildings')).map(
    (b: any) => ({
      id: b.id,
      data: JSON.stringify(b),
    }),
  );

  // --- Towns ---
  const towns = readAllJson(path.join(CONTENT, 'towns')).map((t: any) => ({
    id: t.id,
    data: JSON.stringify(t),
  }));

  // --- Features ---
  const features = readAllJson(path.join(CONTENT, 'features')).map(
    (f: any) => ({
      id: f.id,
      data: JSON.stringify(f),
    }),
  );

  // --- Quests (main + side) ---
  const quests: Array<{ id: string; data: string }> = [];
  const mainQuests = readAllJson(path.join(CONTENT, 'quests', 'main'));
  for (const q of mainQuests as any[]) {
    quests.push({ id: q.id, data: JSON.stringify(q) });
  }
  const sideQuests = readAllJson(path.join(CONTENT, 'quests', 'side'));
  for (const q of sideQuests as any[]) {
    quests.push({ id: q.id, data: JSON.stringify(q) });
  }

  // --- Dungeons ---
  const dungeons = readAllJson(path.join(CONTENT, 'dungeons')).map(
    (d: any) => ({
      id: d.id,
      data: JSON.stringify(d),
    }),
  );

  // --- Narrative encounters ---
  const encounters: Array<{ id: string; data: string }> = [];
  for (const sub of ['combat', 'puzzle', 'social', 'stealth', 'survival']) {
    const subDir = path.join(CONTENT, 'encounters', sub);
    if (!fs.existsSync(subDir)) continue;
    for (const e of readAllJson(subDir) as any[]) {
      encounters.push({ id: e.id, data: JSON.stringify(e) });
    }
  }

  // --- Road spine ---
  const spineFile = path.join(CONTENT, 'world', 'road-spine.json');
  const roadSpine = fs.existsSync(spineFile)
    ? JSON.stringify(readJson(spineFile))
    : null;

  // --- Pacing config ---
  const pacingFile = path.join(CONTENT, 'pacing', 'config.json');
  const pacingConfig = fs.existsSync(pacingFile)
    ? JSON.stringify(readJson(pacingFile))
    : null;

  // Initialize the content store
  initContentStore({
    monsters,
    items,
    encounterTables,
    lootTables,
    npcsNamed,
    npcPools,
    buildings,
    towns,
    features,
    quests,
    dungeons,
    encounters,
    roadSpine,
    pacingConfig,
  });
}
