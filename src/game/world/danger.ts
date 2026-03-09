import type { ChunkType } from '../types';

/**
 * Danger gradient based on distance from King's Road.
 *
 * Tier 0 (safe):      Town chunks, or on the King's Road (cx === 0)
 * Tier 1 (mild):      Road shoulder (|cx| === 1) — bandits (rare), wildlife
 * Tier 2 (moderate):  Wilderness (|cx| === 2) — wolves, brigands
 * Tier 3 (dangerous): Deep wild (|cx| >= 3) — monsters, undead
 * Tier 4 (extreme):   Dungeon interior — bosses, guardians
 */
export function getDangerTier(cx: number, _cz: number, chunkType: ChunkType): number {
  if (chunkType === 'TOWN') return 0;
  if (chunkType === 'DUNGEON') return 4;
  if (cx === 0) return 0; // On the King's Road
  const dist = Math.abs(cx);
  if (dist === 1) return 1;
  if (dist === 2) return 2;
  return 3;
}

/**
 * Get encounter chance per tick based on danger tier.
 * Higher tiers = more frequent encounters.
 */
export function getEncounterChance(tier: number): number {
  switch (tier) {
    case 0: return 0;
    case 1: return 0.001;
    case 2: return 0.005;
    case 3: return 0.01;
    case 4: return 0.02;
    default: return 0;
  }
}
