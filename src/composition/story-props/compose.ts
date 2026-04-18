import { createRng } from '@/core';
import type { StoryPropDef } from './catalog';
import { getPropDefsForBiome } from './catalog';
import type { StoryPropPlacement } from './types';

/** One prop per 500m of road on average, 1-3 per segment. */
const DENSITY_PER_500M = 1;
const MIN_SPACING_M = 80;

function weightedPickDef(
  defs: StoryPropDef[],
  rng: () => number,
): StoryPropDef {
  const total = defs.reduce((sum, d) => sum + d.weight, 0);
  let r = rng() * total;
  for (const def of defs) {
    r -= def.weight;
    if (r <= 0) return def;
  }
  return defs[defs.length - 1];
}

function pickText(texts: string[], rng: () => number): string {
  return texts[Math.floor(rng() * texts.length)];
}

/**
 * Compose narrative story-prop placements along a road segment.
 *
 * @param biomeId          - Biome id string for affinity weighting.
 * @param roadDistanceRange - [start, end] in world units along the road spine.
 * @param seed             - Deterministic seed; same inputs → same output.
 */
export function composeStoryProps(
  biomeId: string,
  roadDistanceRange: [number, number],
  seed: string,
): StoryPropPlacement[] {
  const [start, end] = roadDistanceRange;
  const segmentLength = end - start;

  const rng = createRng(`story-props:${biomeId}:${start}:${end}:${seed}`);

  const defs = getPropDefsForBiome(biomeId);
  const placements: StoryPropPlacement[] = [];

  // Place props at seeded intervals within the segment.
  // Density: ~1 per 500m, but minimum 1-3 per call.
  const targetCount = Math.max(
    1,
    Math.round((segmentLength / 500) * DENSITY_PER_500M * (0.7 + rng() * 0.6)),
  );

  const usedPositions: number[] = [];

  for (let i = 0; i < targetCount * 5 && placements.length < targetCount; i++) {
    const roadOffset = start + rng() * segmentLength;

    // Minimum spacing along road axis
    const tooClose = usedPositions.some(
      (p) => Math.abs(p - roadOffset) < MIN_SPACING_M,
    );
    if (tooClose) continue;

    usedPositions.push(roadOffset);

    const def = weightedPickDef(defs, rng);

    // Place slightly off the road center (±3-8m lateral offset)
    const lateralOffset = (rng() > 0.5 ? 1 : -1) * (3 + rng() * 5);

    placements.push({
      assetId: def.assetId,
      archetype: def.archetype,
      position: {
        x: lateralOffset,
        y: 0,
        z: roadOffset,
      },
      rotation: { x: 0, y: rng() * Math.PI * 2, z: 0 },
      scale: 0.9 + rng() * 0.2,
      narrativeText: pickText(def.texts, rng),
    });
  }

  return placements;
}
