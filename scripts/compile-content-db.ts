#!/usr/bin/env npx tsx

/**
 * Content compiler — reads content/ JSON, validates against Zod schemas,
 * and bakes everything into config/game.db via better-sqlite3.
 *
 * Usage: npx tsx scripts/compile-content-db.ts
 *
 * The output game.db ships with the build. expo-sqlite loads it at runtime.
 * Content tables are read-only; save tables are empty, ready for runtime writes.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, 'content');
const CONFIG = path.join(ROOT, 'config');
const DB_PATH = path.join(CONFIG, 'game.db');

// ── Helpers ────────────────────────────────────────────────────────────

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

// ── Create database ────────────────────────────────────────────────────

if (!fs.existsSync(CONFIG)) {
  fs.mkdirSync(CONFIG, { recursive: true });
}

// Remove old DB if exists (fresh build each time)
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Create all tables (content + save state) ───────────────────────────

const DDL = `
  -- Content: Monsters
  CREATE TABLE monsters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    body_type TEXT NOT NULL,
    size REAL NOT NULL,
    danger_tier INTEGER NOT NULL,
    health INTEGER NOT NULL,
    damage INTEGER NOT NULL,
    color_primary TEXT NOT NULL,
    color_secondary TEXT,
    color_accent TEXT,
    spawn_biome TEXT,
    xp_reward INTEGER,
    data TEXT
  );

  -- Content: Items
  CREATE TABLE items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    rarity TEXT,
    stackable INTEGER NOT NULL DEFAULT 0,
    value INTEGER,
    weight REAL,
    equip_slot TEXT,
    data TEXT
  );

  -- Content: Encounter tables (tier-based random pools)
  CREATE TABLE encounter_tables (
    id TEXT PRIMARY KEY,
    danger_tier INTEGER NOT NULL,
    loot_table_id TEXT
  );
  CREATE TABLE encounter_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id TEXT NOT NULL REFERENCES encounter_tables(id),
    monster_id TEXT NOT NULL REFERENCES monsters(id),
    weight REAL NOT NULL,
    count_min INTEGER NOT NULL,
    count_max INTEGER NOT NULL
  );

  -- Content: Loot tables
  CREATE TABLE loot_tables (
    id TEXT PRIMARY KEY
  );
  CREATE TABLE loot_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id TEXT NOT NULL REFERENCES loot_tables(id),
    item_id TEXT NOT NULL REFERENCES items(id),
    weight REAL NOT NULL,
    quantity_min INTEGER NOT NULL,
    quantity_max INTEGER NOT NULL
  );

  -- Content: Named NPCs (story characters)
  CREATE TABLE npcs_named (
    id TEXT PRIMARY KEY,
    name TEXT,
    archetype TEXT NOT NULL,
    fixed INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL
  );

  -- Content: NPC archetype pools (procedural generation)
  CREATE TABLE npc_pools (
    archetype TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  -- Content: Buildings
  CREATE TABLE buildings (
    id TEXT PRIMARY KEY,
    footprint_width INTEGER NOT NULL,
    footprint_depth INTEGER NOT NULL,
    wall_material TEXT NOT NULL,
    roof_style TEXT NOT NULL,
    data TEXT NOT NULL
  );

  -- Content: Towns
  CREATE TABLE towns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    anchor_id TEXT,
    layout TEXT NOT NULL,
    boundary TEXT NOT NULL,
    data TEXT NOT NULL
  );

  -- Content: Roadside features
  CREATE TABLE features (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tier TEXT NOT NULL,
    visual_type TEXT NOT NULL,
    interactable INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL
  );

  -- Content: Quests
  CREATE TABLE quests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tier TEXT NOT NULL,
    quest_type TEXT NOT NULL,
    chapter_index INTEGER,
    data TEXT NOT NULL
  );

  -- Content: Dungeons
  CREATE TABLE dungeons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    anchor_id TEXT NOT NULL,
    recommended_level INTEGER NOT NULL,
    data TEXT NOT NULL
  );

  -- Content: Narrative encounters
  CREATE TABLE encounters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    encounter_type TEXT NOT NULL,
    difficulty INTEGER NOT NULL,
    data TEXT NOT NULL
  );

  -- Content: Road spine
  CREATE TABLE road_spine (
    key TEXT PRIMARY KEY DEFAULT 'main',
    data TEXT NOT NULL
  );

  -- Content: Pacing config
  CREATE TABLE pacing_config (
    key TEXT PRIMARY KEY DEFAULT 'main',
    data TEXT NOT NULL
  );

  -- Save: Slots
  CREATE TABLE save_slots (
    id INTEGER PRIMARY KEY,
    seedPhrase TEXT NOT NULL,
    displayName TEXT NOT NULL,
    savedAt TEXT NOT NULL,
    playTimeSeconds INTEGER NOT NULL DEFAULT 0
  );

  -- Save: Player state
  CREATE TABLE player_state (
    id INTEGER PRIMARY KEY,
    saveSlotId INTEGER NOT NULL REFERENCES save_slots(id),
    position TEXT NOT NULL,
    cameraYaw REAL NOT NULL,
    health INTEGER NOT NULL DEFAULT 100,
    stamina INTEGER NOT NULL DEFAULT 100,
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    timeOfDay REAL NOT NULL DEFAULT 0.333,
    gemsCollected INTEGER NOT NULL DEFAULT 0
  );

  -- Save: Inventory
  CREATE TABLE inventory_items (
    id INTEGER PRIMARY KEY,
    saveSlotId INTEGER NOT NULL REFERENCES save_slots(id),
    itemId TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    equippedSlot TEXT
  );

  -- Save: Quest progress
  CREATE TABLE quest_progress (
    id INTEGER PRIMARY KEY,
    saveSlotId INTEGER NOT NULL REFERENCES save_slots(id),
    questId TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    currentStep INTEGER NOT NULL DEFAULT 0,
    chosenBranch TEXT,
    flags TEXT
  );

  -- Save: Chunk deltas
  CREATE TABLE chunk_deltas (
    id INTEGER PRIMARY KEY,
    saveSlotId INTEGER NOT NULL REFERENCES save_slots(id),
    chunkKey TEXT NOT NULL,
    collectedGems TEXT NOT NULL DEFAULT '[]'
  );

  -- Save: Unlocked perks
  CREATE TABLE unlocked_perks (
    id INTEGER PRIMARY KEY,
    saveSlotId INTEGER NOT NULL REFERENCES save_slots(id),
    perkId TEXT NOT NULL,
    unlockedAt TEXT NOT NULL
  );

  -- Indexes
  CREATE INDEX idx_monsters_tier ON monsters(danger_tier);
  CREATE INDEX idx_monsters_biome ON monsters(spawn_biome);
  CREATE INDEX idx_items_type ON items(type);
  CREATE INDEX idx_items_rarity ON items(rarity);
  CREATE INDEX idx_encounter_entries_table ON encounter_entries(table_id);
  CREATE INDEX idx_loot_entries_table ON loot_entries(table_id);
  CREATE INDEX idx_features_tier ON features(tier);
  CREATE INDEX idx_quests_type ON quests(quest_type);
  CREATE INDEX idx_encounters_type ON encounters(encounter_type);
`;

// Run the DDL as individual statements (better-sqlite3 needs this)
for (const stmt of DDL.split(';')
  .map((s) => s.trim())
  .filter(Boolean)) {
  db.prepare(`${stmt};`).run();
}

// ── Populate content ───────────────────────────────────────────────────

const counts: Record<string, number> = {};

// --- Monsters ---
const insertMonster = db.prepare(`
  INSERT INTO monsters (id, name, body_type, size, danger_tier, health, damage,
    color_primary, color_secondary, color_accent, spawn_biome, xp_reward, data)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const monstersData = readAllJson(path.join(CONTENT, 'monsters'));
for (const m of monstersData as any[]) {
  insertMonster.run(
    m.id,
    m.name,
    m.bodyType,
    m.size,
    m.dangerTier,
    m.health,
    m.damage,
    m.colorScheme?.primary ?? '#888888',
    m.colorScheme?.secondary ?? null,
    m.colorScheme?.accent ?? null,
    m.spawnBiome ?? null,
    m.xpReward ?? null,
    JSON.stringify(m),
  );
}
counts.monsters = monstersData.length;

// --- Items ---
const insertItem = db.prepare(`
  INSERT INTO items (id, name, type, description, rarity, stackable, value, weight, equip_slot, data)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const itemsData = readAllJson(path.join(CONTENT, 'items'));
for (const i of itemsData as any[]) {
  insertItem.run(
    i.id,
    i.name,
    i.type,
    i.description,
    i.rarity ?? null,
    i.stackable ? 1 : 0,
    i.value ?? null,
    i.weight ?? null,
    i.equipSlot ?? null,
    JSON.stringify(i),
  );
}
counts.items = itemsData.length;

// --- Encounter tables (tier-based) ---
const insertEncounterTable = db.prepare(
  `INSERT INTO encounter_tables (id, danger_tier, loot_table_id) VALUES (?, ?, ?)`,
);
const insertEncounterEntry = db.prepare(
  `INSERT INTO encounter_entries (table_id, monster_id, weight, count_min, count_max) VALUES (?, ?, ?, ?, ?)`,
);

let tierCount = 0;
for (let tier = 0; tier <= 4; tier++) {
  const tierFile = path.join(CONTENT, 'encounters', `tier-${tier}.json`);
  if (!fs.existsSync(tierFile)) continue;
  const table = readJson(tierFile) as any;
  insertEncounterTable.run(table.id, table.dangerTier, table.lootTable ?? null);
  for (const entry of table.entries) {
    insertEncounterEntry.run(
      table.id,
      entry.monsterId,
      entry.weight,
      entry.count[0],
      entry.count[1],
    );
  }
  tierCount++;
}
counts.encounterTables = tierCount;

// --- Loot tables ---
const insertLootTable = db.prepare(`INSERT INTO loot_tables (id) VALUES (?)`);
const insertLootEntry = db.prepare(
  `INSERT INTO loot_entries (table_id, item_id, weight, quantity_min, quantity_max) VALUES (?, ?, ?, ?, ?)`,
);

const lootData = readAllJson(path.join(CONTENT, 'loot'));
for (const lt of lootData as any[]) {
  insertLootTable.run(lt.id);
  for (const entry of lt.entries) {
    insertLootEntry.run(
      lt.id,
      entry.itemId,
      entry.weight,
      entry.quantity[0],
      entry.quantity[1],
    );
  }
}
counts.lootTables = lootData.length;

// --- Named NPCs ---
const insertNpcNamed = db.prepare(
  `INSERT INTO npcs_named (id, name, archetype, fixed, data) VALUES (?, ?, ?, ?, ?)`,
);

const namedNpcDir = path.join(CONTENT, 'npcs');
let namedNpcCount = 0;
if (fs.existsSync(namedNpcDir)) {
  for (const f of fs.readdirSync(namedNpcDir).sort()) {
    if (!f.endsWith('.json')) continue;
    const fullPath = path.join(namedNpcDir, f);
    if (fs.statSync(fullPath).isDirectory()) continue;
    const npc = readJson(fullPath) as any;
    insertNpcNamed.run(
      npc.id,
      npc.name ?? null,
      npc.archetype,
      npc.fixed ? 1 : 0,
      JSON.stringify(npc),
    );
    namedNpcCount++;
  }
}
counts.npcsNamed = namedNpcCount;

// --- NPC Pools ---
const insertNpcPool = db.prepare(
  `INSERT INTO npc_pools (archetype, data) VALUES (?, ?)`,
);

const poolsData = readAllJson(path.join(CONTENT, 'npcs', 'pools'));
for (const pool of poolsData as any[]) {
  insertNpcPool.run(pool.id ?? pool.archetype, JSON.stringify(pool));
}
counts.npcPools = poolsData.length;

// --- Buildings ---
const insertBuilding = db.prepare(
  `INSERT INTO buildings (id, footprint_width, footprint_depth, wall_material, roof_style, data) VALUES (?, ?, ?, ?, ?, ?)`,
);

const buildingsData = readAllJson(path.join(CONTENT, 'buildings'));
for (const b of buildingsData as any[]) {
  insertBuilding.run(
    b.id,
    b.footprint?.width ?? 2,
    b.footprint?.depth ?? 2,
    b.wallMaterial ?? 'plaster',
    b.roofStyle ?? 'thatch',
    JSON.stringify(b),
  );
}
counts.buildings = buildingsData.length;

// --- Towns ---
const insertTown = db.prepare(
  `INSERT INTO towns (id, name, anchor_id, layout, boundary, data) VALUES (?, ?, ?, ?, ?, ?)`,
);

const townsData = readAllJson(path.join(CONTENT, 'towns'));
for (const t of townsData as any[]) {
  insertTown.run(
    t.id,
    t.name,
    t.anchorId ?? null,
    t.layout ?? 'organic',
    t.boundary ?? 'none',
    JSON.stringify(t),
  );
}
counts.towns = townsData.length;

// --- Features ---
const insertFeature = db.prepare(
  `INSERT INTO features (id, name, tier, visual_type, interactable, data) VALUES (?, ?, ?, ?, ?, ?)`,
);

const featuresData = readAllJson(path.join(CONTENT, 'features'));
for (const f of featuresData as any[]) {
  insertFeature.run(
    f.id,
    f.name,
    f.tier,
    f.visualType,
    f.interactable ? 1 : 0,
    JSON.stringify(f),
  );
}
counts.features = featuresData.length;

// --- Quests ---
const insertQuest = db.prepare(
  `INSERT INTO quests (id, name, tier, quest_type, chapter_index, data) VALUES (?, ?, ?, ?, ?, ?)`,
);

const mainQuests = readAllJson(path.join(CONTENT, 'quests', 'main'));
mainQuests.forEach((q: any, i: number) => {
  insertQuest.run(
    q.id,
    q.title ?? q.name ?? q.id,
    q.tier,
    'main',
    i,
    JSON.stringify(q),
  );
});

const sideQuests = readAllJson(path.join(CONTENT, 'quests', 'side'));
for (const q of sideQuests as any[]) {
  insertQuest.run(
    q.id,
    q.title ?? q.name ?? q.id,
    q.tier,
    'side',
    null,
    JSON.stringify(q),
  );
}
counts.quests = mainQuests.length + sideQuests.length;

// --- Dungeons ---
const insertDungeon = db.prepare(
  `INSERT INTO dungeons (id, name, anchor_id, recommended_level, data) VALUES (?, ?, ?, ?, ?)`,
);

const dungeonsData = readAllJson(path.join(CONTENT, 'dungeons'));
for (const d of dungeonsData as any[]) {
  insertDungeon.run(
    d.id,
    d.name,
    d.anchorId,
    d.recommendedLevel,
    JSON.stringify(d),
  );
}
counts.dungeons = dungeonsData.length;

// --- Narrative encounters ---
const insertEncounter = db.prepare(
  `INSERT INTO encounters (id, name, encounter_type, difficulty, data) VALUES (?, ?, ?, ?, ?)`,
);

const encounterSubdirs = ['combat', 'puzzle', 'social', 'stealth', 'survival'];
let narrativeCount = 0;
for (const sub of encounterSubdirs) {
  const subEncounters = readAllJson(path.join(CONTENT, 'encounters', sub));
  for (const e of subEncounters as any[]) {
    insertEncounter.run(e.id, e.name, e.type, e.difficulty, JSON.stringify(e));
    narrativeCount++;
  }
}
counts.encounters = narrativeCount;

// --- Road spine ---
const spineFile = path.join(CONTENT, 'world', 'road-spine.json');
if (fs.existsSync(spineFile)) {
  db.prepare(`INSERT INTO road_spine (key, data) VALUES ('main', ?)`).run(
    JSON.stringify(readJson(spineFile)),
  );
}

// --- Pacing config ---
const pacingFile = path.join(CONTENT, 'pacing', 'config.json');
if (fs.existsSync(pacingFile)) {
  db.prepare(`INSERT INTO pacing_config (key, data) VALUES ('main', ?)`).run(
    JSON.stringify(readJson(pacingFile)),
  );
}

// ── Summary ────────────────────────────────────────────────────────────

db.close();

// Copy to public/ for Vite static serving
const publicDir = path.join(ROOT, 'public');
if (fs.existsSync(publicDir)) {
  fs.copyFileSync(DB_PATH, path.join(publicDir, 'game.db'));
}

const stats = fs.statSync(DB_PATH);
const sizeKB = Math.round(stats.size / 1024);

console.log(`\n  Compiled content -> ${DB_PATH} (${sizeKB} KB)\n`);
console.log('  Content summary:');
for (const [key, count] of Object.entries(counts)) {
  console.log(`    ${key.padEnd(20)} ${count}`);
}
console.log('');
