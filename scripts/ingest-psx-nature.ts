#!/usr/bin/env npx tsx
/**
 * Extract nodes from Mega_Nature.glb into individual GLBs in public/assets/nature/psx-mega/.
 * Uses the existing extract-glb-nodes.ts logic inline for a focused, idempotent run.
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import * as path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { dedup, prune } from '@gltf-transform/functions';

const SOURCE_GLB =
  '/Volumes/home/assets/3DPSX/Fantasy/PSX MEGA Nature Pack/Mega_Nature.glb';
const DEST_DIR = path.resolve(
  import.meta.dirname,
  '../public/assets/nature/psx-mega',
);
const DRY_RUN = process.argv.includes('--dry-run');

function kebab(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

async function main(): Promise<void> {
  if (!existsSync(SOURCE_GLB)) {
    console.error(`ERROR: source not found: ${SOURCE_GLB}`);
    process.exit(1);
  }

  if (!DRY_RUN) mkdirSync(DEST_DIR, { recursive: true });

  const io = new NodeIO();
  const sourceDoc = await io.read(SOURCE_GLB);
  const sourceMtime = statSync(SOURCE_GLB).mtimeMs;
  const scene = sourceDoc.getRoot().listScenes()[0];
  const nodeNames: string[] = scene
    .listChildren()
    .map((n) => n.getName())
    .filter(Boolean);

  console.log(`Found ${nodeNames.length} nodes in Mega_Nature.glb`);

  let written = 0;
  let skipped = 0;

  for (const name of nodeNames) {
    const kebabName = kebab(name);
    const outPath = path.join(DEST_DIR, `${kebabName}.glb`);

    if (
      !DRY_RUN &&
      existsSync(outPath) &&
      statSync(outPath).mtimeMs >= sourceMtime
    ) {
      console.log(`SKIP (up to date): ${kebabName}.glb`);
      skipped++;
      continue;
    }

    console.log(`EXTRACT: ${name} → ${kebabName}.glb`);
    if (!DRY_RUN) {
      const doc = await io.read(SOURCE_GLB);
      const s = doc.getRoot().listScenes()[0];
      for (const node of s.listChildren()) {
        if (node.getName() !== name) {
          s.removeChild(node);
          node.dispose();
        }
      }
      await doc.transform(prune(), dedup());
      await io.write(outPath, doc);
    }
    written++;
  }

  console.log(`\n${written} extracted, ${skipped} skipped`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
