#!/usr/bin/env tsx
/**
 * Ingest HDRI files from the NAS asset library into public/assets/hdri/.
 *
 * Usage:
 *   npx tsx scripts/ingest-hdri.ts <manifest.json>
 *
 * manifest.json format:
 * [
 *   { "id": "cold-dawn", "sourcePath": "/Volumes/home/assets/HDRI/1K/cold_dawn_1k.hdr" },
 *   ...
 * ]
 *
 * Each entry copies the source .hdr file to public/assets/hdri/<id>.hdr.
 * The content curator (team-lead) provides the manifest.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface ManifestEntry {
  id: string;
  sourcePath: string;
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
    const dest = path.join(outputRoot, `${entry.id}.hdr`);
    fs.copyFileSync(entry.sourcePath, dest);
    console.log(`  ${entry.id}.hdr  ←  ${entry.sourcePath}`);
  }
  console.log('\nDone.');
}

main();
