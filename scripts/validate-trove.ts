#!/usr/bin/env npx tsx
/**
 * Trove Validation Pipeline
 *
 * Validates all JSON content files in content/ against King's Road Zod schemas.
 * Checks referential integrity, estimates quest duration, verifies A/B branch
 * coverage, and calculates a substance score for dialogue quality.
 *
 * Usage: npx tsx scripts/validate-trove.ts [--verbose]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { z } from 'zod';
import { BuildingArchetypeSchema } from '../src/schemas/building.schema';
import { DungeonLayoutSchema } from '../src/schemas/dungeon.schema';
import { EncounterDefinitionSchema } from '../src/schemas/encounter.schema';
import {
  EncounterTableSchema,
  LootTableSchema,
} from '../src/schemas/encounter-table.schema';
import { FeatureDefinitionSchema } from '../src/schemas/feature.schema';
import { GameConfigSchema } from '../src/schemas/game-config.schema';
import { ItemDefinitionSchema } from '../src/schemas/item.schema';
import { MonsterArchetypeSchema } from '../src/schemas/monster.schema';
import { NPCDefinitionSchema } from '../src/schemas/npc.schema';
import { NPCBlueprintSchema } from '../src/schemas/npc-blueprint.schema';
import { PacingConfigSchema } from '../src/schemas/pacing.schema';
import { QuestDefinitionSchema } from '../src/schemas/quest.schema';
import { TownConfigSchema } from '../src/schemas/town.schema';
import { RoadSpineSchema } from '../src/schemas/world.schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DurationEstimate {
  estimatedMinutes: number;
  declaredMinutes: number;
  deviationPercent: number;
  warning: string | null;
}

interface SubstanceScore {
  totalDialogueWords: number;
  totalSteps: number;
  density: number;
  uniqueNPCs: number;
  belowThreshold: boolean;
}

interface QuestValidationDetail {
  questId: string;
  duration: DurationEstimate;
  substance: SubstanceScore;
  hasBranches: boolean;
  branchWarning: string | null;
}

export interface ValidationResult {
  file: string;
  contentType: string;
  status: 'pass' | 'fail' | 'warn';
  errors: string[];
  warnings: string[];
  questDetails?: QuestValidationDetail[];
}

export interface TroveReport {
  timestamp: string;
  contentDir: string;
  results: ValidationResult[];
  referentialIntegrity: string[];
  summary: {
    totalFiles: number;
    passed: number;
    failed: number;
    warned: number;
    totalQuests: number;
    questsWithBranches: number;
    totalEstimatedMinutes: number;
  };
}

// ---------------------------------------------------------------------------
// Schema routing — map content subdirectories to schemas + content types
// ---------------------------------------------------------------------------

interface SchemaMapping {
  schema: z.ZodType;
  contentType: string;
}

function getSchemaForFile(
  relPath: string,
  data?: unknown,
): SchemaMapping | null {
  // Normalize path separators
  const normalized = relPath.replace(/\\/g, '/');

  if (normalized === 'game-config.json') {
    return { schema: GameConfigSchema, contentType: 'game-config' };
  }
  if (normalized.startsWith('world/')) {
    return { schema: RoadSpineSchema, contentType: 'road-spine' };
  }
  if (
    normalized.startsWith('main-quest/') ||
    normalized.startsWith('quests/')
  ) {
    return { schema: QuestDefinitionSchema, contentType: 'quest' };
  }
  if (normalized.startsWith('side-quests/macro/')) {
    return { schema: QuestDefinitionSchema, contentType: 'quest' };
  }
  if (normalized.startsWith('side-quests/meso/')) {
    return { schema: QuestDefinitionSchema, contentType: 'quest' };
  }
  if (normalized.startsWith('side-quests/micro/')) {
    return { schema: QuestDefinitionSchema, contentType: 'quest' };
  }
  if (normalized.startsWith('npcs/pools/')) {
    return { schema: NPCDefinitionSchema, contentType: 'npc' };
  }
  if (normalized.startsWith('npcs/')) {
    // Distinguish blueprint files from pool files by checking for bodyBuild field
    if (
      data &&
      typeof data === 'object' &&
      'bodyBuild' in (data as Record<string, unknown>)
    ) {
      return { schema: NPCBlueprintSchema, contentType: 'npc-blueprint' };
    }
    return { schema: NPCDefinitionSchema, contentType: 'npc' };
  }
  if (normalized.startsWith('buildings/')) {
    return { schema: BuildingArchetypeSchema, contentType: 'building' };
  }
  if (normalized.startsWith('dungeons/')) {
    return { schema: DungeonLayoutSchema, contentType: 'dungeon' };
  }
  if (normalized.startsWith('towns/')) {
    return { schema: TownConfigSchema, contentType: 'town' };
  }
  if (normalized.startsWith('features/')) {
    return { schema: FeatureDefinitionSchema, contentType: 'feature' };
  }
  if (normalized.startsWith('items/')) {
    return { schema: ItemDefinitionSchema, contentType: 'item' };
  }
  if (normalized.startsWith('monsters/')) {
    return { schema: MonsterArchetypeSchema, contentType: 'monster' };
  }
  if (
    normalized.startsWith('encounters/combat/') ||
    normalized.startsWith('encounters/puzzle/') ||
    normalized.startsWith('encounters/social/') ||
    normalized.startsWith('encounters/stealth/') ||
    normalized.startsWith('encounters/survival/')
  ) {
    return {
      schema: EncounterDefinitionSchema,
      contentType: 'encounter-definition',
    };
  }
  if (normalized.startsWith('encounters/')) {
    return { schema: EncounterTableSchema, contentType: 'encounter-table' };
  }
  if (normalized.startsWith('loot/')) {
    return { schema: LootTableSchema, contentType: 'loot-table' };
  }
  if (normalized.startsWith('pacing/')) {
    return { schema: PacingConfigSchema, contentType: 'pacing' };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function findJsonFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findJsonFiles(fullPath));
    } else if (entry.name.endsWith('.json') && !entry.name.startsWith('.')) {
      files.push(fullPath);
    }
  }
  return files;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Duration estimation per quest (paper playtesting heuristics)
// ---------------------------------------------------------------------------

const STEP_DURATION_MINUTES: Record<string, number> = {
  dialogue: 0, // calculated from word count
  travel: 2,
  encounter: 5,
  fetch: 3,
  escort: 3,
  investigate: 3,
  puzzle: 4,
};

function estimateStepMinutes(step: Record<string, unknown>): number {
  const type = step.type as string;
  if (type === 'dialogue') {
    const dialogue = step.dialogue as string | undefined;
    if (dialogue) {
      const words = countWords(dialogue);
      return (words / 50) * 0.5; // ~30 sec per 50 words
    }
    return 0.5; // minimal dialogue placeholder
  }
  return STEP_DURATION_MINUTES[type] ?? 2;
}

function getAllSteps(
  quest: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const steps: Array<Record<string, unknown>> = [];
  if (Array.isArray(quest.steps)) {
    steps.push(...(quest.steps as Array<Record<string, unknown>>));
  }
  if (quest.branches && typeof quest.branches === 'object') {
    const branches = quest.branches as Record<string, { steps?: unknown[] }>;
    for (const branch of Object.values(branches)) {
      if (Array.isArray(branch.steps)) {
        steps.push(...(branch.steps as Array<Record<string, unknown>>));
      }
    }
  }
  return steps;
}

export function estimateQuestDuration(
  quest: Record<string, unknown>,
): DurationEstimate {
  const steps = getAllSteps(quest);
  const estimatedMinutes = steps.reduce(
    (sum, step) => sum + estimateStepMinutes(step),
    0,
  );
  const declaredMinutes =
    typeof quest.estimatedMinutes === 'number' ? quest.estimatedMinutes : 0;
  const deviationPercent =
    declaredMinutes > 0
      ? (Math.abs(estimatedMinutes - declaredMinutes) / declaredMinutes) * 100
      : 0;

  return {
    estimatedMinutes: Math.round(estimatedMinutes * 10) / 10,
    declaredMinutes,
    deviationPercent: Math.round(deviationPercent),
    warning:
      deviationPercent > 50
        ? `Duration deviation ${Math.round(deviationPercent)}%: estimated ${estimatedMinutes.toFixed(1)} min vs declared ${declaredMinutes} min`
        : null,
  };
}

// ---------------------------------------------------------------------------
// Substance score per quest
// ---------------------------------------------------------------------------

function collectDialogueWords(obj: unknown): number {
  let total = 0;
  if (Array.isArray(obj)) {
    for (const item of obj) total += collectDialogueWords(item);
    return total;
  }
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (key === 'dialogue' && typeof value === 'string') {
        total += countWords(value);
      } else if (key === 'text' && typeof value === 'string') {
        total += countWords(value);
      } else {
        total += collectDialogueWords(value);
      }
    }
  }
  return total;
}

function collectUniqueNPCs(quest: Record<string, unknown>): Set<string> {
  const npcs = new Set<string>();
  const steps = getAllSteps(quest);
  for (const step of steps) {
    if (typeof step.npcArchetype === 'string' && step.npcArchetype) {
      npcs.add(step.npcArchetype);
    }
  }
  return npcs;
}

const SUBSTANCE_THRESHOLD = 10; // minimum dialogue words per step

export function calculateSubstanceScore(
  quest: Record<string, unknown>,
): SubstanceScore {
  const steps = getAllSteps(quest);
  const totalDialogueWords = collectDialogueWords(quest);
  const uniqueNPCs = collectUniqueNPCs(quest);
  const totalSteps = steps.length || 1;
  const density = totalDialogueWords / totalSteps;

  return {
    totalDialogueWords,
    totalSteps,
    density: Math.round(density * 10) / 10,
    uniqueNPCs: uniqueNPCs.size,
    belowThreshold: density < SUBSTANCE_THRESHOLD,
  };
}

// ---------------------------------------------------------------------------
// A/B branch coverage check
// ---------------------------------------------------------------------------

export function checkQuestBranches(
  quest: Record<string, unknown>,
): string | null {
  const tier = quest.tier as string;
  if (tier === 'micro') return null; // micro quests don't need branches

  const branches = quest.branches as Record<string, unknown> | undefined;
  if (!branches) {
    return `${tier} quest "${quest.id}" is missing A/B branches (required for meso/macro)`;
  }
  if (!branches.A || !branches.B) {
    return `${tier} quest "${quest.id}" is missing ${!branches.A ? 'A' : 'B'} branch`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Referential integrity
// ---------------------------------------------------------------------------

interface ContentIndex {
  anchorIds: Set<string>;
  questIds: Set<string>;
  npcArchetypes: Set<string>;
  encounterIds: Set<string>;
  featureIds: Set<string>;
}

function buildContentIndex(contentDir: string): ContentIndex {
  const index: ContentIndex = {
    anchorIds: new Set(),
    questIds: new Set(),
    npcArchetypes: new Set(),
    encounterIds: new Set(),
    featureIds: new Set(),
  };

  const files = findJsonFiles(contentDir);
  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const data = JSON.parse(raw);
      const relPath = path.relative(contentDir, file).replace(/\\/g, '/');

      if (relPath.startsWith('world/')) {
        if (Array.isArray(data.anchors)) {
          for (const a of data.anchors) {
            if (typeof a.id === 'string') index.anchorIds.add(a.id);
          }
        }
      } else if (
        relPath.startsWith('main-quest/') ||
        relPath.startsWith('side-quests/')
      ) {
        if (typeof data.id === 'string') index.questIds.add(data.id);
      } else if (relPath.startsWith('npcs/')) {
        if (typeof data.archetype === 'string')
          index.npcArchetypes.add(data.archetype);
        if (typeof data.id === 'string')
          index.npcArchetypes.add(data.archetype);
      } else if (relPath.startsWith('features/')) {
        if (typeof data.id === 'string') index.featureIds.add(data.id);
      }
    } catch {
      // skip files we can't parse
    }
  }

  return index;
}

export function checkReferentialIntegrity(
  quest: Record<string, unknown>,
  index: ContentIndex,
): string[] {
  const warnings: string[] = [];
  const questId = quest.id as string;

  // Check prerequisites reference existing quest IDs
  if (Array.isArray(quest.prerequisites)) {
    for (const prereq of quest.prerequisites) {
      if (
        typeof prereq === 'string' &&
        index.questIds.size > 0 &&
        !index.questIds.has(prereq)
      ) {
        warnings.push(
          `Quest "${questId}" references unknown prerequisite "${prereq}"`,
        );
      }
    }
  }

  // Check anchorAffinity references existing anchor IDs
  if (typeof quest.anchorAffinity === 'string' && index.anchorIds.size > 0) {
    if (!index.anchorIds.has(quest.anchorAffinity)) {
      warnings.push(
        `Quest "${questId}" references unknown anchor "${quest.anchorAffinity}"`,
      );
    }
  }

  // Check encounter IDs in steps
  const steps = getAllSteps(quest);
  for (const step of steps) {
    if (typeof step.encounterId === 'string' && index.encounterIds.size > 0) {
      if (!index.encounterIds.has(step.encounterId)) {
        warnings.push(
          `Quest "${questId}" step "${step.id}" references unknown encounter "${step.encounterId}"`,
        );
      }
    }
    // Check NPC archetypes
    if (typeof step.npcArchetype === 'string' && index.npcArchetypes.size > 0) {
      if (!index.npcArchetypes.has(step.npcArchetype)) {
        warnings.push(
          `Quest "${questId}" step "${step.id}" references unknown NPC archetype "${step.npcArchetype}"`,
        );
      }
    }
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Validation core
// ---------------------------------------------------------------------------

export function validateFile(
  filePath: string,
  contentDir: string,
  index: ContentIndex,
): ValidationResult {
  const relPath = path.relative(contentDir, filePath).replace(/\\/g, '/');

  // Read and parse JSON first so we can use data for schema detection
  let data: unknown;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    data = JSON.parse(raw);
  } catch (err) {
    return {
      file: relPath,
      contentType: 'unknown',
      status: 'fail',
      errors: [
        `Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`,
      ],
      warnings: [],
    };
  }

  const mapping = getSchemaForFile(relPath, data);
  if (!mapping) {
    return {
      file: relPath,
      contentType: 'unknown',
      status: 'warn',
      errors: [],
      warnings: [`No schema mapping for "${relPath}" -- skipping validation`],
    };
  }

  const result: ValidationResult = {
    file: relPath,
    contentType: mapping.contentType,
    status: 'pass',
    errors: [],
    warnings: [],
  };

  // Validate against schema
  try {
    mapping.schema.parse(data);
  } catch (err) {
    result.status = 'fail';
    if (err && typeof err === 'object' && 'issues' in err) {
      const zodErr = err as {
        issues: Array<{ message: string; path: Array<string | number> }>;
      };
      for (const issue of zodErr.issues) {
        result.errors.push(`[${issue.path.join('.')}] ${issue.message}`);
      }
    } else {
      result.errors.push(err instanceof Error ? err.message : String(err));
    }
    return result;
  }

  // Quest-specific checks
  if (mapping.contentType === 'quest' && data && typeof data === 'object') {
    const quest = data as Record<string, unknown>;
    const questDetails: QuestValidationDetail[] = [];

    const duration = estimateQuestDuration(quest);
    const substance = calculateSubstanceScore(quest);
    const branchWarning = checkQuestBranches(quest);
    const integrityWarnings = checkReferentialIntegrity(quest, index);

    if (duration.warning) {
      result.warnings.push(duration.warning);
    }
    if (substance.belowThreshold) {
      result.warnings.push(
        `Low substance score: ${substance.density} words/step (threshold: ${SUBSTANCE_THRESHOLD})`,
      );
    }
    if (branchWarning) {
      result.warnings.push(branchWarning);
    }
    result.warnings.push(...integrityWarnings);

    questDetails.push({
      questId: quest.id as string,
      duration,
      substance,
      hasBranches: !!quest.branches,
      branchWarning,
    });

    result.questDetails = questDetails;

    if (result.warnings.length > 0 && result.status === 'pass') {
      result.status = 'warn';
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

function formatReport(report: TroveReport): string {
  const lines: string[] = [];
  lines.push('');
  lines.push("=== King's Road Content Trove Validation Report ===");
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push(`Content dir: ${report.contentDir}`);
  lines.push('');

  for (const r of report.results) {
    const icon =
      r.status === 'pass' ? '\u2713' : r.status === 'warn' ? '!' : '\u2717';
    const color =
      r.status === 'pass'
        ? '\x1b[32m'
        : r.status === 'warn'
          ? '\x1b[33m'
          : '\x1b[31m';
    lines.push(`  ${color}${icon}\x1b[0m ${r.file} [${r.contentType}]`);

    for (const err of r.errors) {
      lines.push(`    \x1b[31mERROR:\x1b[0m ${err}`);
    }
    for (const warn of r.warnings) {
      lines.push(`    \x1b[33mWARN:\x1b[0m ${warn}`);
    }
    if (r.questDetails) {
      for (const qd of r.questDetails) {
        lines.push(`    Quest: ${qd.questId}`);
        lines.push(
          `      Duration: estimated ${qd.duration.estimatedMinutes} min, declared ${qd.duration.declaredMinutes} min (${qd.duration.deviationPercent}% deviation)`,
        );
        lines.push(
          `      Substance: ${qd.substance.density} words/step, ${qd.substance.uniqueNPCs} unique NPCs, ${qd.substance.totalDialogueWords} total words`,
        );
        lines.push(`      Branches: ${qd.hasBranches ? 'A + B' : 'none'}`);
      }
    }
  }

  if (report.referentialIntegrity.length > 0) {
    lines.push('');
    lines.push('--- Referential Integrity ---');
    for (const w of report.referentialIntegrity) {
      lines.push(`  \x1b[33mWARN:\x1b[0m ${w}`);
    }
  }

  lines.push('');
  lines.push('--- Summary ---');
  lines.push(`Total files: ${report.summary.totalFiles}`);
  lines.push(
    `Passed: ${report.summary.passed}  Failed: ${report.summary.failed}  Warned: ${report.summary.warned}`,
  );
  lines.push(
    `Total quests: ${report.summary.totalQuests} (${report.summary.questsWithBranches} with A/B branches)`,
  );
  lines.push(
    `Estimated total play time: ${report.summary.totalEstimatedMinutes} min`,
  );
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function runValidation(contentDir: string): TroveReport {
  const jsonFiles = findJsonFiles(contentDir);

  const index = buildContentIndex(contentDir);
  const results: ValidationResult[] = [];
  let totalQuests = 0;
  let questsWithBranches = 0;
  let totalEstimatedMinutes = 0;

  for (const file of jsonFiles) {
    const result = validateFile(file, contentDir, index);
    results.push(result);

    if (result.questDetails) {
      for (const qd of result.questDetails) {
        totalQuests++;
        if (qd.hasBranches) questsWithBranches++;
        totalEstimatedMinutes += qd.duration.estimatedMinutes;
      }
    }
  }

  // Collect all referential integrity warnings
  const referentialIntegrity: string[] = [];
  for (const r of results) {
    if (r.questDetails) {
      for (const _qd of r.questDetails) {
        // Already included in per-file warnings
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    contentDir,
    results,
    referentialIntegrity,
    summary: {
      totalFiles: results.length,
      passed: results.filter((r) => r.status === 'pass').length,
      failed: results.filter((r) => r.status === 'fail').length,
      warned: results.filter((r) => r.status === 'warn').length,
      totalQuests,
      questsWithBranches,
      totalEstimatedMinutes: Math.round(totalEstimatedMinutes),
    },
  };
}

function main() {
  const contentDir = path.resolve(process.cwd(), 'content');

  if (!fs.existsSync(contentDir)) {
    console.log('No content/ directory found. Nothing to validate.');
    process.exit(0);
  }

  const jsonFiles = findJsonFiles(contentDir);
  if (jsonFiles.length === 0) {
    console.log('No JSON files found in content/. Nothing to validate.');
    process.exit(0);
  }

  console.log(`\nValidating ${jsonFiles.length} file(s) in content/...\n`);

  const report = runValidation(contentDir);

  // Print formatted report to stdout
  console.log(formatReport(report));

  // Write report JSON
  const reportPath = path.join(contentDir, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report written to: ${reportPath}\n`);

  process.exit(report.summary.failed > 0 ? 1 : 0);
}

// Only run when executed directly (not when imported for testing)
const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('validate-trove.ts') ||
    process.argv[1].endsWith('validate-trove'));

if (isMainModule) {
  main();
}
