import { createRng } from '@/core';
import type { StoryPropDef } from './catalog';
import { getPropDefsForBiome } from './catalog';
import type { StoryPropPlacement } from './types';

/** ~1 prop per 500m of road on average (0.7–1.3 with jitter); minimum 1 per call. */
const DENSITY_PER_500M = 1;
const MIN_SPACING_M = 80;

function weightedPickDef(
  defs: StoryPropDef[],
  rng: () => number,
): StoryPropDef {
  if (defs.length === 0) {
    throw new Error('Cannot pick from empty defs array');
  }
  const total = defs.reduce((sum, d) => sum + d.weight, 0);
  let r = rng() * total;
  for (const def of defs) {
    r -= def.weight;
    if (r <= 0) return def;
  }
  return defs[defs.length - 1];
}

function pickText(texts: string[], rng: () => number): string {
  if (texts.length === 0) return '';
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
  if (start > end) {
    throw new Error(
      `Invalid road distance range: start (${start}) must be <= end (${end})`,
    );
  }

  const allDefs = getPropDefsForBiome(biomeId);
  // Only place props whose GLB has been ingested — glbPath null means pending ingest.
  const defs = allDefs.filter((d) => d.glbPath !== null);
  if (defs.length === 0) {
    return [];
  }

  const segmentLength = end - start;
  const rng = createRng(`story-props:${biomeId}:${start}:${end}:${seed}`);

  const placements: StoryPropPlacement[] = [];

  // Place props at seeded intervals within the segment.
  // Density: ~1 per 500m, but minimum 1-3 per call.
  const targetCount = Math.max(
    1,
    Math.round((segmentLength / 500) * DENSITY_PER_500M * (0.7 + rng() * 0.6)),
  );

  const usedPositions: number[] = [];

  // Cap iterations: targetCount * 5 is enough attempts for reasonable density,
  // but when MIN_SPACING_M constraints prevent reaching targetCount we stop early
  // rather than spinning. Result may be fewer placements than targetCount.
  const maxAttempts = Math.max(targetCount * 5, targetCount + 20);

  for (let i = 0; i < maxAttempts && placements.length < targetCount; i++) {
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
      // glbPath is non-null here — filtered above
      assetId: def.glbPath!,
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
