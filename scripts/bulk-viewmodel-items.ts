/**
 * One-shot bulk authoring script: assigns a `viewmodel.glb` to every item
 * JSON in src/content/items/ that does not yet declare one. Picks an
 * existing extracted GLB based on item id/name/type — books/maps → books,
 * herbs/potions → bottles, weapons → sword, etc. Keeps the authored
 * viewmodel field stable so re-runs are idempotent.
 *
 * Usage: npx tsx scripts/bulk-viewmodel-items.ts
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';

const ITEMS_DIR = path.resolve('src/content/items');

interface ItemJson {
  id: string;
  name: string;
  type: string;
  equipSlot?: string;
  viewmodel?: { glb: string; handPose: string };
  [k: string]: unknown;
}

type HandPose = 'grip' | 'hold' | 'pinch' | 'open';

function pickGlb(item: ItemJson): { glb: string; handPose: HandPose } | null {
  const desc = `${item.id} ${item.name} ${item.type} ${item.equipSlot ?? ''}`.toLowerCase();

  if (/sword|branch|staff|wand/.test(desc)) {
    return { glb: '/assets/items/Sword-transformed.glb', handPose: 'grip' };
  }
  if (/hammer|mace|club/.test(desc)) {
    return { glb: '/assets/weapons/cleaver.glb', handPose: 'grip' };
  }
  if (/shield/.test(desc)) {
    return { glb: '/assets/items/MISC_2025-transformed.glb', handPose: 'open' };
  }
  if (/torch|lantern|boglantern/.test(desc)) {
    return { glb: '/assets/weapons/cleaver.glb', handPose: 'grip' };
  }
  if (/potion|salve|draught|antidote|elixir/.test(desc)) {
    return { glb: '/assets/items/bottles.glb', handPose: 'grip' };
  }
  if (/herb|leaf|moss|thyme|yarrow|comfrey|grailbloom|windcrown|silverleaf|shadowmoss|rare_herb/.test(desc)) {
    return { glb: '/assets/items/bottles.glb', handPose: 'pinch' };
  }
  if (/stew|ration|food|bread/.test(desc)) {
    return { glb: '/assets/items/stew-transformed.glb', handPose: 'open' };
  }
  if (/map|ledger|hymnal|recipe|manuscript|treatise|covenant/.test(desc)) {
    return { glb: '/assets/items/books.glb', handPose: 'open' };
  }
  if (/ring|signet|medallion|seal|stamp|token|key|grail/.test(desc)) {
    return { glb: '/assets/items/Treasure-transformed.glb', handPose: 'pinch' };
  }
  if (/cloak|disguise|armor|armour/.test(desc)) {
    return { glb: '/assets/items/MISC_2025-transformed.glb', handPose: 'open' };
  }
  // Fallback: treasure. Key-item curios read fine as a generic trinket.
  return { glb: '/assets/items/Treasure-transformed.glb', handPose: 'pinch' };
}

function main(): void {
  const files = readdirSync(ITEMS_DIR).filter((f) => f.endsWith('.json'));
  let touched = 0;
  for (const file of files) {
    const full = path.join(ITEMS_DIR, file);
    const raw = readFileSync(full, 'utf8');
    const item = JSON.parse(raw) as ItemJson;
    if (item.viewmodel?.glb) continue;
    const pick = pickGlb(item);
    if (!pick) continue;
    item.viewmodel = pick;
    writeFileSync(full, `${JSON.stringify(item, null, 2)}\n`);
    console.log(`  wired ${file} -> ${pick.glb} (${pick.handPose})`);
    touched++;
  }
  console.log(`\nTouched ${touched} item files.`);
}

main();
