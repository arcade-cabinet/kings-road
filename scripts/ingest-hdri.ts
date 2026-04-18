#!/usr/bin/env tsx
/**
 * Ingest HDRI packs from the NAS asset library into public/assets/hdri/.
 *
 * Usage:
 *   npx tsx scripts/ingest-hdri.ts <manifest.json>
 *
 * manifest.json format:
 * [
 *   { "id": "cold-dawn", "sourceDir": "/Volumes/home/assets/HDRI/1K/cold_dawn_1k" },
 *   ...
 * ]
 *
 * For each entry the entire source directory is copied verbatim to
 * public/assets/hdri/<id>/ preserving all original filenames. The loader
 * reads public/assets/hdri/<id>/<id>.hdr.
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
  fs.mkdirSync(outDir, { recursive: true });

  const sourceFiles = fs.readdirSync(entry.sourceDir);
  let copied = 0;

  for (const file of sourceFiles) {
    const src = path.join(entry.sourceDir, file);
    if (!fs.statSync(src).isFile()) continue;
    fs.copyFileSync(src, path.join(outDir, file));
    console.log(`  ${entry.id}/${file}`);
    copied++;
  }

  if (copied === 0) {
    console.warn(`  WARNING: no files found in ${entry.sourceDir}`);
  }
}

function main() {
  const [, , manifestPath] = process.argv;
  if (!manifestPath) {
    console.error('Usage: npx tsx scripts/ingest-hdri.ts <manifest.json>');
    process.exit(1);
  }

  const manifest: ManifestEntry[] = JSON.parse(
    fs.readFileSync(manifestPath, 'utf-8'),
  );
  const outputRoot = path.join(process.cwd(), 'public', 'assets', 'hdri');
  fs.mkdirSync(outputRoot, { recursive: true });

  console.log(`Ingesting ${manifest.length} HDRI(s) → ${outputRoot}\n`);
  for (const entry of manifest) {
    console.log(`[${entry.id}]  ${entry.sourceDir}`);
    ingestEntry(entry, outputRoot);
  }
  console.log('\nDone.');
}

main();
