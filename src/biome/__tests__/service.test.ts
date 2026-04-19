import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import forestJson from '../data/forest.json';
import meadowJson from '../data/meadow.json';
import thornfieldJson from '../data/thornfield.json';
import { BiomeConfigSchema } from '../schema';
import { BiomeService } from '../service';

const thornfield = BiomeConfigSchema.parse(thornfieldJson);
const meadow = BiomeConfigSchema.parse(meadowJson);
const forest = BiomeConfigSchema.parse(forestJson);

const TEST_SPINE = {
  totalDistance: 30000,
  anchors: [
    { id: 'home', distanceFromStart: 0 },
    { id: 'anchor-01', distanceFromStart: 6000 },
    { id: 'anchor-02', distanceFromStart: 12000 },
    { id: 'anchor-03', distanceFromStart: 17000 },
  ],
  regions: [
    { biome: 'MEADOW', anchorRange: ['home', 'anchor-01'] as [string, string] },
    {
      biome: 'FOREST',
      anchorRange: ['anchor-01', 'anchor-02'] as [string, string],
    },
    {
      biome: 'THORNFIELD',
      anchorRange: ['anchor-02', 'anchor-03'] as [string, string],
    },
  ],
};

beforeEach(() => {
  BiomeService.init([meadow, forest, thornfield], TEST_SPINE);
});

afterEach(() => {
  // reset by re-initing with empty
  BiomeService.init([], {
    totalDistance: 30000,
    anchors: [{ id: 'x', distanceFromStart: 0 }],
  });
});

describe('BiomeService.getBiomeById', () => {
  it('returns config for known id', () => {
    const config = BiomeService.getBiomeById('meadow');
    expect(config.id).toBe('meadow');
  });

  it('throws BiomeError for unknown id', () => {
    expect(() => BiomeService.getBiomeById('unknown')).toThrow();
  });
});

describe('BiomeService.resolveForChunk', () => {
  it('returns config for directly registered id', () => {
    const cfg = BiomeService.resolveForChunk('meadow');
    expect(cfg?.id).toBe('meadow');
  });

  it('resolves aliased kingdom-gen biomes to their registered neighbour', () => {
    // farmland/riverside/coast → meadow
    expect(BiomeService.resolveForChunk('farmland')?.id).toBe('meadow');
    expect(BiomeService.resolveForChunk('riverside')?.id).toBe('meadow');
    expect(BiomeService.resolveForChunk('coast')?.id).toBe('meadow');
    // deep_forest → forest
    expect(BiomeService.resolveForChunk('deep_forest')?.id).toBe('forest');
  });

  it('returns null for an id that is neither registered nor aliased', () => {
    expect(BiomeService.resolveForChunk('narnia')).toBeNull();
  });

  it('returns null when the alias target is not registered', () => {
    // hills aliases to moor, but moor is not in this test spine's registry
    expect(BiomeService.resolveForChunk('hills')).toBeNull();
  });
});

describe('BiomeService.getCurrentBiome', () => {
  it('returns meadow for distance 0', () => {
    const biome = BiomeService.getCurrentBiome(0);
    expect(biome.id).toBe('meadow');
  });

  it('returns meadow for distance within first region', () => {
    const biome = BiomeService.getCurrentBiome(3000);
    expect(biome.id).toBe('meadow');
  });

  it('returns forest for distance in second region', () => {
    const biome = BiomeService.getCurrentBiome(9000);
    expect(biome.id).toBe('forest');
  });

  it('returns thornfield for distance in third region', () => {
    const biome = BiomeService.getCurrentBiome(14000);
    expect(biome.id).toBe('thornfield');
  });

  it('resolves the terminal boundary (distance === totalDistance)', () => {
    // Pre-fix, regions used `< endDistance` so totalDistance fell through
    // to the arbitrary first-registered-biome fallback.
    const biome = BiomeService.getCurrentBiome(17000);
    expect(biome.id).toBe('thornfield');
  });
});

describe('BiomeService.getNeighbors', () => {
  it('returns null for prev when in first region', () => {
    const [prev] = BiomeService.getNeighbors(1000);
    expect(prev).toBeNull();
  });

  it('returns correct neighbors for middle region', () => {
    const [prev, next] = BiomeService.getNeighbors(9000);
    expect(prev).toBe('meadow');
    expect(next).toBe('thornfield');
  });

  it('returns null for next when in last region', () => {
    const [, next] = BiomeService.getNeighbors(14000);
    expect(next).toBeNull();
  });
});

describe('BiomeService init failure modes', () => {
  it('throws when a region references an unknown anchor', () => {
    expect(() =>
      BiomeService.init([meadow, forest, thornfield], {
        totalDistance: 30000,
        anchors: [{ id: 'home', distanceFromStart: 0 }],
        regions: [
          {
            biome: 'MEADOW',
            anchorRange: ['home', 'missing-anchor'] as [string, string],
          },
        ],
      }),
    ).toThrow(/unknown anchor/);
  });
});

describe('BiomeService immutability', () => {
  it('deep-freezes returned BiomeConfig, nested objects included', () => {
    const config = BiomeService.getBiomeById('meadow');
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.lighting)).toBe(true);
    expect(Object.isFrozen(config.terrain.materials)).toBe(true);
  });
});
