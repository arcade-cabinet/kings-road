import type { KingdomMap, KingdomRegion } from '@/schemas/kingdom.schema';
import type { LegacyChunkType } from '@/types/game';
import { getRegionAt } from './kingdom-gen';

/**
 * Danger gradient driven by the kingdom map's region system.
 *
 * Tier 0 (safe):      Town chunks, Road chunks, or regions with dangerTier 0
 * Tier 1 (mild):      Regions with dangerTier 1 — bandits (rare), wildlife
 * Tier 2 (moderate):  Regions with dangerTier 2 — wolves, brigands
 * Tier 3 (dangerous): Regions with dangerTier 3 — monsters, undead
 * Tier 4 (extreme):   Dungeon chunks, or regions with dangerTier 4
 *
 * Falls back to tier 1 for wilderness tiles outside any authored region.
 */
export function getDangerTier(
  cx: number,
  cz: number,
  chunkType: LegacyChunkType,
  kingdomMap?: KingdomMap | null,
): number {
  if (chunkType === 'TOWN') return 0;
  if (chunkType === 'DUNGEON') return 4;
  if (chunkType === 'ROAD') return 0;

  // Look up the authored region for this chunk
  if (kingdomMap) {
    const region = getRegionAt(kingdomMap, cx, cz);
    if (region) {
      return region.dangerTier ?? 1;
    }
  }

  // Wilderness outside any region — mild danger
  return 1;
}

/**
 * Get the kingdom region at a chunk position (convenience re-export for callers).
 */
export function getRegionDangerTier(
  kingdomMap: KingdomMap,
  cx: number,
  cz: number,
): { tier: number; region: KingdomRegion | undefined } {
  const region = getRegionAt(kingdomMap, cx, cz);
  return { tier: region?.dangerTier ?? 1, region };
}

/**
 * Get encounter chance per tick based on danger tier.
 * Higher tiers = more frequent encounters.
 *
 * These are per-frame probabilities, checked every ENCOUNTER_COOLDOWN seconds.
 * At 60fps with 15s cooldown: tier 1 ≈ 1 encounter per ~16 min of walking,
 * tier 4 ≈ 1 encounter per ~50 seconds of walking in the wilds.
 */
export function getEncounterChance(tier: number): number {
  switch (tier) {
    case 0:
      return 0;
    case 1:
      return 0.001;
    case 2:
      return 0.005;
    case 3:
      return 0.01;
    case 4:
      return 0.02;
    default:
      return 0;
  }
}
