import { Vector3 } from 'three';
import { loadContentDb } from '@/db/load-content-db';
import { startGame } from '@/ecs/actions/game';
import { syncInventory } from '@/ecs/actions/inventory-ui';
import { resolveNarrative } from '@/ecs/actions/quest';
import { generateWorld, setWorldState } from '@/ecs/actions/world';
import type { ItemStack } from '@/ecs/traits/inventory';
import type { KingdomMap } from '@/schemas/kingdom.schema';
import { CHUNK_SIZE, PLAYER_HEIGHT } from '@/utils/worldCoords';

/**
 * URL spawn id → kingdom-settlement id. Settlement ids in
 * `content/world/kingdom-config.json` use hyphens (e.g. "thornfield-ruins")
 * but URL params normalize to underscores. This map picks the settlement
 * the user probably meant when the biome id doesn't match a settlement
 * directly.
 */
const SPAWN_ID_TO_SETTLEMENT: Record<string, string> = {
  ashford: 'ashford',
  millbrook: 'millbrook',
  thornfield: 'thornfield-ruins',
  ravensgate: 'ravensgate',
  pilgrims_rest: 'pilgrims-rest',
  grailsend: 'grailsend',
};

/** Starter loadout granted on every debug spawn. */
const STARTER_ITEMS: ItemStack[] = [
  { itemId: 'iron_sword', quantity: 1 },
  { itemId: 'health_potion', quantity: 3 },
  { itemId: 'torch', quantity: 1 },
];

/**
 * Resolve a spawn id to a world-space position by looking up the matching
 * settlement in the generated kingdom map. Falls back to a position near
 * Ashford when the settlement can't be found (the kingdom-gen may have
 * dropped the settlement for the seeded layout, in which case a visible
 * spawn beats a silent crash at (0,0,0)).
 */
function resolveSpawnPosition(
  spawnId: string,
  kingdomMap: KingdomMap,
): Vector3 {
  const targetId = SPAWN_ID_TO_SETTLEMENT[spawnId] ?? spawnId;
  const settlement =
    kingdomMap.settlements.find((s) => s.id === targetId) ??
    kingdomMap.settlements.find((s) => s.id === 'ashford');
  if (!settlement) {
    throw new Error(
      `[debug/spawn] No settlement "${targetId}" and no Ashford fallback in kingdom map`,
    );
  }
  const [gx, gy] = settlement.position;
  // Offset the spawn along +X (east of the road axis) by 25m so the player
  // isn't standing on the road itself — facing north (default yaw) then
  // puts ruins + NPCs + road diagonally across the view instead of all
  // hidden off-screen to the sides. Thornfield's town centre is at the
  // road; this offset puts the player on the settlement flank where
  // buildings and dead trees cluster.
  return new Vector3(
    gx * CHUNK_SIZE + CHUNK_SIZE / 2 + 25,
    PLAYER_HEIGHT,
    gy * CHUNK_SIZE + CHUNK_SIZE / 2,
  );
}

/**
 * Parse `?spawn=<biome>` from the current URL.
 * Returns the normalised biome id string, or null when absent.
 *
 * Works in both DEV and production builds so the GitHub Pages deploy can
 * deep-link straight into a biome for mobile playtests and benchmarks.
 * `VITE_DEBUG_SPAWN` still lets a build be baked to auto-spawn without a
 * query string (used by the Pages deploy to drop visitors straight into
 * Thornfield by default).
 */
export function parseSpawnParam(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get('spawn');
  if (fromUrl) return fromUrl.toLowerCase().replace(/-/g, '_');

  const fromEnv = import.meta.env.VITE_DEBUG_SPAWN;
  if (fromEnv) return (fromEnv as string).toLowerCase().replace(/-/g, '_');

  return null;
}

/**
 * Apply the spawn override if one is present in the URL or build env.
 *
 * Runs in both DEV and production builds — the GitHub Pages deploy bakes
 * `VITE_DEBUG_SPAWN=thornfield` into its build so hitting the root URL on a
 * mobile/foldable drops straight into the benchmark biome without a menu
 * click. Locally, `pnpm dev` leaves VITE_DEBUG_SPAWN unset, so the main
 * menu still shows until a `?spawn=<biome>` query is added.
 *
 * Call once at app startup (before the React tree renders). When a valid
 * spawn id is detected the function:
 *   1. Loads the content DB and generates the kingdom map (same work the
 *      main-menu "New Pilgrimage" path does).
 *   2. Finds the matching settlement in the generated map and spawns the
 *      player at the settlement's grid center (not 1D road distance —
 *      that puts the player in the ocean).
 *   3. Calls `startGame()` with a deterministic dev seed derived from the
 *      spawn id (`debug-<id>-seed`). The seed is intentionally deterministic
 *      so benchmarks and QA runs produce the same world every time, in
 *      both prod and dev.
 *   4. Seeds the inventory with a starter loadout so the player arrives
 *      ready to explore.
 *
 * Returns true when a spawn override was applied (caller should skip the
 * main menu), false otherwise. The async boot runs fire-and-forget so the
 * LoadingOverlay can mount immediately; it fades once the kingdom map is
 * populated and chunks activate.
 */
export function applyDebugSpawn(): boolean {
  const biomeId = parseSpawnParam();
  if (!biomeId) return false;

  if (!SPAWN_ID_TO_SETTLEMENT[biomeId]) {
    console.warn(
      `[debug/spawn] Unknown spawn id "${biomeId}". Valid ids: ${Object.keys(SPAWN_ID_TO_SETTLEMENT).join(', ')}`,
    );
    return false;
  }

  const devSeed = `debug-${biomeId}-seed`;

  void (async () => {
    try {
      setWorldState({
        isGenerating: true,
        generationProgress: 0,
        generationPhase: 'Loading the scrolls of knowledge...',
      });
      await loadContentDb();
      const map = await generateWorld(devSeed);
      resolveNarrative(devSeed);

      const pos = resolveSpawnPosition(biomeId, map);
      // Yaw=0 (north) — combined with the +25 m X offset in
      // resolveSpawnPosition, this puts the settlement ruins diagonally
      // across the forward view. A previous revision set yaw=π/4 at
      // spawn; it was silently reset somewhere between startGame and
      // the first PlayerController frame — needs a separate
      // investigation, tracked on task #32. Positional offset achieves
      // the same "see the village" goal without relying on yaw.
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
