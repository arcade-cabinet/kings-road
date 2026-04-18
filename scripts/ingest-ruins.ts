/**
 * Ingest ruins and graveyard assets from NAS into public/assets/ruins/.
 *
 * Sources:
 *   - 3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/
 *   - 3DLowPoly/Environment/Graveyard/Graveyard Kit/
 *
 * Usage: npx tsx scripts/ingest-ruins.ts [--dry-run]
 *
 * Idempotent — safe to re-run; only copies if source is newer than dest.
 */

import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import * as path from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');

const NAS = '/Volumes/home/assets';
const OUT_DIR = path.resolve('public/assets/ruins');

interface IngestEntry {
  /** Source GLB path (relative to NAS root) */
  src: string;
  /** Target filename in public/assets/ruins/ */
  dest: string;
}

const ENTRIES: IngestEntry[] = [
  // --- walls from Ultimate Modular Ruins Pack ---
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Wall_Broken.glb',
    dest: 'wall-broken.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Wall_Double_Broken.glb',
    dest: 'wall-double-broken.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Wall_ArchRound_Broken.glb',
    dest: 'wall-arch-round-broken.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Wall_ArchRound_Overgrown_Broken.glb',
    dest: 'wall-arch-round-overgrown-broken.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Wall_Overgrown.glb',
    dest: 'wall-overgrown.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Wall_Hole.glb',
    dest: 'wall-hole.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Wall_Double_Hole.glb',
    dest: 'wall-double-hole.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Wall_Half.glb',
    dest: 'wall-half.glb',
  },
  // --- scatter from ruins pack ---
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Skull.glb',
    dest: 'skull.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Pot1_Broken.glb',
    dest: 'pot-broken-1.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Pot2_Broken.glb',
    dest: 'pot-broken-2.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Pot3_Broken.glb',
    dest: 'pot-broken-3.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Brick.glb',
    dest: 'bricks.glb',
  },
  // --- structure from ruins pack ---
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Arch_Gothic.glb',
    dest: 'arch-gothic.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Arch_Round.glb',
    dest: 'arch-round.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Column_Round.glb',
    dest: 'column-round.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Column_Round_Short.glb',
    dest: 'column-round-short.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/Window_Bars_Overgrown.glb',
    dest: 'window-bars-overgrown.glb',
  },
  // --- flora from ruins pack ---
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/DeadTree_1.glb',
    dest: 'dead-tree-1.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/DeadTree_2.glb',
    dest: 'dead-tree-2.glb',
  },
  {
    src: '3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/DeadTree_3.glb',
    dest: 'dead-tree-3.glb',
  },
  // --- graves from Graveyard Kit ---
  {
    src: '3DLowPoly/Environment/Graveyard/Graveyard Kit/gravestone-bevel.glb',
    dest: 'gravestone-bevel.glb',
  },
  {
    src: '3DLowPoly/Environment/Graveyard/Graveyard Kit/gravestone-decorative.glb',
    dest: 'gravestone-decorative.glb',
  },
  {
    src: '3DLowPoly/Environment/Graveyard/Graveyard Kit/gravestone-broken.glb',
    dest: 'gravestone-broken.glb',
  },
  {
    src: '3DLowPoly/Environment/Graveyard/Graveyard Kit/gravestone-cross.glb',
    dest: 'gravestone-cross.glb',
  },
  {
    src: '3DLowPoly/Environment/Graveyard/Graveyard Kit/gravestone-round.glb',
    dest: 'gravestone-round.glb',
  },
  {
    src: '3DLowPoly/Environment/Graveyard/Graveyard Kit/grave.glb',
    dest: 'grave-mound.glb',
  },
  {
    src: '3DLowPoly/Environment/Graveyard/Graveyard Kit/coffin-old.glb',
    dest: 'coffin-old.glb',
  },
  {
    src: '3DLowPoly/Environment/Graveyard/Graveyard Kit/cross.glb',
    dest: 'cross.glb',
  },
  {
    src: '3DLowPoly/Environment/Graveyard/Graveyard Kit/cross-wood.glb',
    dest: 'cross-wood.glb',
  },
  {
    src: '3DLowPoly/Environment/Graveyard/Graveyard Kit/debris.glb',
    dest: 'debris.glb',
  },
  {
    src: '3DLowPoly/Environment/Graveyard/Graveyard Kit/debris-wood.glb',
    dest: 'debris-wood.glb',
  },
  {
    src: '3DLowPoly/Environment/Graveyard/Graveyard Kit/stone-wall-damaged.glb',
    dest: 'stone-wall-damaged.glb',
  },
];

function isNewer(src: string, dest: string): boolean {
  if (!existsSync(dest)) return true;
  return statSync(src).mtime > statSync(dest).mtime;
}

async function main(): Promise<void> {
  if (!existsSync(NAS)) {
    console.error(`NAS not mounted at ${NAS}. Mount it first.`);
    process.exit(1);
  }

  if (!DRY_RUN) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  let copied = 0;
  let skipped = 0;
  let missing = 0;

  for (const entry of ENTRIES) {
    const src = path.join(NAS, entry.src);
    const dest = path.join(OUT_DIR, entry.dest);

    if (!existsSync(src)) {
      console.warn(`  MISSING: ${entry.src}`);
      missing++;
      continue;
    }

    if (!isNewer(src, dest)) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [dry-run] copy ${entry.src} → ${entry.dest}`);
    } else {
      copyFileSync(src, dest);
      console.log(`  copied ${entry.dest}`);
    }
    copied++;
  }

  console.log(
    `\nDone. ${copied} copied, ${skipped} up-to-date, ${missing} missing.`,
  );

  if (missing > 0) {
    console.warn(
      `${missing} source file(s) not found. Check NAS mount and paths.`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
