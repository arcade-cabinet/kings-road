/**
 * Batch driver for extract-glb-nodes.ts — runs the per-node GLB split
 * and React component generation for every known asset pack in the
 * repo. Idempotent: re-running overwrites the existing outputs.
 *
 * Usage:
 *   pnpm extract:all-packs
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

interface PackSpec {
  /** Path to the packed GLB under public/assets/. */
  input: string;
  /** Where the extracted per-node GLBs land (public/assets/.../dir). */
  out: string;
  /** Where the generated gltfjsx TSX components land. */
  tsx: string;
}

const PACKS: PackSpec[] = [
  {
    input: 'public/assets/buildings/Village_Buildings.glb',
    out: 'public/assets/buildings/village',
    tsx: 'app/scene/generated/village',
  },
  {
    input: 'public/assets/dungeon/Crates_and_barrels.glb',
    out: 'public/assets/dungeon/crates',
    tsx: 'app/scene/generated/crates',
  },
  {
    input: 'public/assets/dungeon/MineProps.glb',
    out: 'public/assets/dungeon/mine',
    tsx: 'app/scene/generated/mine',
  },
  {
    input: 'public/assets/dungeon/traps.glb',
    out: 'public/assets/dungeon/trap',
    tsx: 'app/scene/generated/trap',
  },
  {
    input: 'public/assets/weapons/weapons-pack.glb',
    out: 'public/assets/weapons/pack',
    tsx: 'app/scene/generated/weapons-pack',
  },
  {
    input: 'public/assets/items/weapons_japanese.glb',
    out: 'public/assets/items/weapons-japanese',
    tsx: 'app/scene/generated/weapons-japanese',
  },
];

const EXTRACT_SCRIPT = path.resolve('scripts', 'extract-glb-nodes.ts');

function extractPack(pack: PackSpec): void {
  if (!existsSync(pack.input)) {
    console.warn(`skip: input missing: ${pack.input}`);
    return;
  }
  console.log(`\n=== ${pack.input} ===`);
  execFileSync(
    'npx',
    ['tsx', EXTRACT_SCRIPT, pack.input, pack.out, '--tsx', pack.tsx],
    { stdio: 'inherit' },
  );
}

function main(): void {
  for (const pack of PACKS) extractPack(pack);
  console.log('\nAll packs extracted.');
}

main();
