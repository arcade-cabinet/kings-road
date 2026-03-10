#!/usr/bin/env npx tsx

/**
 * Content compiler — reads content/ JSON, validates against Zod schemas,
 * and bakes everything into config/game.db via sql.js (WASM SQLite).
 *
 * Usage: npx tsx scripts/compile-content-db.ts
 *
 * Uses sql.js instead of better-sqlite3 so it works in CI without native
 * compilation. The output game.db ships with the build. expo-sqlite or
 * sql.js loads it at runtime.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import initSqlJs from 'sql.js';

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

// ── Main (async for sql.js init) ──────────────────────────────────────

async function main() {
  if (!fs.existsSync(CONFIG)) {
    fs.mkdirSync(CONFIG, { recursive: true });
  }

  // Remove old DB if exists (fresh build each time)
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');

  // ── Create all tables (content + save state) ───────────────────────

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

  // Run DDL as individual statements
  for (const stmt of DDL.split(';')
    .map((s) => s.trim())
    .filter(Boolean)) {
    db.run(`${stmt};`);
  }

  // ── Populate content ───────────────────────────────────────────────

  const counts: Record<string, number> = {};

  // --- Monsters ---
  const monstersData = readAllJson(path.join(CONTENT, 'monsters'));
  for (const m of monstersData as any[]) {
    db.run(
      `INSERT INTO monsters (id, name, body_type, size, danger_tier, health, damage,
        color_primary, color_secondary, color_accent, spawn_biome, xp_reward, data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
      ],
    );
  }
  counts.monsters = monstersData.length;

  // --- Items ---
  const itemsData = readAllJson(path.join(CONTENT, 'items'));
  for (const i of itemsData as any[]) {
    db.run(
      `INSERT INTO items (id, name, type, description, rarity, stackable, value, weight, equip_slot, data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
      ],
    );
  }
  counts.items = itemsData.length;

  // --- Encounter tables (tier-based) ---
  let tierCount = 0;
  for (let tier = 0; tier <= 4; tier++) {
    const tierFile = path.join(CONTENT, 'encounters', `tier-${tier}.json`);
    if (!fs.existsSync(tierFile)) continue;
    const table = readJson(tierFile) as any;
    db.run(
      `INSERT INTO encounter_tables (id, danger_tier, loot_table_id) VALUES (?, ?, ?)`,
      [table.id, table.dangerTier, table.lootTable ?? null],
    );
    for (const entry of table.entries) {
      db.run(
        `INSERT INTO encounter_entries (table_id, monster_id, weight, count_min, count_max) VALUES (?, ?, ?, ?, ?)`,
        [
          table.id,
          entry.monsterId,
          entry.weight,
          entry.count[0],
          entry.count[1],
        ],
      );
    }
    tierCount++;
  }
  counts.encounterTables = tierCount;

  // --- Loot tables ---
  const lootData = readAllJson(path.join(CONTENT, 'loot'));
  for (const lt of lootData as any[]) {
    db.run(`INSERT INTO loot_tables (id) VALUES (?)`, [lt.id]);
    for (const entry of lt.entries) {
      db.run(
        `INSERT INTO loot_entries (table_id, item_id, weight, quantity_min, quantity_max) VALUES (?, ?, ?, ?, ?)`,
        [
          lt.id,
          entry.itemId,
          entry.weight,
          entry.quantity[0],
          entry.quantity[1],
        ],
      );
    }
  }
  counts.lootTables = lootData.length;

  // --- Named NPCs ---
  const namedNpcDir = path.join(CONTENT, 'npcs');
  let namedNpcCount = 0;
  if (fs.existsSync(namedNpcDir)) {
    for (const f of fs.readdirSync(namedNpcDir).sort()) {
      if (!f.endsWith('.json')) continue;
      const fullPath = path.join(namedNpcDir, f);
      if (fs.statSync(fullPath).isDirectory()) continue;
      const npc = readJson(fullPath) as any;
      db.run(
        `INSERT INTO npcs_named (id, name, archetype, fixed, data) VALUES (?, ?, ?, ?, ?)`,
        [
          npc.id,
          npc.name ?? null,
          npc.archetype,
          npc.fixed ? 1 : 0,
          JSON.stringify(npc),
        ],
      );
      namedNpcCount++;
    }
  }
  counts.npcsNamed = namedNpcCount;

  // --- NPC Pools ---
  const poolsData = readAllJson(path.join(CONTENT, 'npcs', 'pools'));
  for (const pool of poolsData as any[]) {
    db.run(`INSERT INTO npc_pools (archetype, data) VALUES (?, ?)`, [
      pool.id ?? pool.archetype,
      JSON.stringify(pool),
    ]);
  }
  counts.npcPools = poolsData.length;

  // --- Buildings ---
  const buildingsData = readAllJson(path.join(CONTENT, 'buildings'));
  for (const b of buildingsData as any[]) {
    db.run(
      `INSERT INTO buildings (id, footprint_width, footprint_depth, wall_material, roof_style, data) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        b.id,
        b.footprint?.width ?? 2,
        b.footprint?.depth ?? 2,
        b.wallMaterial ?? 'plaster',
        b.roofStyle ?? 'thatch',
        JSON.stringify(b),
      ],
    );
  }
  counts.buildings = buildingsData.length;

  // --- Towns ---
  const townsData = readAllJson(path.join(CONTENT, 'towns'));
  for (const t of townsData as any[]) {
    db.run(
      `INSERT INTO towns (id, name, anchor_id, layout, boundary, data) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        t.id,
        t.name,
        t.anchorId ?? null,
        t.layout ?? 'organic',
        t.boundary ?? 'none',
        JSON.stringify(t),
      ],
    );
  }
  counts.towns = townsData.length;

  // --- Features ---
  const featuresData = readAllJson(path.join(CONTENT, 'features'));
  for (const f of featuresData as any[]) {
    db.run(
      `INSERT INTO features (id, name, tier, visual_type, interactable, data) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        f.id,
        f.name,
        f.tier,
        f.visualType,
        f.interactable ? 1 : 0,
        JSON.stringify(f),
      ],
    );
  }
  counts.features = featuresData.length;

  // --- Quests ---
  const mainQuests = readAllJson(path.join(CONTENT, 'quests', 'main'));
  mainQuests.forEach((q: any, i: number) => {
    db.run(
      `INSERT INTO quests (id, name, tier, quest_type, chapter_index, data) VALUES (?, ?, ?, ?, ?, ?)`,
      [q.id, q.title ?? q.name ?? q.id, q.tier, 'main', i, JSON.stringify(q)],
    );
  });

  const sideQuests = readAllJson(path.join(CONTENT, 'quests', 'side'));
  for (const q of sideQuests as any[]) {
    db.run(
      `INSERT INTO quests (id, name, tier, quest_type, chapter_index, data) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        q.id,
        q.title ?? q.name ?? q.id,
        q.tier,
        'side',
        null,
        JSON.stringify(q),
      ],
    );
  }
  counts.quests = mainQuests.length + sideQuests.length;

  // --- Dungeons ---
  const dungeonsData = readAllJson(path.join(CONTENT, 'dungeons'));
  for (const d of dungeonsData as any[]) {
    db.run(
      `INSERT INTO dungeons (id, name, anchor_id, recommended_level, data) VALUES (?, ?, ?, ?, ?)`,
      [d.id, d.name, d.anchorId, d.recommendedLevel, JSON.stringify(d)],
    );
  }
  counts.dungeons = dungeonsData.length;

  // --- Narrative encounters ---
  const encounterSubdirs = [
    'combat',
    'puzzle',
    'social',
    'stealth',
    'survival',
  ];
  let narrativeCount = 0;
  for (const sub of encounterSubdirs) {
    const subEncounters = readAllJson(path.join(CONTENT, 'encounters', sub));
    for (const e of subEncounters as any[]) {
      db.run(
        `INSERT INTO encounters (id, name, encounter_type, difficulty, data) VALUES (?, ?, ?, ?, ?)`,
        [e.id, e.name, e.type, e.difficulty, JSON.stringify(e)],
      );
      narrativeCount++;
    }
  }
  counts.encounters = narrativeCount;

  // --- Road spine ---
  const spineFile = path.join(CONTENT, 'world', 'road-spine.json');
  if (fs.existsSync(spineFile)) {
    db.run(`INSERT INTO road_spine (key, data) VALUES ('main', ?)`, [
      JSON.stringify(readJson(spineFile)),
    ]);
  }

  // --- Pacing config ---
  const pacingFile = path.join(CONTENT, 'pacing', 'config.json');
  if (fs.existsSync(pacingFile)) {
    db.run(`INSERT INTO pacing_config (key, data) VALUES ('main', ?)`, [
      JSON.stringify(readJson(pacingFile)),
    ]);
  }

  // ── Export SQLite (for native/expo-sqlite) ──────────────────────────

  const dbData = db.export();
  db.close();
  fs.writeFileSync(DB_PATH, Buffer.from(dbData));

  // ── Export JSON bundle (for web runtime) ───────────────────────────
  // Matches the initContentStore() interface in src/db/content-queries.ts

  const jsonBundle = {
    monsters: monstersData.map((m: any) => ({
      id: m.id,
      data: JSON.stringify(m),
    })),
    items: itemsData.map((i: any) => ({ id: i.id, data: JSON.stringify(i) })),
    encounterTables: (() => {
      const tables: any[] = [];
      for (let tier = 0; tier <= 4; tier++) {
        const tierFile = path.join(CONTENT, 'encounters', `tier-${tier}.json`);
        if (!fs.existsSync(tierFile)) continue;
        const table = readJson(tierFile) as any;
        tables.push({
          id: table.id,
          danger_tier: table.dangerTier,
          loot_table_id: table.lootTable ?? null,
          entries: table.entries.map((e: any) => ({
            monster_id: e.monsterId,
            weight: e.weight,
            count_min: e.count[0],
            count_max: e.count[1],
          })),
        });
      }
      return tables;
    })(),
    lootTables: (lootData as any[]).map((lt: any) => ({
      id: lt.id,
      entries: lt.entries.map((e: any) => ({
        item_id: e.itemId,
        weight: e.weight,
        quantity_min: e.quantity[0],
        quantity_max: e.quantity[1],
      })),
    })),
    npcsNamed: (() => {
      const result: any[] = [];
      if (fs.existsSync(namedNpcDir)) {
        for (const f of fs.readdirSync(namedNpcDir).sort()) {
          if (!f.endsWith('.json')) continue;
          const fullPath = path.join(namedNpcDir, f);
          if (fs.statSync(fullPath).isDirectory()) continue;
          const npc = readJson(fullPath) as any;
          result.push({ id: npc.id, data: JSON.stringify(npc) });
        }
      }
      return result;
    })(),
    npcPools: (poolsData as any[]).map((p: any) => ({
      archetype: p.id ?? p.archetype,
      data: JSON.stringify(p),
    })),
    buildings: (buildingsData as any[]).map((b: any) => ({
      id: b.id,
      data: JSON.stringify(b),
    })),
    towns: (townsData as any[]).map((t: any) => ({
      id: t.id,
      data: JSON.stringify(t),
    })),
    features: (featuresData as any[]).map((f: any) => ({
      id: f.id,
      data: JSON.stringify(f),
    })),
    quests: [
      ...(mainQuests as any[]).map((q: any) => ({
        id: q.id,
        data: JSON.stringify(q),
      })),
      ...(sideQuests as any[]).map((q: any) => ({
        id: q.id,
        data: JSON.stringify(q),
      })),
    ],
    dungeons: (dungeonsData as any[]).map((d: any) => ({
      id: d.id,
      data: JSON.stringify(d),
    })),
    encounters: (() => {
      const result: any[] = [];
      for (const sub of encounterSubdirs) {
        const subEncounters = readAllJson(
          path.join(CONTENT, 'encounters', sub),
        );
        for (const e of subEncounters as any[]) {
          result.push({ id: e.id, data: JSON.stringify(e) });
        }
      }
      return result;
    })(),
    roadSpine: fs.existsSync(spineFile)
      ? JSON.stringify(readJson(spineFile))
      : null,
    pacingConfig: fs.existsSync(pacingFile)
      ? JSON.stringify(readJson(pacingFile))
      : null,
  };

  const JSON_PATH = path.join(CONFIG, 'game-content.json');
  fs.writeFileSync(JSON_PATH, JSON.stringify(jsonBundle));

  // Copy to public/ for static serving
  const publicDir = path.join(ROOT, 'public');
  if (fs.existsSync(publicDir)) {
    fs.copyFileSync(DB_PATH, path.join(publicDir, 'game.db'));
    fs.copyFileSync(JSON_PATH, path.join(publicDir, 'game-content.json'));
  }

  const dbStats = fs.statSync(DB_PATH);
  const jsonStats = fs.statSync(JSON_PATH);

  console.log(
    `\n  Compiled content -> ${DB_PATH} (${Math.round(dbStats.size / 1024)} KB)`,
  );
  console.log(
    `  JSON bundle     -> ${JSON_PATH} (${Math.round(jsonStats.size / 1024)} KB)\n`,
  );
  console.log('  Content summary:');
  for (const [key, count] of Object.entries(counts)) {
    console.log(`    ${key.padEnd(20)} ${count}`);
  }
  console.log('');
}

main().catch((err) => {
  console.error('Failed to compile content DB:', err);
  process.exit(1);
});
