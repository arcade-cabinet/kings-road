import { describe, expect, it } from 'vitest';

import type { BiomeConfig } from '@/biome';

import { FOLIAGE_CATALOG } from '../catalog';
import { composeVegetation } from '../compose';
import type { HeightSampler } from '../types';

const FLAT_SAMPLER: HeightSampler = () => 0;
const HILLY_SAMPLER: HeightSampler = (x, z) =>
  Math.sin(x / 10) * Math.cos(z / 10) * 5;

const VALID_ASSET_IDS = new Set(
  Object.values(FOLIAGE_CATALOG).flatMap((variants) =>
    variants.map((v) => v.path.replace(/^\/assets\//, '')),
  ),
);

const MOCK_BIOME: BiomeConfig = {
  id: 'thornfield',
  name: 'Thornfield',
  description: 'test biome',
  roadStart: 8000,
  roadEnd: 14000,
  skyColor: '#1a1208',
  fogColor: '#1a1208',
  fogDensity: 0.04,
  ambientIntensity: 0.3,
  foliage: {
    density: 0.5,
    species: [
      { assetId: 'gnarled-dead-oak', density: 0.4, scaleRange: [0.8, 1.4] },
      { assetId: 'thorn-bush', density: 0.25, scaleRange: [0.4, 0.8] },
    ],
  },
  weather: {
    defaultState: 'overcast',
    states: [
      {
        id: 'overcast',
        probability: 1,
        fogMultiplier: 1,
        windStrength: 0,
        precipitationType: 'none',
        precipitationDensity: 0,
      },
    ],
    transitionDuration: 10,
  },
  audio: { ambient: [] },
  monsterPool: [],
} as unknown as BiomeConfig;

describe('composeVegetation', () => {
  it('returns a non-empty array for a biome with foliage', () => {
    const result = composeVegetation(MOCK_BIOME, 0, 0, FLAT_SAMPLER, 'seed-a');
    expect(result.length).toBeGreaterThan(0);
  });

  it('is deterministic — same inputs produce identical output', () => {
    const a = composeVegetation(MOCK_BIOME, 0, 0, FLAT_SAMPLER, 'seed-x');
    const b = composeVegetation(MOCK_BIOME, 0, 0, FLAT_SAMPLER, 'seed-x');
    expect(a).toEqual(b);
  });

  it('produces different output for different seeds', () => {
    const a = composeVegetation(MOCK_BIOME, 0, 0, FLAT_SAMPLER, 'seed-1');
    const b = composeVegetation(MOCK_BIOME, 0, 0, FLAT_SAMPLER, 'seed-2');
    expect(a.map((p) => p.assetId).join()).not.toBe(
      b.map((p) => p.assetId).join(),
    );
  });

  it('produces different output for different chunk coords', () => {
    const a = composeVegetation(MOCK_BIOME, 0, 0, FLAT_SAMPLER, 'seed-x');
    const b = composeVegetation(MOCK_BIOME, 1, 0, FLAT_SAMPLER, 'seed-x');
    const aPos = a.map((p) => `${p.position.x},${p.position.z}`).join();
    const bPos = b.map((p) => `${p.position.x},${p.position.z}`).join();
    expect(aPos).not.toBe(bPos);
  });

  it('all assetIds are valid catalog entries', () => {
    const result = composeVegetation(MOCK_BIOME, 0, 0, FLAT_SAMPLER, 'seed-a');
    for (const p of result) {
      expect(
        VALID_ASSET_IDS.has(p.assetId),
        `Unknown assetId: ${p.assetId}`,
      ).toBe(true);
    }
  });

  it('positions use y from heightSampler', () => {
    const SLOPE_SAMPLER: HeightSampler = (x) => x * 0.1;
    const result = composeVegetation(MOCK_BIOME, 0, 0, SLOPE_SAMPLER, 'seed-a');
    for (const p of result) {
      expect(p.position.y).toBeCloseTo(p.position.x * 0.1, 5);
    }
  });

  it('all positions are Vec3 plain objects (no Three.js)', () => {
    const result = composeVegetation(MOCK_BIOME, 0, 0, FLAT_SAMPLER, 'seed-a');
    for (const p of result) {
      expect(typeof p.position).toBe('object');
      expect('x' in p.position && 'y' in p.position && 'z' in p.position).toBe(
        true,
      );
      expect(typeof p.rotation).toBe('number');
      expect(typeof p.scale).toBe('number');
    }
  });

  it('scale is species scaleRange multiplied by variant baseScale', () => {
    // Per-asset expected bounds = species.scaleRange × variant.baseScale.
    // Build the lookup directly from the catalog so the test stays in sync
    // if either baseScale or scaleRange is tuned later. A global [min,max]
    // check would accept a tree rendered at bush scale; this catches it.
    const speciesRanges: Record<string, [number, number]> = {};
    for (const species of MOCK_BIOME.foliage.species) {
      const [min = 0.8, max = 1.2] = species.scaleRange ?? [0.8, 1.2];
      speciesRanges[species.assetId] = [min, max];
    }
    const variantBaseByPath = new Map<
      string,
      { speciesId: string; baseScale: number }
    >();
    for (const [speciesId, variants] of Object.entries(FOLIAGE_CATALOG)) {
      for (const v of variants) {
        variantBaseByPath.set(v.path.replace(/^\/assets\//, ''), {
          speciesId,
          baseScale: v.baseScale,
        });
      }
    }

    const result = composeVegetation(MOCK_BIOME, 0, 0, FLAT_SAMPLER, 'seed-a');
    for (const p of result) {
      const info = variantBaseByPath.get(p.assetId);
      expect(info, `unknown assetId: ${p.assetId}`).toBeDefined();
      const [sMin, sMax] = speciesRanges[info!.speciesId];
      expect(p.scale).toBeGreaterThanOrEqual(sMin * info!.baseScale);
      expect(p.scale).toBeLessThanOrEqual(sMax * info!.baseScale);
    }
  });

  it('works with hilly terrain sampler', () => {
    const result = composeVegetation(MOCK_BIOME, 2, 3, HILLY_SAMPLER, 'seed-h');
    expect(result.length).toBeGreaterThan(0);
    const hasVariedY = result.some((p) => p.position.y !== 0);
    expect(hasVariedY).toBe(true);
  });

  it('chunk x coord offsets world positions', () => {
    const chunk0 = composeVegetation(MOCK_BIOME, 0, 0, FLAT_SAMPLER, 'seed-a');
    const chunk1 = composeVegetation(MOCK_BIOME, 1, 0, FLAT_SAMPLER, 'seed-a');
    const chunk0MaxX = Math.max(...chunk0.map((p) => p.position.x));
    const chunk1MinX = Math.min(...chunk1.map((p) => p.position.x));
    expect(chunk0MaxX).toBeLessThan(chunk1MinX + 1);
  });
});
