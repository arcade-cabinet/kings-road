#!/usr/bin/env npx tsx
/**
 * Content Cross-Reference Validation
 *
 * Phase 1: Validates all JSON content files against Zod schemas (via validate-trove).
 * Phase 2: Checks cross-references — verifies that every ID referenced by one content
 *          file actually exists in another content file of the appropriate type.
 *
 * Usage: npx tsx scripts/validate-content.ts [--verbose]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { findJsonFiles, runValidation } from './validate-trove';

// ---------------------------------------------------------------------------
// ID Index — collects all known IDs by type from content files
// ---------------------------------------------------------------------------

interface IdIndex {
  items: Set<string>;
  npcIds: Set<string>;
  npcArchetypes: Set<string>;
  monsters: Set<string>;
  buildings: Set<string>;
  features: Set<string>;
  quests: Set<string>;
  encounterDefs: Set<string>;
  encounterTables: Set<string>;
  lootTables: Set<string>;
  dungeons: Set<string>;
  towns: Set<string>;
  anchors: Set<string>;
  /** Maps dungeon ID → set of room IDs within that dungeon */
  dungeonRooms: Map<string, Set<string>>;
}

interface XRefError {
  file: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Phase 1 helpers — reuse validate-trove
// ---------------------------------------------------------------------------

function routeContent(relPath: string): string | null {
  const n = relPath.replace(/\\/g, '/');
  if (n.startsWith('items/')) return 'items';
  if (n.startsWith('npcs/pools/')) return 'npc-pool';
  if (n.startsWith('npcs/')) return 'npcs';
  if (n.startsWith('monsters/')) return 'monsters';
  if (n.startsWith('buildings/')) return 'buildings';
  if (n.startsWith('features/')) return 'features';
  if (
    n.startsWith('quests/') ||
    n.startsWith('main-quest/') ||
    n.startsWith('side-quests/')
  )
    return 'quests';
  if (n.match(/^encounters\/(combat|puzzle|social|stealth|survival)\//))
    return 'encounter-def';
  if (n.startsWith('encounters/')) return 'encounter-table';
  if (n.startsWith('loot/')) return 'loot';
  if (n.startsWith('dungeons/')) return 'dungeons';
  if (n.startsWith('towns/')) return 'towns';
  if (n.startsWith('world/')) return 'world';
  return null;
}

// ---------------------------------------------------------------------------
// Build the ID index
// ---------------------------------------------------------------------------

function buildIndex(contentDir: string): IdIndex {
  const index: IdIndex = {
    items: new Set(),
    npcIds: new Set(),
    npcArchetypes: new Set(),
    monsters: new Set(),
    buildings: new Set(),
    features: new Set(),
    quests: new Set(),
    encounterDefs: new Set(),
    encounterTables: new Set(),
    lootTables: new Set(),
    dungeons: new Set(),
    towns: new Set(),
    anchors: new Set(),
    dungeonRooms: new Map(),
  };

  for (const file of findJsonFiles(contentDir)) {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      continue; // schema validation catches parse errors
    }

    const relPath = path.relative(contentDir, file).replace(/\\/g, '/');
    const route = routeContent(relPath);
    const id = typeof data.id === 'string' ? data.id : null;

    switch (route) {
      case 'items':
        if (id) index.items.add(id);
        break;
      case 'npc-pool':
      case 'npcs':
        if (id) index.npcIds.add(id);
        if (typeof data.archetype === 'string')
          index.npcArchetypes.add(data.archetype);
        break;
      case 'monsters':
        if (id) index.monsters.add(id);
        break;
      case 'buildings':
        if (id) index.buildings.add(id);
        break;
      case 'features':
        if (id) index.features.add(id);
        break;
      case 'quests':
        if (id) index.quests.add(id);
        break;
      case 'encounter-def':
        if (id) index.encounterDefs.add(id);
        break;
      case 'encounter-table':
        if (id) index.encounterTables.add(id);
        break;
      case 'loot':
        if (id) index.lootTables.add(id);
        break;
      case 'dungeons':
        if (id) {
          index.dungeons.add(id);
          const roomIds = new Set<string>();
          if (Array.isArray(data.rooms)) {
            for (const room of data.rooms as Array<Record<string, unknown>>) {
              if (typeof room.id === 'string') roomIds.add(room.id);
            }
          }
          index.dungeonRooms.set(id, roomIds);
        }
        break;
      case 'towns':
        if (id) index.towns.add(id);
        break;
      case 'world':
        if (Array.isArray(data.anchors)) {
          for (const anchor of data.anchors as Array<Record<string, unknown>>) {
            if (typeof anchor.id === 'string') index.anchors.add(anchor.id);
          }
        }
        break;
    }
  }

  return index;
}

// ---------------------------------------------------------------------------
// Cross-reference checks
// ---------------------------------------------------------------------------

function collectQuestSteps(
  data: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const steps: Array<Record<string, unknown>> = [];
  if (Array.isArray(data.steps)) {
    steps.push(...(data.steps as Array<Record<string, unknown>>));
  }
  if (data.branches && typeof data.branches === 'object') {
    const branches = data.branches as Record<string, { steps?: unknown[] }>;
    for (const branch of Object.values(branches)) {
      if (Array.isArray(branch.steps)) {
        steps.push(...(branch.steps as Array<Record<string, unknown>>));
      }
    }
  }
  return steps;
}

function checkTown(
  relPath: string,
  data: Record<string, unknown>,
  index: IdIndex,
  errors: XRefError[],
): void {
  if (Array.isArray(data.buildings)) {
    for (const b of data.buildings as Array<Record<string, unknown>>) {
      if (
        typeof b.archetype === 'string' &&
        !index.buildings.has(b.archetype)
      ) {
        errors.push({
          file: relPath,
          message: `Building archetype "${b.archetype}" not found in content/buildings/`,
        });
      }
    }
  }
  if (Array.isArray(data.npcs)) {
    for (const npc of data.npcs as Array<Record<string, unknown>>) {
      if (
        typeof npc.archetype === 'string' &&
        !index.npcArchetypes.has(npc.archetype)
      ) {
        errors.push({
          file: relPath,
          message: `NPC archetype "${npc.archetype}" not found in content/npcs/`,
        });
      }
    }
  }
  if (typeof data.anchorId === 'string' && !index.anchors.has(data.anchorId)) {
    errors.push({
      file: relPath,
      message: `Anchor ID "${data.anchorId}" not found in road spine`,
    });
  }
}

function checkQuest(
  relPath: string,
  data: Record<string, unknown>,
  index: IdIndex,
  errors: XRefError[],
): void {
  const steps = collectQuestSteps(data);
  for (const step of steps) {
    if (
      typeof step.npcArchetype === 'string' &&
      !index.npcArchetypes.has(step.npcArchetype)
    ) {
      errors.push({
        file: relPath,
        message: `Quest step "${step.id}" references unknown NPC archetype "${step.npcArchetype}"`,
      });
    }
    if (typeof step.itemId === 'string' && !index.items.has(step.itemId)) {
      errors.push({
        file: relPath,
        message: `Quest step "${step.id}" references unknown item "${step.itemId}"`,
      });
    }
    if (
      typeof step.encounterId === 'string' &&
      !index.encounterDefs.has(step.encounterId) &&
      !index.encounterTables.has(step.encounterId)
    ) {
      errors.push({
        file: relPath,
        message: `Quest step "${step.id}" references unknown encounter "${step.encounterId}"`,
      });
    }
  }

  if (Array.isArray(data.prerequisites)) {
    for (const prereq of data.prerequisites) {
      if (typeof prereq === 'string' && !index.quests.has(prereq)) {
        errors.push({
          file: relPath,
          message: `Prerequisite quest "${prereq}" not found`,
        });
      }
    }
  }

  if (
    typeof data.anchorAffinity === 'string' &&
    !index.anchors.has(data.anchorAffinity)
  ) {
    errors.push({
      file: relPath,
      message: `Anchor affinity "${data.anchorAffinity}" not found in road spine`,
    });
  }

  const trigger = data.trigger as Record<string, unknown> | undefined;
  if (trigger) {
    if (
      trigger.type === 'anchor' &&
      typeof trigger.anchorId === 'string' &&
      !index.anchors.has(trigger.anchorId)
    ) {
      errors.push({
        file: relPath,
        message: `Trigger anchor "${trigger.anchorId}" not found in road spine`,
      });
    }
    if (
      trigger.type === 'prerequisite' &&
      typeof trigger.questId === 'string' &&
      !index.quests.has(trigger.questId)
    ) {
      errors.push({
        file: relPath,
        message: `Trigger prerequisite quest "${trigger.questId}" not found`,
      });
    }
  }

  // Check reward item references
  const rewards: Array<Record<string, unknown>> = [];
  if (data.reward && typeof data.reward === 'object')
    rewards.push(data.reward as Record<string, unknown>);
  const branches = data.branches as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (branches?.A?.reward && typeof branches.A.reward === 'object') {
    rewards.push(branches.A.reward as Record<string, unknown>);
  }
  if (branches?.B?.reward && typeof branches.B.reward === 'object') {
    rewards.push(branches.B.reward as Record<string, unknown>);
  }
  for (const reward of rewards) {
    if (
      reward.type === 'item' &&
      typeof reward.itemId === 'string' &&
      !index.items.has(reward.itemId)
    ) {
      errors.push({
        file: relPath,
        message: `Reward references unknown item "${reward.itemId}"`,
      });
    }
  }
}

function checkEncounterTable(
  relPath: string,
  data: Record<string, unknown>,
  index: IdIndex,
  errors: XRefError[],
): void {
  if (Array.isArray(data.entries)) {
    for (const entry of data.entries as Array<Record<string, unknown>>) {
      if (
        typeof entry.monsterId === 'string' &&
        !index.monsters.has(entry.monsterId)
      ) {
        errors.push({
          file: relPath,
          message: `Encounter table entry references unknown monster "${entry.monsterId}"`,
        });
      }
    }
  }
  if (
    typeof data.lootTable === 'string' &&
    !index.lootTables.has(data.lootTable)
  ) {
    errors.push({
      file: relPath,
      message: `Encounter table references unknown loot table "${data.lootTable}"`,
    });
  }
}

function checkEncounterDef(
  relPath: string,
  data: Record<string, unknown>,
  index: IdIndex,
  errors: XRefError[],
): void {
  if (Array.isArray(data.rewards)) {
    for (const reward of data.rewards as Array<Record<string, unknown>>) {
      if (
        typeof reward.itemId === 'string' &&
        !index.items.has(reward.itemId)
      ) {
        errors.push({
          file: relPath,
          message: `Encounter reward references unknown item "${reward.itemId}"`,
        });
      }
    }
  }
}

function checkLootTable(
  relPath: string,
  data: Record<string, unknown>,
  index: IdIndex,
  errors: XRefError[],
): void {
  if (Array.isArray(data.entries)) {
    for (const entry of data.entries as Array<Record<string, unknown>>) {
      if (typeof entry.itemId === 'string' && !index.items.has(entry.itemId)) {
        errors.push({
          file: relPath,
          message: `Loot entry references unknown item "${entry.itemId}"`,
        });
      }
    }
  }
}

function checkMonster(
  relPath: string,
  data: Record<string, unknown>,
  index: IdIndex,
  errors: XRefError[],
): void {
  if (
    typeof data.lootTable === 'string' &&
    !index.lootTables.has(data.lootTable)
  ) {
    errors.push({
      file: relPath,
      message: `Monster references unknown loot table "${data.lootTable}"`,
    });
  }
}

function checkDungeon(
  relPath: string,
  data: Record<string, unknown>,
  index: IdIndex,
  errors: XRefError[],
): void {
  if (typeof data.anchorId === 'string' && !index.anchors.has(data.anchorId)) {
    errors.push({
      file: relPath,
      message: `Dungeon references unknown anchor "${data.anchorId}"`,
    });
  }

  const dungeonId = typeof data.id === 'string' ? data.id : '';
  const roomIds = index.dungeonRooms.get(dungeonId) ?? new Set<string>();

  if (
    typeof data.entranceRoomId === 'string' &&
    !roomIds.has(data.entranceRoomId)
  ) {
    errors.push({
      file: relPath,
      message: `Dungeon entranceRoomId "${data.entranceRoomId}" not found in rooms`,
    });
  }
  if (typeof data.bossRoomId === 'string' && !roomIds.has(data.bossRoomId)) {
    errors.push({
      file: relPath,
      message: `Dungeon bossRoomId "${data.bossRoomId}" not found in rooms`,
    });
  }

  if (Array.isArray(data.rooms)) {
    for (const room of data.rooms as Array<Record<string, unknown>>) {
      const roomId = typeof room.id === 'string' ? room.id : '?';

      if (
        typeof room.encounterId === 'string' &&
        !index.encounterDefs.has(room.encounterId) &&
        !index.encounterTables.has(room.encounterId)
      ) {
        errors.push({
          file: relPath,
          message: `Room "${roomId}" references unknown encounter "${room.encounterId}"`,
        });
      }
      if (
        typeof room.lootTableId === 'string' &&
        !index.lootTables.has(room.lootTableId)
      ) {
        errors.push({
          file: relPath,
          message: `Room "${roomId}" references unknown loot table "${room.lootTableId}"`,
        });
      }

      if (Array.isArray(room.connections)) {
        for (const conn of room.connections as Array<Record<string, unknown>>) {
          if (typeof conn.to === 'string' && !roomIds.has(conn.to)) {
            errors.push({
              file: relPath,
              message: `Room "${roomId}" connection targets unknown room "${conn.to}"`,
            });
          }
          if (typeof conn.keyId === 'string' && !index.items.has(conn.keyId)) {
            errors.push({
              file: relPath,
              message: `Room "${roomId}" locked connection requires unknown key item "${conn.keyId}"`,
            });
          }
        }
      }
    }
  }
}

function checkBuilding(
  relPath: string,
  data: Record<string, unknown>,
  index: IdIndex,
  errors: XRefError[],
): void {
  if (data.npcSlot && typeof data.npcSlot === 'object') {
    const slot = data.npcSlot as Record<string, unknown>;
    if (
      typeof slot.archetype === 'string' &&
      !index.npcArchetypes.has(slot.archetype)
    ) {
      errors.push({
        file: relPath,
        message: `Building npcSlot archetype "${slot.archetype}" not found in content/npcs/`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Main cross-reference pass
// ---------------------------------------------------------------------------

function checkCrossReferences(contentDir: string, index: IdIndex): XRefError[] {
  const errors: XRefError[] = [];

  for (const file of findJsonFiles(contentDir)) {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      continue;
    }

    const relPath = path.relative(contentDir, file).replace(/\\/g, '/');
    const route = routeContent(relPath);

    switch (route) {
      case 'towns':
        checkTown(relPath, data, index, errors);
        break;
      case 'quests':
        checkQuest(relPath, data, index, errors);
        break;
      case 'encounter-table':
        checkEncounterTable(relPath, data, index, errors);
        break;
      case 'encounter-def':
        checkEncounterDef(relPath, data, index, errors);
        break;
      case 'loot':
        checkLootTable(relPath, data, index, errors);
        break;
      case 'monsters':
        checkMonster(relPath, data, index, errors);
        break;
      case 'dungeons':
        checkDungeon(relPath, data, index, errors);
        break;
      case 'buildings':
        checkBuilding(relPath, data, index, errors);
        break;
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

function formatIndexSummary(index: IdIndex): string {
  const lines = [
    `  Items: ${index.items.size}`,
    `  NPCs: ${index.npcIds.size} (${index.npcArchetypes.size} archetypes)`,
    `  Monsters: ${index.monsters.size}`,
    `  Buildings: ${index.buildings.size}`,
    `  Features: ${index.features.size}`,
    `  Quests: ${index.quests.size}`,
    `  Encounters: ${index.encounterDefs.size} defs + ${index.encounterTables.size} tables`,
    `  Loot tables: ${index.lootTables.size}`,
    `  Dungeons: ${index.dungeons.size}`,
    `  Towns: ${index.towns.size}`,
    `  Anchors: ${index.anchors.size}`,
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const verbose = process.argv.includes('--verbose');
  const contentDir = path.resolve(process.cwd(), 'content');

  if (!fs.existsSync(contentDir)) {
    console.log('No content/ directory found.');
    process.exit(0);
  }

  const jsonFiles = findJsonFiles(contentDir);
  if (jsonFiles.length === 0) {
    console.log('No JSON files found in content/.');
    process.exit(0);
  }

  console.log(`\n=== Content Validation (${jsonFiles.length} files) ===\n`);

  // Phase 1: Schema validation
  console.log('Phase 1: Schema validation...');
  const troveReport = runValidation(contentDir);

  let schemaErrors = 0;
  for (const result of troveReport.results) {
    if (result.status === 'fail') {
      schemaErrors++;
      console.log(`  \x1b[31m\u2717\x1b[0m ${result.file}`);
      for (const err of result.errors) {
        console.log(`    \x1b[31mERROR:\x1b[0m ${err}`);
      }
    } else if (verbose && result.status === 'pass') {
      console.log(`  \x1b[32m\u2713\x1b[0m ${result.file}`);
    }
  }

  if (schemaErrors > 0) {
    console.log(`\n  ${schemaErrors} file(s) failed schema validation.`);
  } else {
    console.log(
      `  \x1b[32m\u2713\x1b[0m All ${troveReport.summary.totalFiles} files pass schema validation.`,
    );
  }

  // Phase 2: Cross-reference checking
  console.log('\nPhase 2: Cross-reference checking...');
  const index = buildIndex(contentDir);
  const xrefErrors = checkCrossReferences(contentDir, index);

  if (xrefErrors.length > 0) {
    for (const err of xrefErrors) {
      console.log(`  \x1b[31m\u2717\x1b[0m ${err.file}: ${err.message}`);
    }
    console.log(`\n  ${xrefErrors.length} cross-reference error(s) found.`);
  } else {
    console.log(`  \x1b[32m\u2713\x1b[0m All cross-references valid.`);
  }

  // Summary
  console.log('\n--- Summary ---');
  console.log(`Files validated: ${troveReport.summary.totalFiles}`);
  console.log(`Schema errors: ${schemaErrors}`);
  console.log(`Cross-reference errors: ${xrefErrors.length}`);
  console.log(`\nContent index:\n${formatIndexSummary(index)}`);
  console.log('');

  const totalErrors = schemaErrors + xrefErrors.length;
  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
