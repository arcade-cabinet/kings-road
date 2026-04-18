/**
 * Content Trove Integration Tests
 *
 * Loads every JSON file from content/ and validates against Zod schemas,
 * then verifies all cross-references resolve. This is the test-suite
 * equivalent of running validate-trove.ts + validate-content.ts — if
 * a content file breaks, this test fails in `pnpm test`, not just in
 * a standalone script.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  findJsonFiles,
  runValidation,
  type TroveReport,
} from '../../scripts/validate-trove';

const CONTENT_DIR = path.resolve(__dirname, '../content');

describe('content trove: schema validation', () => {
  let report: TroveReport;

  // Run validation once, share results across tests
  report = runValidation(CONTENT_DIR);

  it('finds a substantial number of content files', () => {
    expect(report.summary.totalFiles).toBeGreaterThanOrEqual(250);
  });

  it('all content files pass schema validation', () => {
    const failures = report.results.filter((r) => r.status === 'fail');
    const details = failures
      .map((f) => `${f.file}: ${f.errors.join('; ')}`)
      .join('\n');
    expect(failures, `Schema failures:\n${details}`).toHaveLength(0);
  });

  it('no unexpected warnings beyond validation-report.json', () => {
    const warns = report.results.filter(
      (r) => r.status === 'warn' && !r.file.endsWith('validation-report.json'),
    );
    expect(warns.map((w) => w.file)).toHaveLength(0);
  });

  it('validates quests with estimated play time', () => {
    const questResults = report.results.filter(
      (r) => r.contentType === 'quest',
    );
    expect(questResults.length).toBeGreaterThanOrEqual(20);
  });
});

describe('content trove: cross-reference integrity', () => {
  // Build ID index from all content files
  const files = findJsonFiles(CONTENT_DIR);
  const index = {
    items: new Set<string>(),
    npcIds: new Set<string>(),
    npcArchetypes: new Set<string>(),
    monsters: new Set<string>(),
    buildings: new Set<string>(),
    features: new Set<string>(),
    quests: new Set<string>(),
    encounterDefs: new Set<string>(),
    encounterTables: new Set<string>(),
    lootTables: new Set<string>(),
    dungeons: new Set<string>(),
    towns: new Set<string>(),
    anchors: new Set<string>(),
  };

  // Populate index
  for (const file of files) {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      continue;
    }
    const rel = path.relative(CONTENT_DIR, file).replace(/\\/g, '/');
    const id = typeof data.id === 'string' ? data.id : null;

    // Road spine has anchors but no top-level id
    if (rel.startsWith('world/') && Array.isArray(data.anchors)) {
      for (const a of data.anchors as Array<{ id: string }>) {
        index.anchors.add(a.id);
      }
    }

    if (!id) continue;

    if (rel.startsWith('items/')) index.items.add(id);
    else if (rel.startsWith('npcs/pools/'))
      index.npcArchetypes.add(data.archetype as string);
    else if (rel.startsWith('npcs/')) index.npcIds.add(id);
    else if (rel.startsWith('monsters/')) index.monsters.add(id);
    else if (rel.startsWith('buildings/')) index.buildings.add(id);
    else if (rel.startsWith('features/')) index.features.add(id);
    else if (rel.startsWith('quests/')) index.quests.add(id);
    else if (
      rel.match(/^encounters\/(combat|puzzle|social|stealth|survival)\//)
    )
      index.encounterDefs.add(id);
    else if (rel.startsWith('encounters/')) index.encounterTables.add(id);
    else if (rel.startsWith('loot/')) index.lootTables.add(id);
    else if (rel.startsWith('dungeons/')) index.dungeons.add(id);
    else if (rel.startsWith('towns/')) index.towns.add(id);
  }

  it('has content across all major categories', () => {
    expect(index.items.size, 'items').toBeGreaterThanOrEqual(40);
    expect(index.npcIds.size, 'NPCs').toBeGreaterThanOrEqual(30);
    expect(index.monsters.size, 'monsters').toBeGreaterThanOrEqual(20);
    expect(index.buildings.size, 'buildings').toBeGreaterThanOrEqual(15);
    expect(index.features.size, 'features').toBeGreaterThanOrEqual(20);
    expect(index.quests.size, 'quests').toBeGreaterThanOrEqual(25);
    expect(index.encounterDefs.size, 'encounter defs').toBeGreaterThanOrEqual(
      30,
    );
    expect(
      index.encounterTables.size,
      'encounter tables',
    ).toBeGreaterThanOrEqual(5);
    expect(index.lootTables.size, 'loot tables').toBeGreaterThanOrEqual(5);
    expect(index.towns.size, 'towns').toBeGreaterThanOrEqual(6);
    expect(index.anchors.size, 'anchors').toBeGreaterThanOrEqual(6);
  });

  it('all encounter tables reference existing monsters', () => {
    const errors: string[] = [];
    for (const file of files) {
      const rel = path.relative(CONTENT_DIR, file).replace(/\\/g, '/');
      if (!rel.startsWith('encounters/') || rel.includes('/')) {
        // Only top-level encounter tables (tier-*.json)
        if (
          rel.startsWith('encounters/') &&
          !rel.match(/^encounters\/(combat|puzzle|social|stealth|survival)\//)
        ) {
          let data: Record<string, unknown>;
          try {
            data = JSON.parse(fs.readFileSync(file, 'utf-8'));
          } catch {
            continue;
          }
          const entries = data.entries as
            | Array<{ monsterId: string }>
            | undefined;
          if (entries) {
            for (const entry of entries) {
              if (!index.monsters.has(entry.monsterId)) {
                errors.push(`${rel}: monster "${entry.monsterId}" not found`);
              }
            }
          }
        }
      }
    }
    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  it('all loot tables reference existing items', () => {
    const errors: string[] = [];
    for (const file of files) {
      const rel = path.relative(CONTENT_DIR, file).replace(/\\/g, '/');
      if (!rel.startsWith('loot/')) continue;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch {
        continue;
      }
      const entries = data.entries as Array<{ itemId: string }> | undefined;
      if (entries) {
        for (const entry of entries) {
          if (!index.items.has(entry.itemId)) {
            errors.push(`${rel}: item "${entry.itemId}" not found`);
          }
        }
      }
    }
    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  it('all monsters reference existing loot tables', () => {
    const errors: string[] = [];
    for (const file of files) {
      const rel = path.relative(CONTENT_DIR, file).replace(/\\/g, '/');
      if (!rel.startsWith('monsters/')) continue;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch {
        continue;
      }
      const lootTable = data.lootTable as string | undefined;
      if (lootTable && !index.lootTables.has(lootTable)) {
        errors.push(`${rel}: loot table "${lootTable}" not found`);
      }
    }
    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  it('all quest step encounterId references resolve', () => {
    const allEncounterIds = new Set([
      ...index.encounterDefs,
      ...index.encounterTables,
    ]);
    const errors: string[] = [];

    for (const file of files) {
      const rel = path.relative(CONTENT_DIR, file).replace(/\\/g, '/');
      if (!rel.startsWith('quests/')) continue;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch {
        continue;
      }

      const checkStep = (step: Record<string, unknown>, ctx: string) => {
        if (
          typeof step.encounterId === 'string' &&
          !allEncounterIds.has(step.encounterId)
        ) {
          errors.push(
            `${rel} ${ctx}: encounter "${step.encounterId}" not found`,
          );
        }
      };

      // Check flat steps
      if (Array.isArray(data.steps)) {
        for (const step of data.steps as Record<string, unknown>[]) {
          checkStep(step, `step ${step.id}`);
        }
      }
      // Check branch steps
      const branches = data.branches as
        | Record<string, { steps: Record<string, unknown>[] }>
        | undefined;
      if (branches) {
        for (const [branchKey, branch] of Object.entries(branches)) {
          for (const step of branch.steps) {
            checkStep(step, `branch ${branchKey} step ${step.id}`);
          }
        }
      }
    }

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  it('all quest step itemId references resolve', () => {
    const errors: string[] = [];

    for (const file of files) {
      const rel = path.relative(CONTENT_DIR, file).replace(/\\/g, '/');
      if (!rel.startsWith('quests/')) continue;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch {
        continue;
      }

      const checkStep = (step: Record<string, unknown>, ctx: string) => {
        if (typeof step.itemId === 'string' && !index.items.has(step.itemId)) {
          errors.push(`${rel} ${ctx}: item "${step.itemId}" not found`);
        }
      };

      if (Array.isArray(data.steps)) {
        for (const step of data.steps as Record<string, unknown>[]) {
          checkStep(step, `step ${step.id}`);
        }
      }
      const branches = data.branches as
        | Record<
            string,
            {
              steps: Record<string, unknown>[];
              reward?: Record<string, unknown>;
            }
          >
        | undefined;
      if (branches) {
        for (const [branchKey, branch] of Object.entries(branches)) {
          for (const step of branch.steps) {
            checkStep(step, `branch ${branchKey} step ${step.id}`);
          }
          if (
            typeof branch.reward?.itemId === 'string' &&
            !index.items.has(branch.reward.itemId)
          ) {
            errors.push(
              `${rel} branch ${branchKey} reward: item "${branch.reward.itemId}" not found`,
            );
          }
        }
      }
    }

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  it('all town building archetypes exist', () => {
    const errors: string[] = [];

    for (const file of files) {
      const rel = path.relative(CONTENT_DIR, file).replace(/\\/g, '/');
      if (!rel.startsWith('towns/')) continue;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch {
        continue;
      }
      const buildings = data.buildings as
        | Array<{ archetype: string }>
        | undefined;
      if (buildings) {
        for (const b of buildings) {
          if (!index.buildings.has(b.archetype)) {
            errors.push(
              `${rel}: building archetype "${b.archetype}" not found`,
            );
          }
        }
      }
    }

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  it('all dungeon rooms reference existing encounters', () => {
    const allEncounterIds = new Set([
      ...index.encounterDefs,
      ...index.encounterTables,
    ]);
    const errors: string[] = [];

    for (const file of files) {
      const rel = path.relative(CONTENT_DIR, file).replace(/\\/g, '/');
      if (!rel.startsWith('dungeons/')) continue;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch {
        continue;
      }
      const rooms = data.rooms as
        | Record<string, { encounterId?: string }>
        | undefined;
      if (rooms) {
        for (const [roomId, room] of Object.entries(rooms)) {
          if (
            typeof room.encounterId === 'string' &&
            !allEncounterIds.has(room.encounterId)
          ) {
            errors.push(
              `${rel} room "${roomId}": encounter "${room.encounterId}" not found`,
            );
          }
        }
      }
    }

    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});
