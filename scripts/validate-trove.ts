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
import { RoadSpineSchema } from '../src/schemas/world.schema';
import { QuestDefinitionSchema } from '../src/schemas/quest.schema';
import { NPCDefinitionSchema } from '../src/schemas/npc.schema';
import { FeatureDefinitionSchema } from '../src/schemas/feature.schema';
import { ItemDefinitionSchema } from '../src/schemas/item.schema';
import { EncounterDefinitionSchema } from '../src/schemas/encounter.schema';
import { PacingConfigSchema } from '../src/schemas/pacing.schema';
import { GameConfigSchema } from '../src/schemas/game-config.schema';
import type { z } from 'zod';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ValidationResult {
  file: string;
  status: 'pass' | 'fail' | 'warn';
  errors: string[];
  warnings: string[];
  stats?: {
    questCount?: number;
    branchCoverage?: { total: number; withBranches: number; percentage: number };
    dialogueWordDensity?: number;
    estimatedMinutes?: number;
    substanceScore?: number;
  };
}

interface TroveReport {
  timestamp: string;
  contentDir: string;
  results: ValidationResult[];
  summary: {
    totalFiles: number;
    passed: number;
    failed: number;
    warned: number;
  };
}

// ---------------------------------------------------------------------------
// Schema routing — map content subdirectories to schemas
// ---------------------------------------------------------------------------

const SCHEMA_MAP: Record<string, z.ZodType> = {
  'world/road-spine.json': RoadSpineSchema,
  'world/pacing.json': PacingConfigSchema,
  'game-config.json': GameConfigSchema,
};

const COLLECTION_SCHEMAS: Record<string, z.ZodType> = {
  'quests': QuestDefinitionSchema,
  'npcs': NPCDefinitionSchema,
  'features': FeatureDefinitionSchema,
  'items': ItemDefinitionSchema,
  'encounters': EncounterDefinitionSchema,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findJsonFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findJsonFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

function countDialogueWords(obj: unknown): number {
  let total = 0;
  if (typeof obj === 'string') return 0;
  if (Array.isArray(obj)) {
    for (const item of obj) total += countDialogueWords(item);
    return total;
  }
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'dialogue' && typeof value === 'string') {
        total += value.split(/\s+/).filter(Boolean).length;
      } else if (key === 'text' && typeof value === 'string') {
        total += value.split(/\s+/).filter(Boolean).length;
      } else {
        total += countDialogueWords(value);
      }
    }
  }
  return total;
}

function countQuests(data: unknown): number {
  if (!data || typeof data !== 'object') return 0;
  const d = data as Record<string, unknown>;
  let count = 0;
  if (Array.isArray(d.mainQuest)) count += d.mainQuest.length;
  if (d.sideQuests && typeof d.sideQuests === 'object') {
    const sq = d.sideQuests as Record<string, unknown[]>;
    for (const tier of ['macro', 'meso', 'micro']) {
      if (Array.isArray(sq[tier])) count += sq[tier].length;
    }
  }
  return count;
}

function checkBranchCoverage(data: unknown): { total: number; withBranches: number; percentage: number } {
  const quests: unknown[] = [];
  if (!data || typeof data !== 'object') return { total: 0, withBranches: 0, percentage: 0 };
  const d = data as Record<string, unknown>;

  if (Array.isArray(d.mainQuest)) quests.push(...d.mainQuest);
  if (d.sideQuests && typeof d.sideQuests === 'object') {
    const sq = d.sideQuests as Record<string, unknown[]>;
    for (const tier of ['macro', 'meso', 'micro']) {
      if (Array.isArray(sq[tier])) quests.push(...sq[tier]);
    }
  }
  // Also handle standalone quest files (arrays of quests)
  if (Array.isArray(data)) quests.push(...data);

  const total = quests.length;
  const withBranches = quests.filter(
    (q) => q && typeof q === 'object' && 'branches' in q && (q as Record<string, unknown>).branches
  ).length;

  return {
    total,
    withBranches,
    percentage: total > 0 ? Math.round((withBranches / total) * 100) : 0,
  };
}

