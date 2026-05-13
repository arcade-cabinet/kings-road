/**
 * Per-biome visual parameters for post-processing.
 *
 * Warmth is a signed scalar:
 *   +1.0  = maximum warm tint (deep amber / golden hour)
 *    0.0  = neutral (no color shift)
 *   -1.0  = maximum cool tint (blue-grey fog)
 *
 * Keys are canonical biome ids as registered in BiomeService (meadow,
 * forest, thornfield, moor, ocean). getBiomeWarmth() does a direct Map
 * lookup and returns NEUTRAL for any id that is not present here — new
 * biomes won't crash, they will simply carry no warmth shift until an
 * entry is added.
 *
 * Design rationale (road progression, distance 0–28000):
 *   - meadow (Ashford 0–6000): warmest. Golden pastoral morning light,
 *     rolling fields, honey limestone. The game's emotional home base.
 *   - forest (Millbrook 6000–12000): slightly warm but green-muted.
 *     Dappled canopy light; a little more mysterious.
 *   - thornfield (12000 area): darker, overcast. Ancient ruins; sky
 *     bleached by old magic. Slight cool shift without going grey.
 *   - moor (Ravensgate 17000–21000): coolest. Peat bogs, mist banks,
 *     standing stones. Blue-grey atmosphere.
 *   - ocean: cool coastal sea light.
 */

export interface BiomeWarmthEntry {
  /** Signed warmth in [-1, 1]. Positive = warmer, negative = cooler. */
  warmth: number;
  /**
   * Saturation modifier in [-0.5, 0.5].
   * Positive = richer colours; negative = desaturated / washed-out.
   */
  saturation: number;
}

const BIOME_WARMTH: Record<string, Readonly<BiomeWarmthEntry>> = {
  meadow: Object.freeze({ warmth: 0.15, saturation: 0.08 }),
  forest: Object.freeze({ warmth: 0.05, saturation: 0.04 }),
  thornfield: Object.freeze({ warmth: -0.08, saturation: -0.05 }),
  moor: Object.freeze({ warmth: -0.2, saturation: -0.1 }),
  ocean: Object.freeze({ warmth: -0.1, saturation: 0.06 }),
};

const NEUTRAL: Readonly<BiomeWarmthEntry> = Object.freeze({
  warmth: 0,
  saturation: 0,
});

/**
 * Returns the warmth entry for a canonical biome ID, or NEUTRAL if unknown.
 * Falls back to neutral if the id is unknown (new biomes shouldn't crash).
 */
export function getBiomeWarmth(biomeId: string): Readonly<BiomeWarmthEntry> {
  return BIOME_WARMTH[biomeId] ?? NEUTRAL;
}
