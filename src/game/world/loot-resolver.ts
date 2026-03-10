/**
 * Loot resolver — rolls item drops from loot tables using seeded RNG.
 *
 * Each loot table entry has a weight (0-1) representing the probability of
 * that item dropping, and a quantity range [min, max]. The resolver rolls
 * each entry independently, producing a list of dropped items.
 *
 * This is NOT a weighted-random-selection (where weights sum to 1 and only
 * one item drops). Instead, each entry is an independent probability, so
 * multiple items can drop from a single table roll. This gives a more
 * satisfying loot experience.
 */
import type { LootTable } from '../../schemas/encounter-table.schema';
import { getLootTable } from './item-loader';

/** A single dropped item from a loot roll */
export interface LootDrop {
  itemId: string;
  quantity: number;
}

/**
 * Roll loot from a loot table.
 *
 * Each entry in the table is rolled independently against its weight.
 * If the roll succeeds, a random quantity in [min, max] is generated.
 *
 * @param tableId - Loot table id from content/loot/
 * @param rng - Seeded random number generator (0-1)
 * @returns Array of dropped items (may be empty if nothing drops)
 */
export function rollLoot(tableId: string, rng: () => number): LootDrop[] {
  const table = getLootTable(tableId);
  if (!table) return [];

  return rollLootFromTable(table, rng);
}

/**
 * Roll loot directly from a LootTable object (for testing or pre-resolved tables).
 */
export function rollLootFromTable(
  table: LootTable,
  rng: () => number,
): LootDrop[] {
  const drops: LootDrop[] = [];

  for (const entry of table.entries) {
    const roll = rng();
    if (roll < entry.weight) {
      const [minQty, maxQty] = entry.quantity;
      const quantity =
        minQty === maxQty
          ? minQty
          : minQty + Math.floor(rng() * (maxQty - minQty + 1));

      drops.push({
        itemId: entry.itemId,
        quantity,
      });
    }
  }

  return drops;
}
