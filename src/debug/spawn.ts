import { Vector3 } from 'three';
import { loadContentDb } from '@/db/load-content-db';
import { startGame } from '@/ecs/actions/game';
import { syncInventory } from '@/ecs/actions/inventory-ui';
import { resolveNarrative } from '@/ecs/actions/quest';
import { generateWorld, setWorldState } from '@/ecs/actions/world';
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
 * Apply the debug spawn override. No-ops in production builds.
 *
 * Call once at app startup (before the React tree renders). When a valid
 * `?spawn=<biome>` param is detected the function:
 *   1. Loads the content DB and generates the kingdom map (same work the
 *      main-menu "New Pilgrimage" path does).
 *   2. Picks the road anchor for that biome.
 *   3. Calls `startGame()` with a deterministic dev seed and the anchor position.
 *   4. Seeds the inventory with the starter loadout.
 *
 * Returns a promise that resolves to true when a spawn override was applied
 * (caller should skip the main menu), false otherwise. The async path is fire-
 * and-forget-safe — callers are expected to return the synchronous result as
 * soon as it's known so React can mount the scene shell while generation
 * progresses under the LoadingOverlay.
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

  // Kick off the same boot sequence the main menu runs. Fire-and-forget:
  // the LoadingOverlay watches `isGenerating` + `activeChunks.size` and fades
  // once the world is ready.
  void (async () => {
    try {
      setWorldState({
        isGenerating: true,
        generationProgress: 0,
        generationPhase: 'Loading the scrolls of knowledge...',
      });
      await loadContentDb();
      await generateWorld(devSeed);
      resolveNarrative(devSeed);

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
    } catch (err) {
      console.error('[debug/spawn] applyDebugSpawn failed:', err);
      setWorldState({ isGenerating: false });
    }
  })();

  return true;
}
