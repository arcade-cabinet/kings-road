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
      biome: 'HILLS',
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

  it('returns hills (thornfield) for distance in third region', () => {
    const biome = BiomeService.getCurrentBiome(14000);
    expect(biome.id).toBe('hills');
  });
});

describe('BiomeService.getNeighbors', () => {
  it('returns null for prev of first biome', () => {
    const [prev] = BiomeService.getNeighbors('meadow');
    expect(prev).toBeNull();
  });

  it('returns correct neighbor for middle biome', () => {
    const [prev, next] = BiomeService.getNeighbors('forest');
    expect(prev).toBe('meadow');
    expect(next).toBe('hills');
  });
});
