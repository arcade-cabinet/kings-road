/**
 * Per-biome visual parameters for post-processing.
 *
 * Warmth is a signed scalar:
 *   +1.0  = maximum warm tint (deep amber / golden hour)
 *    0.0  = neutral (no color shift)
 *   -1.0  = maximum cool tint (blue-grey fog)
 *
 * Values are keyed by biome id as registered in BiomeService. Aliases
 * (e.g. "farmland" → "meadow") inherit the canonical biome's warmth via
 * getBiomeWarmth's fallback chain.
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

const BIOME_WARMTH: Record<string, BiomeWarmthEntry> = {
  meadow: { warmth: 0.15, saturation: 0.08 },
  forest: { warmth: 0.05, saturation: 0.04 },
  thornfield: { warmth: -0.08, saturation: -0.05 },
  moor: { warmth: -0.2, saturation: -0.1 },
  ocean: { warmth: -0.1, saturation: 0.06 },
  // Alias targets — mirror the canonical biome so the lookup never fails
  // for the extended biome ids that BiomeService.BIOME_ALIASES remaps.
  farmland: { warmth: 0.15, saturation: 0.08 }, // → meadow
  riverside: { warmth: 0.1, saturation: 0.05 }, // → meadow, water glint
  coast: { warmth: -0.08, saturation: 0.06 }, // → meadow/ocean blend
  swamp: { warmth: -0.15, saturation: -0.08 }, // → moor
  hills: { warmth: -0.08, saturation: -0.04 }, // → moor (Thornfield hills)
  highland: { warmth: -0.1, saturation: -0.06 }, // → moor
  mountain: { warmth: -0.18, saturation: -0.1 }, // → moor
  deep_forest: { warmth: 0.03, saturation: 0.02 }, // → forest
};

const NEUTRAL: BiomeWarmthEntry = { warmth: 0, saturation: 0 };

/**
 * Return the warmth/saturation entry for a biome id.
 * Falls back to neutral if the id is unknown (new biomes shouldn't crash).
 */
export function getBiomeWarmth(biomeId: string): BiomeWarmthEntry {
  return BIOME_WARMTH[biomeId] ?? NEUTRAL;
}
