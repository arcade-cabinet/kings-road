#!/usr/bin/env tsx
/**
 * Bake external texture references into GLB files.
 *
 * Many Kenney / PSX / asset-pack GLB exports reference textures via relative
 * URIs (e.g. `"uri": "Textures/colormap.png"`). When we copy just the .glb
 * into `public/assets/`, those URIs 404 in the browser and Three.js logs a
 * steady stream of "Couldn't load texture" errors per-frame per-instance.
 *
 * This script uses @gltf-transform/cli's `copy` command, which, when the
 * referenced texture files sit alongside the .glb in the same directory
 * tree (e.g. `Textures/colormap.png`), embeds each texture into the GLB's
 * bufferView. Output files are fully self-contained.
 *
 * Usage:
 *   npx tsx scripts/bake-glb-textures.ts <dir>
 *
 * Expects the .glb files in <dir> and any referenced textures under
 * <dir>/Textures/ (Kenney convention) — caller is responsible for staging
 * textures before calling this.
 *
 * Side effect: overwrites the input .glb files in place. Safe to re-run;
 * already-baked GLBs pass through unchanged (gltf-transform is idempotent).
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

function bakeDir(dir: string): void {
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs)) {
    console.error(`Directory does not exist: ${abs}`);
    process.exit(1);
  }

  const glbs = fs.readdirSync(abs).filter((f) => f.endsWith('.glb'));
  if (glbs.length === 0) {
    console.log(`No .glb files in ${abs}`);
    return;
  }

  const bakedDir = path.join(abs, '_baked');
  fs.mkdirSync(bakedDir, { recursive: true });

  console.log(`Baking ${glbs.length} .glb file(s) in ${abs}`);
  for (const glb of glbs) {
    const src = path.join(abs, glb);
    const dst = path.join(bakedDir, glb);
    // execFileSync with an arg array avoids shell parsing of filenames.
    // gltf-transform resolves relative texture URIs against the input GLB's
    // directory, so we keep cwd on the source dir.
    execFileSync('npx', ['--yes', '@gltf-transform/cli', 'copy', src, dst], {
      cwd: abs,
      stdio: 'inherit',
    });
  }

  // Promote baked files over the originals.
  for (const glb of glbs) {
    const bakedPath = path.join(bakedDir, glb);
    const targetPath = path.join(abs, glb);
    fs.renameSync(bakedPath, targetPath);
  }
  fs.rmSync(bakedDir, { recursive: true });

  // Remove staged texture companions — they're now inside the GLB.
  const texturesDir = path.join(abs, 'Textures');
  if (fs.existsSync(texturesDir)) {
    console.log(`Removing staged ${texturesDir}`);
    fs.rmSync(texturesDir, { recursive: true });
  }

  console.log(`Done. Baked ${glbs.length} GLB(s).`);
}

function main() {
  const [, , dir] = process.argv;
  if (!dir) {
    console.error('Usage: npx tsx scripts/bake-glb-textures.ts <dir>');
    process.exit(1);
  }
  bakeDir(dir);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
