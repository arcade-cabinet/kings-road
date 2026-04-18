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
import { fileURLToPath } from 'node:url';
import { validateEntryId } from './_ingest-helpers.js';

interface ManifestEntry {
  id: string;
  sourceDir: string;
}

function ingestEntry(entry: ManifestEntry, outputRoot: string): void {
  validateEntryId(entry.id);
  const outDir = path.join(outputRoot, entry.id);

  try {
    fs.cpSync(entry.sourceDir, outDir, { recursive: true });
  } catch (err) {
    console.error(
      `  ERROR: cannot copy "${entry.sourceDir}" → ${outDir}: ${err}`,
    );
    console.error('  Is the NAS mounted? Check: mount | grep /Volumes/home');
    process.exit(1);
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
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
