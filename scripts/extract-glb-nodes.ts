/**
 * Extract each named scene node from a packed GLB into its own single-node
 * GLB on disk, and (optionally) emit a ready-to-use React Three Fiber
 * component per extraction via gltfjsx. Useful for asset packs that bundle
 * many unrelated meshes (Village_Buildings, weapons_japanese, MineProps,
 * etc.) — splitting them up lets the runtime load only what it needs and
 * gives each extracted model a typed component file ready for import.
 *
 * Usage:
 *   npx tsx scripts/extract-glb-nodes.ts <input.glb> <out-dir> [--tsx <components-dir>]
 *
 * Each output GLB is named after the node's `name` property, lowercased
 * and kebab-cased. Materials + textures referenced by the node are carried
 * into the new file; unused resources are pruned. When --tsx is passed, a
 * typed React component (gltfjsx output) is written next to each GLB so
 * consumers can `import { Model } from '@app/...'` instead of hand-rolling
 * useGLTF + node lookups.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { dedup, prune } from '@gltf-transform/functions';

function kebab(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

async function extract(
  inputPath: string,
  outDir: string,
  tsxDir?: string,
): Promise<void> {
  if (!existsSync(inputPath)) {
    throw new Error(`input GLB not found: ${inputPath}`);
  }
  mkdirSync(outDir, { recursive: true });
  if (tsxDir) mkdirSync(tsxDir, { recursive: true });

  const io = new NodeIO();

  // Read once to enumerate scene nodes.
  const sourceDoc = await io.read(inputPath);
  const sourceScene = sourceDoc.getRoot().listScenes()[0];
  const nodeNames: string[] = [];
  for (const node of sourceScene.listChildren()) {
    const name = node.getName();
    if (name) nodeNames.push(name);
  }

  for (const name of nodeNames) {
    // Re-read fresh for each extraction — simpler than deep-copying within
    // one document, and prune() runs on the fresh copy to drop everything
    // we don't touch.
    const doc = await io.read(inputPath);
    const scene = doc.getRoot().listScenes()[0];
    for (const node of scene.listChildren()) {
      if (node.getName() !== name) {
        scene.removeChild(node);
        node.dispose();
      }
    }
    await doc.transform(prune(), dedup());
    const kebabName = kebab(name);
    const outPath = path.join(outDir, `${kebabName}.glb`);
    await io.write(outPath, doc);
    console.log(`  wrote ${outPath}`);

    if (tsxDir) {
      const tsxPath = path.join(tsxDir, `${kebabName}.tsx`);
      // Resolve the project-pinned gltfjsx CLI. It ships in node_modules/.bin
      // (pnpm layout). No hardcoded absolute path — works anywhere the
      // package has been installed.
      const gltfjsxBin = path.resolve('node_modules', '.bin', 'gltfjsx');
      try {
        execFileSync(
          gltfjsxBin,
          [outPath, '--types', '--shadows', '--output', tsxPath, '--keepnames'],
          { stdio: 'inherit' },
        );
        // Post-process the generated TSX to:
        //   1. Route useGLTF through @/lib/assets#assetUrl so GitHub Pages
        //      + Capacitor base paths resolve correctly.
        //   2. Use React.JSX.IntrinsicElements (React 19 namespace).
        //   3. Rewrite the hardcoded `/<name>.glb` path to the actual
        //      public/assets/... location.
        const publicRel = path
          .relative('public', outPath)
          .split(path.sep)
          .join('/');
        const { readFileSync, writeFileSync } = await import('node:fs');
        let src = readFileSync(tsxPath, 'utf8');
        src = src
          .replace(
            "import { useGLTF } from '@react-three/drei'",
            "import { useGLTF } from '@react-three/drei'\nimport { assetUrl } from '@/lib/assets'",
          )
          .replace(/JSX\.IntrinsicElements/g, 'React.JSX.IntrinsicElements')
          .replace(
            new RegExp(`useGLTF\\('/${kebabName}\\.glb'\\)`, 'g'),
            `useGLTF(assetUrl('/${publicRel}'))`,
          )
          .replace(
            new RegExp(`useGLTF\\.preload\\('/${kebabName}\\.glb'\\)`, 'g'),
            `useGLTF.preload(assetUrl('/${publicRel}'))`,
          )
          // Drop the dangling `animations: GLTFAction[]` line — gltfjsx
          // emits the reference without importing the type. Safe to remove
          // since our extractor targets static props (buildings, weapons,
          // dungeon furniture); animated GLBs need a different pipeline.
          .replace(/^\s*animations:\s*GLTFAction\[\]\s*$/gm, '')
          // TS can't narrow `GLTF & ObjectMap` → `GLTFResult` via a direct
          // cast because the node/material shapes don't structurally overlap
          // with the generic `ObjectMap`. Widen via `unknown` first.
          .replace(/as\s+GLTFResult/g, 'as unknown as GLTFResult');
        writeFileSync(tsxPath, src);
        console.log(`  wrote ${tsxPath}`);
      } catch (err) {
        console.warn(
          `  gltfjsx failed for ${outPath}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const tsxFlagIdx = args.indexOf('--tsx');
  const tsxDir = tsxFlagIdx >= 0 ? args[tsxFlagIdx + 1] : undefined;
  const positional = args.filter(
    (_, i) => i !== tsxFlagIdx && i !== tsxFlagIdx + 1,
  );
  const [inputPath, outDir] = positional;
  if (!inputPath || !outDir) {
    console.error(
      'Usage: npx tsx scripts/extract-glb-nodes.ts <input.glb> <out-dir> [--tsx <components-dir>]',
    );
    process.exit(1);
  }
  console.log(`Extracting nodes from ${inputPath} -> ${outDir}`);
  if (tsxDir) console.log(`Emitting TSX components to ${tsxDir}`);
  await extract(inputPath, outDir, tsxDir);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
