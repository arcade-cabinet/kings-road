import type { BiomeConfig } from '@/biome';
import { createRng } from '@/core';
import { getAssetsByCategory, weightedPick } from './assets';
import type { RuinsPlacement, TownConfig } from './types';

/**
 * Layout constants — how many of each category to place per town-sized chunk.
 * Thornfield biases toward graves and scatter to evoke "inhabited by the dead".
 */
const CATEGORY_COUNTS = {
  walls: { min: 6, max: 10 },
  graves: { min: 5, max: 9 },
  scatter: { min: 6, max: 10 },
  structure: { min: 2, max: 4 },
  flora: { min: 2, max: 5 },
} as const;

type Category = keyof typeof CATEGORY_COUNTS;

/** Two-pass Poisson-disk rejection for ruins — simpler than full Bridson since
 *  ruins are sparser and we want natural clustering. */
function placeInRadius(
  center: { x: number; z: number },
  radius: number,
  count: number,
  minSpacing: number,
  rng: () => number,
): Array<{ x: number; z: number }> {
  const placed: Array<{ x: number; z: number }> = [];
  let attempts = 0;

  while (placed.length < count && attempts < count * 50) {
    attempts++;
    const angle = rng() * Math.PI * 2;
    const dist = Math.sqrt(rng()) * radius;
    const x = center.x + Math.cos(angle) * dist;
    const z = center.z + Math.sin(angle) * dist;

    const tooClose = placed.some((p) => {
      const dx = p.x - x;
      const dz = p.z - z;
      return Math.sqrt(dx * dx + dz * dz) < minSpacing;
    });

    if (!tooClose) {
      placed.push({ x, z });
    }
  }

  return placed;
}

/**
 * Compose a deterministic list of ruin placements for a Thornfield town chunk.
 *
 * @param biome   - The biome config (used for future variant weighting).
 * @param town    - Town footprint (center + radius).
 * @param seed    - Deterministic seed string; same seed → identical output.
 */
export function composeRuins(
  _biome: BiomeConfig,
  town: TownConfig,
  seed: string,
): RuinsPlacement[] {
  const rng = createRng(`ruins:${town.id}:${seed}`);
  const placements: RuinsPlacement[] = [];

  const categories: Category[] = [
    'walls',
    'graves',
    'scatter',
    'structure',
    'flora',
  ];

  for (const category of categories) {
    const { min, max } = CATEGORY_COUNTS[category];
    const count = min + Math.floor(rng() * (max - min + 1));
    const assetIds = getAssetsByCategory(category);

    const minSpacing =
      category === 'scatter' ? 1.5 : category === 'graves' ? 2 : 3;
    const positions = placeInRadius(
      { x: town.center.x, z: town.center.z },
      town.radius,
      count,
      minSpacing,
      rng,
    );

    for (const pos of positions) {
      const assetId = weightedPick(assetIds, rng);
      placements.push({
        assetId,
        position: { x: pos.x, y: town.center.y, z: pos.z },
        rotation: { x: 0, y: rng() * Math.PI * 2, z: 0 },
        scale: 0.85 + rng() * 0.3,
      });
    }
  }

  return placements;
}
