#!/usr/bin/env npx tsx
/**
 * Assembles content/game-config.json from individual content files.
 * Reads all quest, NPC, feature, item, and encounter definitions,
 * then produces a single GameConfig object validated against GameConfigSchema.
 *
 * Usage: npx tsx scripts/assemble-game-config.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GameConfigSchema } from '../src/schemas/game-config.schema';

const contentDir = path.resolve(process.cwd(), 'content');

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

// World
const world = readJson(path.join(contentDir, 'world/road-spine.json'));

// Pacing
const pacing = readJson(path.join(contentDir, 'pacing/config.json'));

// Main quest chapters (sorted by filename to preserve order)
const mainQuest = readAllJson(path.join(contentDir, 'quests/main'));

// Side quests — categorize by tier field
const sideQuestFiles = readAllJson(path.join(contentDir, 'quests/side'));
const sideQuests = {
  macro: sideQuestFiles.filter((q: any) => q.tier === 'macro'),
  meso: sideQuestFiles.filter((q: any) => q.tier === 'meso'),
  micro: sideQuestFiles.filter((q: any) => q.tier === 'micro'),
};

// NPCs — pool definitions only (these match NPCDefinitionSchema)
const npcs = readAllJson(path.join(contentDir, 'npcs/pools'));

// Features
const features = readAllJson(path.join(contentDir, 'features'));

// Items
const items = readAllJson(path.join(contentDir, 'items'));

// Encounter definitions (from typed subdirectories, not tier tables)
const encounterSubdirs = ['combat', 'puzzle', 'social', 'stealth', 'survival'];
const encounters = encounterSubdirs.flatMap((sub) =>
  readAllJson(path.join(contentDir, 'encounters', sub)),
);

const config = {
  version: '1.0.0',
  name: 'kings-road' as const,
  world,
  pacing,
  mainQuest,
  sideQuests,
  npcs,
  features,
  items,
  encounters,
};

// Validate before writing
const result = GameConfigSchema.safeParse(config);
if (!result.success) {
  console.error('GameConfigSchema validation failed:');
  for (const issue of result.error.issues) {
    console.error(`  [${issue.path.join('.')}] ${issue.message}`);
  }
  process.exit(1);
}

const outPath = path.join(contentDir, 'game-config.json');
fs.writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
console.log(`  Main quest chapters: ${mainQuest.length}`);
console.log(
  `  Side quests — macro: ${sideQuests.macro.length}, meso: ${sideQuests.meso.length}, micro: ${sideQuests.micro.length}`,
);
console.log(`  NPCs: ${npcs.length}`);
console.log(`  Features: ${features.length}`);
console.log(`  Items: ${items.length}`);
console.log(`  Encounters: ${encounters.length}`);
