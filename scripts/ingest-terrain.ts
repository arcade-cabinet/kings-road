#!/usr/bin/env tsx
/**
 * Ingest terrain heightmaps from the NAS asset library into public/assets/terrain/.
 *
 * Usage:
 *   npx tsx scripts/ingest-terrain.ts <manifest.json>
 *
 * manifest.json format:
 * [
 *   { "id": "thornfield", "sourcePath": "/Volumes/home/assets/.../Terrain003.exr" },
 *   ...
 * ]
 *
 * Each entry copies the source heightmap to public/assets/terrain/<id>.<ext>.
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
    console.error('Usage: npx tsx scripts/ingest-terrain.ts <manifest.json>');
    process.exit(1);
  }

  try {
    const manifest: ManifestEntry[] = JSON.parse(
      fs.readFileSync(manifestPath, 'utf-8'),
    );
    const outputRoot = path.join(process.cwd(), 'public', 'assets', 'terrain');
    fs.mkdirSync(outputRoot, { recursive: true });

    console.log(
      `Ingesting ${manifest.length} terrain heightmap(s) → ${outputRoot}\n`,
    );
    for (const entry of manifest) {
      const ext = path.extname(entry.sourcePath);
      const dest = path.join(outputRoot, `${entry.id}${ext}`);
      fs.copyFileSync(entry.sourcePath, dest);
      console.log(`  ${entry.id}${ext}  ←  ${entry.sourcePath}`);
    }
    console.log('\nDone.');
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

main();
