import type { BiomeConfig } from './schema';
import { BiomeService } from './service';

export interface BiomeTransitionState {
  from: BiomeConfig;
  to: BiomeConfig;
  /** 0 = fully in `from`, 1 = fully in `to`. 0.5 at the exact boundary. */
  t: number;
}

/**
 * Compute cross-fade blend between adjacent biomes along the road.
 *
 * `transitionMeters` is the half-width of the blend window. The window
 * straddles a region boundary: at `boundary - transitionMeters` t=0,
 * at the boundary itself t=0.5, at `boundary + transitionMeters` t=1.
 * Outside the window: returns null (caller should render the single
 * current biome).
 */
export function computeBiomeTransition(
  distanceFromStart: number,
  transitionMeters = 200,
): BiomeTransitionState | null {
  const region = BiomeService.getCurrentRegionBounds(distanceFromStart);
  if (!region) return null;

  const current = BiomeService.getBiomeById(region.biomeId);
  const [prevId, nextId] = BiomeService.getNeighbors(distanceFromStart);

  // Leading-edge: within the blend window preceding the boundary to next biome.
  // Skip when the next region shares a biome id — cross-fading a biome with
  // itself is identity, so return null and let the caller render one biome.
  const leadingEdge = region.endDistance;
  if (
    nextId &&
    nextId !== region.biomeId &&
    distanceFromStart >= leadingEdge - transitionMeters
  ) {
    const to = BiomeService.getBiomeById(nextId);
    const t = clamp01(
      (distanceFromStart - (leadingEdge - transitionMeters)) /
        (2 * transitionMeters),
    );
    return { from: current, to, t };
  }

  // Trailing-edge: within the blend window following the boundary from prev biome.
  // Same same-biome short-circuit as above.
  const trailingEdge = region.startDistance;
  if (
    prevId &&
    prevId !== region.biomeId &&
    distanceFromStart <= trailingEdge + transitionMeters
  ) {
    const from = BiomeService.getBiomeById(prevId);
    const t = clamp01(
      (distanceFromStart - (trailingEdge - transitionMeters)) /
        (2 * transitionMeters),
    );
    return { from, to: current, t };
  }

  return null;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
