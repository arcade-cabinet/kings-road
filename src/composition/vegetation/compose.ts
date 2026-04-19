import type { BiomeConfig } from '@/biome';
import { createRng } from '@/core';

import { getAssetVariants } from './catalog';
import type { HeightSampler, VegetationPlacement } from './types';
import { CHUNK_SIZE } from './types';

const MIN_SPACING_DEFAULT = 2;
const MAX_ATTEMPTS = 30;

function poissonDisk(
  count: number,
  minSpacing: number,
  size: number,
  rng: () => number,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let attempts = 0;

  while (points.length < count && attempts < count * MAX_ATTEMPTS) {
    attempts++;
    const x = rng() * size;
    const z = rng() * size;
    let tooClose = false;
    for (const [px, pz] of points) {
      const dx = x - px;
      const dz = z - pz;
      if (dx * dx + dz * dz < minSpacing * minSpacing) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) points.push([x, z]);
  }

  return points;
}

export function composeVegetation(
  biome: BiomeConfig,
  chunkCx: number,
  chunkCz: number,
  heightSampler: HeightSampler,
  seed: string,
): VegetationPlacement[] {
  const rng = createRng(`veg:${biome.id}:${chunkCx}:${chunkCz}:${seed}`);
  const placements: VegetationPlacement[] = [];

  const chunkArea = CHUNK_SIZE * CHUNK_SIZE;
  const globalDensity = biome.foliage.density;

  for (const species of biome.foliage.species) {
    const variants = getAssetVariants(species.assetId);
    if (variants.length === 0) continue;

    const minSpacing = variants[0].minSpacing ?? MIN_SPACING_DEFAULT;
    const count = Math.round(
      chunkArea *
        globalDensity *
        species.density *
        (1 / (minSpacing * minSpacing)),
    );
    const [scaleMin, scaleMax] = species.scaleRange ?? [0.8, 1.2];

    const localPoints = poissonDisk(count, minSpacing, CHUNK_SIZE, rng);

    for (const [localX, localZ] of localPoints) {
      const worldX = chunkCx * CHUNK_SIZE + localX;
      const worldZ = chunkCz * CHUNK_SIZE + localZ;
      const worldY = heightSampler(worldX, worldZ);

      const variantIdx = Math.floor(rng() * variants.length);
      const variant = variants[variantIdx];
      const speciesScale = scaleMin + rng() * (scaleMax - scaleMin);
      const scale = speciesScale * variant.baseScale;
      const rotation = rng() * Math.PI * 2;

      placements.push({
        assetId: variant.path.replace(/^\/assets\//, ''),
        position: { x: worldX, y: worldY, z: worldZ },
        rotation,
        scale,
      });
    }
  }

  return placements;
}
