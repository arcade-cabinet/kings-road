/**
 * Dungeon registry — provides dungeon layout lookup.
 *
 * Each dungeon has an anchorId linking it to a road-spine anchor, which maps
 * to a settlement on the kingdom map. When the player enters a settlement
 * that has a dungeon, the registry provides the layout for generation.
 *
 * Content is sourced from the content store (game.db) at runtime.
 */

import {
  getAllDungeons as getAllDungeonsFromStore,
  getDungeon,
  isContentStoreReady,
} from '@/db/content-queries';
import type { DungeonLayout } from '@/schemas/dungeon.schema';

/** Look up a dungeon layout by its content id. */
export function getDungeonById(id: string): DungeonLayout | undefined {
  if (!isContentStoreReady()) return undefined;
  return getDungeon(id);
}

/** Look up a dungeon layout by its road-spine anchor id. */
export function getDungeonByAnchor(
  anchorId: string,
): DungeonLayout | undefined {
  if (!isContentStoreReady()) return undefined;
  const all = getAllDungeonsFromStore();
  return all.find((d) => d.anchorId === anchorId);
}

/** Get all registered dungeon layouts. */
export function getAllDungeons(): DungeonLayout[] {
  if (!isContentStoreReady()) return [];
  return getAllDungeonsFromStore();
}
