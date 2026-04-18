#!/usr/bin/env -S npx tsx
import * as fs from 'node:fs';
import * as path from 'node:path';

const DEFAULT_SOURCE =
  '/Volumes/home/assets/3DLowPoly/Environment/Dungeon/KayKit_DungeonRemastered_1.1_FREE';
const SOURCE_DIR = process.env['DUNGEON_KIT_SOURCE'] ?? DEFAULT_SOURCE;
const DEST_DIR = path.resolve(
  import.meta.dirname,
  '../public/assets/dungeon/kit',
);

const DRY_RUN = process.argv.includes('--dry-run');

// Maps source filename (underscore) → dest filename (kebab-case)
const MANIFEST: Array<{ src: string; dest: string }> = [
  { src: 'wall.glb', dest: 'wall.glb' },
  { src: 'wall_cracked.glb', dest: 'wall-cracked.glb' },
  { src: 'wall_broken.glb', dest: 'wall-broken.glb' },
  { src: 'wall_arched.glb', dest: 'wall-arched.glb' },
  { src: 'wall_half.glb', dest: 'wall-half.glb' },
  { src: 'wall_pillar.glb', dest: 'wall-pillar.glb' },
  { src: 'wall_endcap.glb', dest: 'wall-endcap.glb' },
  { src: 'wall_corner.glb', dest: 'wall-corner.glb' },
  { src: 'floor_tile_large.glb', dest: 'floor-tile-large.glb' },
  { src: 'floor_dirt_large.glb', dest: 'floor-dirt-large.glb' },
  {
    src: 'floor_tile_small_broken_A.glb',
    dest: 'floor-tile-small-broken-a.glb',
  },
  { src: 'floor_tile_grate.glb', dest: 'floor-tile-grate.glb' },
  { src: 'ceiling_tile.glb', dest: 'ceiling-tile.glb' },
  { src: 'wall_doorway.glb', dest: 'wall-doorway.glb' },
  { src: 'wall_gated.glb', dest: 'wall-gated.glb' },
  { src: 'wall_archedwindow_open.glb', dest: 'wall-arched-window-open.glb' },
  { src: 'torch_lit.glb', dest: 'torch-lit.glb' },
  { src: 'torch_mounted.glb', dest: 'torch-mounted.glb' },
  { src: 'barrel_large.glb', dest: 'barrel-large.glb' },
  { src: 'barrel_small.glb', dest: 'barrel-small.glb' },
  { src: 'column.glb', dest: 'column.glb' },
  { src: 'floor_dirt_large_rocky.glb', dest: 'floor-dirt-large-rocky.glb' },
];

if (!DRY_RUN) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}

let copied = 0;
let skipped = 0;
let missing = 0;

for (const { src, dest } of MANIFEST) {
  const srcPath = path.join(SOURCE_DIR, src);
  const destPath = path.join(DEST_DIR, dest);

  if (!fs.existsSync(srcPath)) {
    console.error(`MISSING: ${src}`);
    missing++;
    continue;
  }

  if (!DRY_RUN && fs.existsSync(destPath)) {
    const srcMtime = fs.statSync(srcPath).mtimeMs;
    const destMtime = fs.statSync(destPath).mtimeMs;
    if (destMtime >= srcMtime) {
      console.log(`SKIP (up to date): ${dest}`);
      skipped++;
      continue;
    }
  }

  console.log(`COPY: ${src} → ${dest}`);
  if (!DRY_RUN) {
    fs.copyFileSync(srcPath, destPath);
  }
  copied++;
}

console.log(`\n${copied} copied, ${skipped} skipped, ${missing} missing`);
if (missing > 0) process.exit(1);
