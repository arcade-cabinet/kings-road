import {
  type PacingConfig,
  PacingConfigSchema,
} from '../../schemas/pacing.schema';
import { cyrb128, mulberry32 } from '../utils/random';

/** A feature placement along the road spine. */
export interface FeaturePlacement {
  distance: number;
  tier: 'ambient' | 'minor' | 'major';
  featureId?: string;
}

/** Default pacing configuration. */
export const DEFAULT_PACING_CONFIG: PacingConfig = PacingConfigSchema.parse({
  ambientInterval: [200, 400],
  minorInterval: [300, 600],
  majorInterval: [1000, 1400],
  questMicroInterval: [2000, 2800],
  questMesoInterval: [4000, 5500],
  questMacroInterval: [8000, 10000],
  anchorInterval: [6000, 9000],
  walkSpeed: 4,
  sprintSpeed: 7,
});

/**
 * Sample an interval from a [min, max] range using jitter from the RNG.
 * Adds natural variation to prevent robotic regularity.
 */
function sampleInterval(
  range: readonly [number, number],
  rng: () => number,
): number {
  const [min, max] = range;
  return min + rng() * (max - min);
}

/**
 * Generate deterministic feature placements along a road of the given total distance.
 *
 * Uses seeded RNG so the same seed + config always produces the same placements.
 * Features are placed at intervals with jitter for each tier independently,
 * then merged and sorted by distance.
 */
export function generatePlacements(
  totalDistance: number,
  config: PacingConfig,
  seed: string,
): FeaturePlacement[] {
  const placements: FeaturePlacement[] = [];

  // Each tier gets its own RNG stream derived from the seed + tier name.
  // This ensures adding/changing one tier doesn't shift placements of others.
  const tiers: Array<{
    tier: FeaturePlacement['tier'];
    interval: readonly [number, number];
  }> = [
    { tier: 'ambient', interval: config.ambientInterval as [number, number] },
    { tier: 'minor', interval: config.minorInterval as [number, number] },
    { tier: 'major', interval: config.majorInterval as [number, number] },
  ];

  for (const { tier, interval } of tiers) {
    const rng = mulberry32(cyrb128(`${seed}:${tier}`));
    let cursor = sampleInterval(interval, rng);

    while (cursor < totalDistance) {
      placements.push({
        distance: Math.round(cursor),
        tier,
        featureId: `${tier}-${Math.round(cursor)}`,
      });
      cursor += sampleInterval(interval, rng);
    }
  }

  // Sort all placements by distance
  placements.sort((a, b) => a.distance - b.distance);

  return placements;
}

/**
 * High-level API: generate the full pacing layout for a road.
 * Validates the config via Zod before using it.
 */
export function generateRoadPacing(
  totalDistance: number,
  config: PacingConfig,
  seed: string,
): FeaturePlacement[] {
  const validated = PacingConfigSchema.parse(config);
  return generatePlacements(totalDistance, validated, seed);
}
