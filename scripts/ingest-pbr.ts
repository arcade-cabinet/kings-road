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

const ASSETS_ROOT = process.env.KINGS_ROAD_ASSETS ?? '/Volumes/home/assets';

interface ManifestEntry {
  id: string;
  sourceDir: string;
}

function resolveSourceDir(sourceDir: string): string {
  return path.isAbsolute(sourceDir)
    ? sourceDir
    : path.join(ASSETS_ROOT, sourceDir);
}

function ingestEntry(entry: ManifestEntry, outputRoot: string): void {
  const outDir = path.join(outputRoot, entry.id);
  const absSource = resolveSourceDir(entry.sourceDir);

  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch (err) {
    console.error(`  ERROR: could not create output dir ${outDir}: ${err}`);
    process.exit(1);
  }

  let sourceFiles: string[];
  try {
    sourceFiles = fs.readdirSync(absSource);
  } catch (err) {
    console.error(`  ERROR: cannot read source dir "${absSource}": ${err}`);
    console.error(
      `  Check that KINGS_ROAD_ASSETS points at a local AmbientCG mirror (current: ${ASSETS_ROOT})`,
    );
    process.exit(1);
  }

  let copied = 0;
  for (const file of sourceFiles) {
    const src = path.join(absSource, file);
    let isFile: boolean;
    try {
      isFile = fs.statSync(src).isFile();
    } catch (err) {
      console.warn(`  WARNING: could not stat ${src}, skipping: ${err}`);
      continue;
    }
    if (!isFile) continue;

    try {
      fs.copyFileSync(src, path.join(outDir, file));
      console.log(`  ${entry.id}/${file}`);
      copied++;
    } catch (err) {
      console.error(`  ERROR: failed to copy ${src}: ${err}`);
      process.exit(1);
    }
  }

  if (copied === 0) {
    console.warn(`  WARNING: no files found in ${absSource}`);
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
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}
