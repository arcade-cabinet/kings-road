import type { BiomeConfig } from './schema';
import { BiomeService } from './service';

export interface BiomeTransitionState {
  from: BiomeConfig;
  to: BiomeConfig;
  /** 0 = fully in `from`, 1 = fully in `to` */
  t: number;
}

/**
 * Compute cross-fade blend between adjacent biomes.
 *
 * blendRadius controls how many road-units on each side of a region
 * boundary constitute the transition zone.
 */
export function computeBiomeTransition(
  distanceFromStart: number,
  blendRadius = 200,
): BiomeTransitionState | null {
  const current = BiomeService.getCurrentBiome(distanceFromStart);
  const [prevId, nextId] = BiomeService.getNeighbors(current.id);

  // Check if we're near the leading edge (transition to next biome)
  if (nextId) {
    const neighbor = BiomeService.getBiomeById(nextId);
    // Simple approximation: try both adjacent distances
    const nextBiome = BiomeService.getCurrentBiome(
      distanceFromStart + blendRadius,
    );
    if (nextBiome.id !== current.id) {
      const t = clampT(
        distanceFromStart,
        distanceFromStart + blendRadius - current.id.length,
        distanceFromStart + blendRadius,
      );
      return { from: current, to: neighbor, t };
    }
    void neighbor; // suppress unused warning
  }

  // Check if we're near the trailing edge (transition from previous biome)
  if (prevId) {
    const neighbor = BiomeService.getBiomeById(prevId);
    const prevBiome = BiomeService.getCurrentBiome(
      distanceFromStart - blendRadius,
    );
    if (prevBiome.id !== current.id) {
      const t = clampT(
        distanceFromStart - blendRadius,
        distanceFromStart,
        distanceFromStart,
      );
      return { from: neighbor, to: current, t };
    }
    void neighbor;
  }

  return null;
}

function clampT(start: number, end: number, value: number): number {
  if (end === start) return 0;
  return Math.max(0, Math.min(1, (value - start) / (end - start)));
}
