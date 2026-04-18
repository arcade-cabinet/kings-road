#!/usr/bin/env tsx
/**
 * Ingest terrain packs from the NAS asset library into public/assets/terrain/.
 *
 * Usage:
 *   npx tsx scripts/ingest-terrain.ts <manifest.json>
 *
 * manifest.json format:
 * [
 *   { "id": "thornfield", "sourceDir": "/Volumes/home/assets/.../Terrain003" },
 *   ...
 * ]
 *
 * For each entry the entire source directory is copied verbatim to
 * public/assets/terrain/<id>/ preserving all original filenames including all
 * LOD variants, preview PNGs, and author companions.
 *
 * The content curator (team-lead) provides the manifest.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface ManifestEntry {
  id: string;
  sourceDir: string;
}

function ingestEntry(entry: ManifestEntry, outputRoot: string): void {
  const outDir = path.join(outputRoot, entry.id);

  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch (err) {
    console.error(`  ERROR: could not create output dir ${outDir}: ${err}`);
    process.exit(1);
  }

  let sourceFiles: string[];
  try {
    sourceFiles = fs.readdirSync(entry.sourceDir);
  } catch (err) {
    console.error(
      `  ERROR: cannot read source dir "${entry.sourceDir}": ${err}`,
    );
    console.error('  Is the NAS mounted? Check: mount | grep /Volumes/home');
    process.exit(1);
  }

  let copied = 0;
  for (const file of sourceFiles) {
    const src = path.join(entry.sourceDir, file);
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
    console.warn(`  WARNING: no files found in ${entry.sourceDir}`);
  }
}

function main() {
  const [, , manifestPath] = process.argv;
  if (!manifestPath) {
    console.error('Usage: npx tsx scripts/ingest-terrain.ts <manifest.json>');
    process.exit(1);
  }

  let manifest: ManifestEntry[];
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (err) {
    console.error(`ERROR: could not parse manifest "${manifestPath}": ${err}`);
    process.exit(1);
  }

  const outputRoot = path.join(process.cwd(), 'public', 'assets', 'terrain');
  fs.mkdirSync(outputRoot, { recursive: true });

  console.log(`Ingesting ${manifest.length} terrain pack(s) → ${outputRoot}\n`);
  for (const entry of manifest) {
    console.log(`[${entry.id}]  ${entry.sourceDir}`);
    ingestEntry(entry, outputRoot);
  }
  console.log('\nDone.');
}

// Only run when executed directly (not imported by tests)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}