function estimateTotalMinutes(data: unknown): number {
  const quests: Array<Record<string, unknown>> = [];
  if (!data || typeof data !== 'object') return 0;
  const d = data as Record<string, unknown>;

  if (Array.isArray(d.mainQuest)) quests.push(...(d.mainQuest as Array<Record<string, unknown>>));
  if (d.sideQuests && typeof d.sideQuests === 'object') {
    const sq = d.sideQuests as Record<string, unknown[]>;
    for (const tier of ['macro', 'meso', 'micro']) {
      if (Array.isArray(sq[tier])) quests.push(...(sq[tier] as Array<Record<string, unknown>>));
    }
  }
  if (Array.isArray(data)) quests.push(...(data as Array<Record<string, unknown>>));

  return quests.reduce((sum, q) => sum + (typeof q.estimatedMinutes === 'number' ? q.estimatedMinutes : 0), 0);
}

function calculateSubstanceScore(data: unknown): number {
  // Substance score: ratio of dialogue words to total quest count
  // Higher = more narrative substance per quest
  const wordCount = countDialogueWords(data);
  const questCount = countQuests(data) || (Array.isArray(data) ? data.length : 1);
  if (questCount === 0) return 0;
  return Math.round(wordCount / questCount);
}

function checkReferentialIntegrity(data: unknown, contentDir: string): string[] {
  const warnings: string[] = [];
  if (!data || typeof data !== 'object') return warnings;
  const d = data as Record<string, unknown>;

  // Collect known IDs
  const knownAnchors = new Set<string>();
  const knownQuests = new Set<string>();
  const knownItems = new Set<string>();
  const knownEncounters = new Set<string>();
  const knownNPCArchetypes = new Set<string>();

  // From world
  if (d.world && typeof d.world === 'object') {
    const w = d.world as Record<string, unknown>;
    if (Array.isArray(w.anchors)) {
      for (const a of w.anchors as Array<Record<string, unknown>>) {
        if (typeof a.id === 'string') knownAnchors.add(a.id);
      }
    }
  }

  // From items
  if (Array.isArray(d.items)) {
    for (const item of d.items as Array<Record<string, unknown>>) {
      if (typeof item.id === 'string') knownItems.add(item.id);
    }
  }

  // From encounters
  if (Array.isArray(d.encounters)) {
    for (const enc of d.encounters as Array<Record<string, unknown>>) {
      if (typeof enc.id === 'string') knownEncounters.add(enc.id);
    }
  }

  // From NPCs
  if (Array.isArray(d.npcs)) {
    for (const npc of d.npcs as Array<Record<string, unknown>>) {
      if (typeof npc.archetype === 'string') knownNPCArchetypes.add(npc.archetype);
    }
  }

  // Collect all quests
  const allQuests: Array<Record<string, unknown>> = [];
  if (Array.isArray(d.mainQuest)) allQuests.push(...(d.mainQuest as Array<Record<string, unknown>>));
  if (d.sideQuests && typeof d.sideQuests === 'object') {
    const sq = d.sideQuests as Record<string, unknown[]>;
    for (const tier of ['macro', 'meso', 'micro']) {
      if (Array.isArray(sq[tier])) allQuests.push(...(sq[tier] as Array<Record<string, unknown>>));
    }
  }
  for (const q of allQuests) {
    if (typeof q.id === 'string') knownQuests.add(q.id);
  }

  // Check quest prerequisites reference existing quests
  for (const q of allQuests) {
    if (Array.isArray(q.prerequisites)) {
      for (const prereq of q.prerequisites) {
        if (typeof prereq === 'string' && !knownQuests.has(prereq)) {
          warnings.push(`Quest "${q.id}" references unknown prerequisite "${prereq}"`);
        }
      }
    }

    // Check anchor affinity references known anchors
    if (typeof q.anchorAffinity === 'string' && knownAnchors.size > 0 && !knownAnchors.has(q.anchorAffinity)) {
      warnings.push(`Quest "${q.id}" references unknown anchor "${q.anchorAffinity}"`);
    }
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Validation core
// ---------------------------------------------------------------------------

function validateFile(filePath: string, contentDir: string): ValidationResult {
  const relPath = path.relative(contentDir, filePath);
  const result: ValidationResult = {
    file: relPath,
    status: 'pass',
    errors: [],
    warnings: [],
  };

  // Read and parse JSON
  let data: unknown;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    data = JSON.parse(raw);
  } catch (err) {
    result.status = 'fail';
    result.errors.push(`Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  // Find matching schema
  let schema: z.ZodType | null = null;

  // Check direct file mapping
  if (SCHEMA_MAP[relPath]) {
    schema = SCHEMA_MAP[relPath];
  } else {
    // Check collection directory
    const dir = relPath.split('/')[0];
    if (COLLECTION_SCHEMAS[dir]) {
      schema = COLLECTION_SCHEMAS[dir];
      // If the file contains an array, validate each element
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          try {
            COLLECTION_SCHEMAS[dir].parse(data[i]);
          } catch (err) {
            result.status = 'fail';
            result.errors.push(`Item [${i}]: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        if (result.errors.length === 0) {
          result.stats = {
            branchCoverage: checkBranchCoverage(data),
            dialogueWordDensity: countDialogueWords(data),
            estimatedMinutes: estimateTotalMinutes(data),
            substanceScore: calculateSubstanceScore(data),
          };
        }
        return result;
      }
    }
  }

  if (!schema) {
    result.status = 'warn';
    result.warnings.push(`No schema mapping found for "${relPath}" — skipping validation`);
    return result;
  }

  // Validate against schema
  try {
    schema.parse(data);
  } catch (err) {
    result.status = 'fail';
    result.errors.push(err instanceof Error ? err.message : String(err));
    return result;
  }

  // Compute stats for game-config files
  if (relPath === 'game-config.json') {
    result.stats = {
      questCount: countQuests(data),
      branchCoverage: checkBranchCoverage(data),
      dialogueWordDensity: countDialogueWords(data),
      estimatedMinutes: estimateTotalMinutes(data),
      substanceScore: calculateSubstanceScore(data),
    };

    // Referential integrity checks
    const integrityWarnings = checkReferentialIntegrity(data, contentDir);
    if (integrityWarnings.length > 0) {
      result.warnings.push(...integrityWarnings);
      if (result.status === 'pass') result.status = 'warn';
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const verbose = process.argv.includes('--verbose');
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

  const results: ValidationResult[] = [];
  for (const file of jsonFiles) {
    const result = validateFile(file, contentDir);
    results.push(result);

    const icon = result.status === 'pass' ? '\u2713' : result.status === 'warn' ? '!' : '\u2717';
    const color = result.status === 'pass' ? '\x1b[32m' : result.status === 'warn' ? '\x1b[33m' : '\x1b[31m';
    console.log(`  ${color}${icon}\x1b[0m ${result.file}`);

    if (verbose || result.status === 'fail') {
      for (const err of result.errors) {
        console.log(`    \x1b[31mERROR:\x1b[0m ${err}`);
      }
    }
    if (verbose || result.status === 'warn') {
      for (const warn of result.warnings) {
        console.log(`    \x1b[33mWARN:\x1b[0m ${warn}`);
      }
    }
    if (verbose && result.stats) {
      console.log(`    Stats: ${JSON.stringify(result.stats)}`);
    }
  }

  const report: TroveReport = {
    timestamp: new Date().toISOString(),
    contentDir,
    results,
    summary: {
      totalFiles: results.length,
      passed: results.filter((r) => r.status === 'pass').length,
      failed: results.filter((r) => r.status === 'fail').length,
      warned: results.filter((r) => r.status === 'warn').length,
    },
  };

  // Write report JSON
  const reportPath = path.resolve(process.cwd(), 'content', '.validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n--- Summary ---`);
  console.log(`Total: ${report.summary.totalFiles}  Pass: ${report.summary.passed}  Fail: ${report.summary.failed}  Warn: ${report.summary.warned}`);
  console.log(`Report written to: ${reportPath}\n`);

  process.exit(report.summary.failed > 0 ? 1 : 0);
}

main();
