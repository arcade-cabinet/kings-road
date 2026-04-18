/**
 * Item and loot table loader.
 *
 * Loads items and loot tables from the content store (game.db) and populates
 * the ECS item-registry. Call initItemLoader() after the content store is
 * initialized during the loading screen phase.
 */

import {
  getAllItems,
  getLootTable as getLootTableFromStore,
  isContentStoreReady,
} from '@/db/content-queries';
import { registerItems } from '@/ecs/item-registry';
import type { LootTable } from '@/schemas/encounter-table.schema';
import type { ItemDefinition } from '@/schemas/item.schema';

let initialized = false;

/**
 * Populate the ECS item-registry from the content store.
 * Safe to call multiple times; only runs once.
 */
export function initItemLoader(): void {
  if (initialized) return;
  if (!isContentStoreReady()) return;
  registerItems(getAllItems());
  initialized = true;
}

// ── Public API ───────────────────────────────────────────────────────

/** Get all loaded item definitions. */
export function getAllItemDefinitions(): ItemDefinition[] {
  if (!isContentStoreReady()) return [];
  return getAllItems();
}

/** Look up a loot table by id. */
export function getLootTable(id: string): LootTable | undefined {
  if (!isContentStoreReady()) return undefined;
  return getLootTableFromStore(id);
}
