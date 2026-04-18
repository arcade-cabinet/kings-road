/**
 * General-purpose GLB inspector. Reports mesh/skin/joint/animation
 * counts and animation clip names for a given GLB or a directory of
 * GLBs. Used when planning rigged-asset integrations — you run it to
 * find out what animation clips an unknown pack actually ships with.
 *
 * Usage:
 *   npx tsx scripts/inspect-glb-pack.ts public/assets/monsters
 *   npx tsx scripts/inspect-glb-pack.ts public/assets/player.glb
 */

import { readdirSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { NodeIO } from '@gltf-transform/core';

async function inspect(path: string): Promise<void> {
  const io = new NodeIO();
  try {
    const doc = await io.read(path);
    const root = doc.getRoot();
    const meshes = root.listMeshes();
    const skins = root.listSkins();
    const animations = root.listAnimations();
    const jointTotal = skins.reduce((acc, s) => acc + s.listJoints().length, 0);

    console.log(`\n=== ${path} ===`);
    console.log(
      `  meshes=${meshes.length}  skins=${skins.length}  joints=${jointTotal}  animations=${animations.length}`,
    );
    if (animations.length > 0) {
      const animNames = animations.map((a) => a.getName() || '?').join(', ');
      console.log(`  animations: ${animNames}`);
    }
    if (meshes.length <= 12) {
      const meshNames = meshes.map((m) => m.getName() || '?').join(', ');
      console.log(`  meshes: ${meshNames}`);
    }
  } catch (err) {
    console.log(`\n=== ${path} ===`);
    console.log(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main(): Promise<void> {
  const target = process.argv[2];
  if (!target) {
    console.error(
      'Usage: npx tsx scripts/inspect-glb-pack.ts <path-to-glb-or-dir>',
    );
    process.exit(1);
  }
  const st = statSync(target);
  if (st.isFile()) {
    await inspect(target);
    return;
  }
  const files = readdirSync(target, { recursive: true })
    .filter((f): f is string => typeof f === 'string')
    .filter((f) => extname(f).toLowerCase() === '.glb')
    .sort();
  for (const file of files) {
    await inspect(`${target}/${file}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
