import { Vector3 } from 'three';
import { startGame } from '@/ecs/actions/game';
import { syncInventory } from '@/ecs/actions/inventory-ui';
import type { ItemStack } from '@/ecs/traits/inventory';

/** Biome id → road distance (metres from Ashford) for known spawn points. */
const BIOME_ANCHORS: Record<string, number> = {
  thornfield: 12000,
  ashford: 0,
  millbrook: 6000,
  ravensgate: 17000,
  pilgrims_rest: 21000,
  grailsend: 28000,
};

/** Starter loadout granted on every debug spawn. */
const STARTER_ITEMS: ItemStack[] = [
  { itemId: 'iron_sword', quantity: 1 },
  { itemId: 'health_potion', quantity: 3 },
  { itemId: 'torch', quantity: 1 },
];

/** Player spawns slightly off-road so they don't clip into the spine path. */
function anchorToWorldPos(distanceFromStart: number): Vector3 {
  return new Vector3(distanceFromStart, 0, 2);
}

/**
 * Parse `?spawn=<biome>` from the current URL.
 * Returns the normalised biome id string, or null when absent.
 */
export function parseSpawnParam(): string | null {
  if (!import.meta.env.DEV) return null;

  const fromUrl = new URLSearchParams(window.location.search).get('spawn');
  if (fromUrl) return fromUrl.toLowerCase().replace(/-/g, '_');

  const fromEnv = import.meta.env.VITE_DEBUG_SPAWN;
  if (fromEnv) return (fromEnv as string).toLowerCase().replace(/-/g, '_');

  return null;
}

/**
 * Apply the debug spawn override.  No-ops in production builds.
 *
 * Call once at app startup (before the React tree renders).  When a valid
 * `?spawn=<biome>` param is detected the function:
 *   1. Picks the road anchor for that biome.
 *   2. Calls `startGame()` with a deterministic dev seed and the anchor position.
 *   3. Seeds the inventory with the starter loadout.
 *
 * Returns true if a spawn override was applied (caller should skip the main
 * menu), false otherwise.
 */
export function applyDebugSpawn(): boolean {
  if (!import.meta.env.DEV) return false;

  const biomeId = parseSpawnParam();
  if (!biomeId) return false;

  const distance = BIOME_ANCHORS[biomeId];
  if (distance === undefined) {
    console.warn(
      `[debug/spawn] Unknown biome "${biomeId}". Valid ids: ${Object.keys(BIOME_ANCHORS).join(', ')}`,
    );
    return false;
  }

  const pos = anchorToWorldPos(distance);
  const devSeed = `debug-${biomeId}-seed`;

  startGame(devSeed, pos, 0);

  syncInventory(STARTER_ITEMS, 20, 0, {
    head: null,
    chest: null,
    legs: null,
    feet: null,
    weapon: 'iron_sword',
    shield: null,
    accessory: null,
  });

  return true;
}
