import { describe, expect, it } from 'vitest';
import { cyrb128, mulberry32 } from './random';
import {
  BIOME_VEGETATION,
  DEFAULT_VEGETATION,
  placeVegetation,
} from './vegetation';

function makeRng(seed = 'test-seed') {
  return mulberry32(cyrb128(seed));
}

describe('BIOME_VEGETATION profiles', () => {
  it('defines profiles for all land biomes', () => {
    const expectedBiomes = [
      'meadow',
      'farmland',
      'forest',
      'deep_forest',
      'hills',
      'highland',
      'mountain',
      'moor',
      'swamp',
      'riverside',
      'coast',
    ];
    for (const biome of expectedBiomes) {
      expect(BIOME_VEGETATION[biome]).toBeDefined();
    }
  });

  it('all profiles have non-negative counts', () => {
    for (const [biome, profile] of Object.entries(BIOME_VEGETATION)) {
      for (const [key, val] of Object.entries(profile)) {
        expect(val, `${biome}.${key}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('forest has more trees than coast', () => {
    const forest = BIOME_VEGETATION.forest;
    const coast = BIOME_VEGETATION.coast;
    expect(forest.pines + forest.oaks).toBeGreaterThan(
      coast.pines + coast.oaks,
    );
  });

  it('moor has heather but no trees', () => {
    const moor = BIOME_VEGETATION.moor;
    expect(moor.heatherPatches).toBeGreaterThan(0);
    expect(moor.pines).toBe(0);
    expect(moor.oaks).toBe(0);
  });

  it('mountain has many boulders but few plants', () => {
    const mtn = BIOME_VEGETATION.mountain;
    expect(mtn.boulders).toBeGreaterThan(30);
    expect(mtn.grassTufts).toBeLessThan(10);
  });

  it('swamp has many dead trees', () => {
    const swamp = BIOME_VEGETATION.swamp;
    expect(swamp.deadTrees).toBeGreaterThan(5);
  });
});

describe('placeVegetation', () => {
  it('returns all expected arrays', () => {
    const result = placeVegetation('meadow', 0, 0, makeRng());
    expect(result.pine).toBeInstanceOf(Array);
    expect(result.pine).toBeInstanceOf(Array);
    expect(result.oak).toBeInstanceOf(Array);
    expect(result.oak).toBeInstanceOf(Array);
    expect(result.bush).toBeInstanceOf(Array);
    expect(result.grassTuft).toBeInstanceOf(Array);
    expect(result.boulder).toBeInstanceOf(Array);
    expect(result.deadTree).toBeInstanceOf(Array);
    expect(result.heather).toBeInstanceOf(Array);
  });

  it('places instances within chunk bounds', () => {
    const oX = 240;
    const oZ = 360;
    const result = placeVegetation('forest', oX, oZ, makeRng());
    for (const item of [
      ...result.pine,
      ...result.oak,
      ...result.bush,
      ...result.boulder,
    ]) {
      expect(item.x).toBeGreaterThanOrEqual(oX);
      expect(item.x).toBeLessThanOrEqual(oX + 120); // CHUNK_SIZE
      expect(item.z).toBeGreaterThanOrEqual(oZ);
      expect(item.z).toBeLessThanOrEqual(oZ + 120);
    }
  });

  it('respects biome profile counts', () => {
    const result = placeVegetation('meadow', 0, 0, makeRng());
    const profile = BIOME_VEGETATION.meadow;
    expect(result.pine.length).toBe(profile.pines);
    expect(result.pine.length).toBe(profile.pines);
    expect(result.oak.length).toBe(profile.oaks);
    expect(result.oak.length).toBe(profile.oaks);
    expect(result.bush.length).toBe(profile.bushes);
    expect(result.grassTuft.length).toBe(profile.grassTufts);
    expect(result.boulder.length).toBe(profile.boulders);
    expect(result.deadTree.length).toBe(profile.deadTrees);
    expect(result.heather.length).toBe(profile.heatherPatches);
  });

  it('uses DEFAULT_VEGETATION for unknown biome', () => {
    const result = placeVegetation('unknown_biome', 0, 0, makeRng());
    expect(result.pine.length).toBe(DEFAULT_VEGETATION.pines);
    expect(result.boulder.length).toBe(DEFAULT_VEGETATION.boulders);
  });

  it('uses DEFAULT_VEGETATION when biome is undefined', () => {
    const result = placeVegetation(undefined, 0, 0, makeRng());
    expect(result.pine.length).toBe(DEFAULT_VEGETATION.pines);
  });

  it('produces deterministic output for same seed', () => {
    const a = placeVegetation('forest', 0, 0, makeRng('seed-A'));
    const b = placeVegetation('forest', 0, 0, makeRng('seed-A'));
    expect(a.pine).toEqual(b.pine);
    expect(a.oak).toEqual(b.oak);
    expect(a.boulder).toEqual(b.boulder);
  });

  it('produces different output for different seeds', () => {
    const a = placeVegetation('forest', 0, 0, makeRng('seed-A'));
    const b = placeVegetation('forest', 0, 0, makeRng('seed-B'));
    // Extremely unlikely to be equal with different seeds
    expect(a.pine[0]?.x).not.toBe(b.pine[0]?.x);
  });
});
