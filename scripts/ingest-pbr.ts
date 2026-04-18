#!/usr/bin/env tsx
/**
 * Ingest PBR materials from the NAS asset library into public/assets/pbr/.
 *
 * Usage:
 *   npx tsx scripts/ingest-pbr.ts <manifest.json>
 *
 * manifest.json format:
 * [
 *   { "id": "mossy-stone", "sourcePack": "/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/Moss001" },
 *   ...
 * ]
 *
 * For each entry, this script:
 * 1. Copies the source pack directory maps to public/assets/pbr/<id>/
 * 2. Renames files to canonical names: color.jpg, normal.jpg, roughness.jpg,
 *    displacement.jpg, ao.jpg (where present)
 * 3. Prints a summary of what was copied
 *
 * The content curator (team-lead) provides the manifest; this script is
 * a generic tool that executes the copy without making curation decisions.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface ManifestEntry {
  id: string;
  sourcePack: string;
}

const CANONICAL_PATTERNS: Array<{ canonical: string; patterns: RegExp[] }> = [
  {
    canonical: 'color.jpg',
    patterns: [
      /_Color\.jpg$/i,
      /_diff\.jpg$/i,
      /_albedo\.jpg$/i,
      /_basecolor\.jpg$/i,
    ],
  },
  {
    canonical: 'normal.jpg',
    patterns: [/_NormalGL\.jpg$/i, /_Normal\.jpg$/i, /_nrm\.jpg$/i],
  },
  {
    canonical: 'roughness.jpg',
    patterns: [/_Roughness\.jpg$/i, /_rough\.jpg$/i],
  },
  {
    canonical: 'displacement.jpg',
    patterns: [/_Displacement\.jpg$/i, /_height\.jpg$/i, /_disp\.jpg$/i],
  },
  {
    canonical: 'ao.jpg',
    patterns: [/_AmbientOcclusion\.jpg$/i, /_ao\.jpg$/i, /_occlusion\.jpg$/i],
  },
];

function resolveCanonicalName(filename: string): string | null {
  for (const { canonical, patterns } of CANONICAL_PATTERNS) {
    if (patterns.some((p) => p.test(filename))) return canonical;
  }
  return null;
}

function ingestEntry(entry: ManifestEntry, outputRoot: string): void {
  const outDir = path.join(outputRoot, entry.id);
  fs.mkdirSync(outDir, { recursive: true });

  const sourceFiles = fs
    .readdirSync(entry.sourcePack)
    .filter((f) => f.endsWith('.jpg'));
  let copied = 0;

  for (const file of sourceFiles) {
    const canonical = resolveCanonicalName(file);
    if (!canonical) continue;
    fs.copyFileSync(
      path.join(entry.sourcePack, file),
      path.join(outDir, canonical),
    );
    console.log(`  ${entry.id}/${canonical}  ←  ${file}`);
    copied++;
  }

  if (copied === 0) {
    console.warn(
      `  WARNING: no recognizable maps found in ${entry.sourcePack}`,
    );
  }
}

function main() {
  const [, , manifestPath] = process.argv;
  if (!manifestPath) {
    console.error('Usage: npx tsx scripts/ingest-pbr.ts <manifest.json>');
    process.exit(1);
  }

  const manifest: ManifestEntry[] = JSON.parse(
    fs.readFileSync(manifestPath, 'utf-8'),
  );
  const outputRoot = path.join(process.cwd(), 'public', 'assets', 'pbr');
  fs.mkdirSync(outputRoot, { recursive: true });

  console.log(`Ingesting ${manifest.length} PBR material(s) → ${outputRoot}\n`);
  for (const entry of manifest) {
    console.log(`[${entry.id}]  ${entry.sourcePack}`);
    ingestEntry(entry, outputRoot);
  }
  console.log('\nDone.');
}

main();
