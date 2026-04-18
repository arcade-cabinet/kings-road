#!/usr/bin/env tsx
/**
 * Ingest PBR materials from the NAS asset library into public/assets/pbr/.
 *
 * Usage:
 *   npx tsx scripts/ingest-pbr.ts <manifest.json>
 *   KINGS_ROAD_ASSETS=/path/to/ambientcg/mirror npx tsx scripts/ingest-pbr.ts <manifest.json>
 *
 * manifest.json format (sourceDir is RELATIVE to $KINGS_ROAD_ASSETS):
 * [
 *   { "id": "mossy-stone", "sourceDir": "2DPhotorealistic/MATERIAL/1K-JPG/Moss001" },
 *   ...
 * ]
 *
 * $KINGS_ROAD_ASSETS points at a local AmbientCG-layout mirror. Default:
 * `/Volumes/home/assets` (the team NAS mount on macOS). Override per machine.
 *
 * For each entry the entire source directory is copied verbatim to
 * public/assets/pbr/<id>/ preserving all original filenames. The loader
 * resolves filenames via the packPrefix in PBR_PALETTE (AmbientCG convention).
 *
 * The content curator (team-lead) provides the manifest; this script is
 * a generic tool that executes the copy without making curation decisions.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ASSETS_ROOT = process.env.KINGS_ROAD_ASSETS ?? '/Volumes/home/assets';

interface ManifestEntry {
  id: string;
  sourceDir: string;
}

function resolveSourceDir(sourceDir: string): string {
  if (path.isAbsolute(sourceDir)) return sourceDir;
  // Resolve under ASSETS_ROOT and reject `..` traversal that would escape it.
  // A manifest is authored config, but defense-in-depth: the script runs with
  // the contributor's filesystem privileges, so a crafted manifest shouldn't
  // be able to exfiltrate arbitrary paths into public/assets/.
  const root = path.resolve(ASSETS_ROOT);
  const candidate = path.resolve(root, sourceDir);
  const rel = path.relative(root, candidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(
      `sourceDir "${sourceDir}" escapes KINGS_ROAD_ASSETS (${root}). Relative paths must stay within the assets root.`,
    );
  }
  return candidate;
}

function ingestEntry(entry: ManifestEntry, outputRoot: string): void {
  const outDir = path.join(outputRoot, entry.id);
  const absSource = resolveSourceDir(entry.sourceDir);

  try {
    fs.cpSync(absSource, outDir, { recursive: true });
  } catch (err) {
    console.error(`  ERROR: cannot copy "${absSource}" → ${outDir}: ${err}`);
    console.error(
      `  Check that KINGS_ROAD_ASSETS points at a local AmbientCG mirror (current: ${ASSETS_ROOT})`,
    );
    process.exit(1);
  }
}

function main() {
  const [, , manifestPath] = process.argv;
  if (!manifestPath) {
    console.error('Usage: npx tsx scripts/ingest-pbr.ts <manifest.json>');
    process.exit(1);
  }

  let manifest: ManifestEntry[];
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (err) {
    console.error(`ERROR: could not parse manifest "${manifestPath}": ${err}`);
    process.exit(1);
  }

  const outputRoot = path.join(process.cwd(), 'public', 'assets', 'pbr');
  fs.mkdirSync(outputRoot, { recursive: true });

  console.log(`Ingesting ${manifest.length} PBR material(s) → ${outputRoot}\n`);
  for (const entry of manifest) {
    console.log(`[${entry.id}]  ${resolveSourceDir(entry.sourceDir)}`);
    ingestEntry(entry, outputRoot);
  }
  console.log('\nDone.');
}

// Only run when executed directly (not imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
