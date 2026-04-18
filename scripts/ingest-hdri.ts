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
 * Polyhaven packs land as <name>_1k.hdr / _2k.hdr / _4k.hdr. After copying
 * the whole dir, this script creates a canonical alias <id>.hdr so the loader
 * never needs to know about resolution suffixes. Resolution preference:
 * _1k > _2k > _4k (1K is preferred for IBL ambient on mobile builds).
 *
 * The content curator (team-lead) provides the manifest.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface ManifestEntry {
  id: string;
  sourceDir: string;
}

const RESOLUTION_RANK: Record<string, number> = { _1k: 0, _2k: 1, _4k: 2 };

function pickCanonicalHdr(hdrFiles: string[]): string | undefined {
  if (hdrFiles.length === 0) return undefined;
  if (hdrFiles.length === 1) return hdrFiles[0];

  return hdrFiles.slice().sort((a, b) => {
    const rankA =
      Object.entries(RESOLUTION_RANK).find(([k]) => a.includes(k))?.[1] ?? 99;
    const rankB =
      Object.entries(RESOLUTION_RANK).find(([k]) => b.includes(k))?.[1] ?? 99;
    return rankA - rankB;
  })[0];
}

export function aliasHdr(outDir: string, id: string): void {
  const canonical = `${id}.hdr`;
  const canonicalPath = path.join(outDir, canonical);

  if (fs.existsSync(canonicalPath)) return;

  const hdrFiles = fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith('.hdr') && f !== canonical);

  const chosen = pickCanonicalHdr(hdrFiles);
  if (!chosen) {
    console.warn(
      `  WARNING: no .hdr file found in ${outDir} to alias as ${canonical}`,
    );
    return;
  }

  if (hdrFiles.length > 1) {
    const others = hdrFiles.filter((f) => f !== chosen);
    console.warn(
      `  WARNING: multiple .hdr files found; aliasing ${chosen} → prefer _1k on mobile`,
    );
    for (const other of others) {
      console.warn(`    (ignoring ${other})`);
    }
  }

  fs.copyFileSync(path.join(outDir, chosen), canonicalPath);
  console.log(`  alias: ${chosen} → ${canonical}`);
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

  aliasHdr(outDir, entry.id);
}

function main() {
  const [, , manifestPath] = process.argv;
  if (!manifestPath) {
    console.error('Usage: npx tsx scripts/ingest-hdri.ts <manifest.json>');
    process.exit(1);
  }

  let manifest: ManifestEntry[];
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (err) {
    console.error(`ERROR: could not parse manifest "${manifestPath}": ${err}`);
    process.exit(1);
  }

  const outputRoot = path.join(process.cwd(), 'public', 'assets', 'hdri');
  fs.mkdirSync(outputRoot, { recursive: true });

  console.log(`Ingesting ${manifest.length} HDRI(s) → ${outputRoot}\n`);
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
