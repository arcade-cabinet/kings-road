import { describe, expect, it } from 'vitest';
import type { KingdomConfig } from '@/schemas/kingdom.schema';
import { countLandTiles, generateTerrain, getTile } from './terrain-gen';

const TEST_CONFIG: KingdomConfig = {
  name: 'Test Kingdom',
  width: 64,
  height: 128,
  seaLevel: 0.35,
  mountainLevel: 0.75,
  anchorSettlements: [
    {
      id: 'start',
      name: 'Start Town',
      type: 'town',
      roadSpineProgress: 0,
      features: [],
    },
    {
      id: 'end',
      name: 'End Town',
      type: 'town',
      roadSpineProgress: 1,
      features: [],
    },
  ],
  regions: [],
  offRoadSettlements: [],
  terrainModifiers: {
    elongation: 1.5,
    coastlineNoise: 0.5,
    ridgeStrength: 0.6,
  },
};

describe('generateTerrain', () => {
  it('produces deterministic output from same seed', () => {
    const a = generateTerrain('test-seed-123', TEST_CONFIG);
    const b = generateTerrain('test-seed-123', TEST_CONFIG);

    expect(a.tiles.length).toBe(b.tiles.length);
    for (let i = 0; i < a.tiles.length; i++) {
      expect(a.tiles[i].elevation).toBe(b.tiles[i].elevation);
      expect(a.tiles[i].biome).toBe(b.tiles[i].biome);
      expect(a.tiles[i].isLand).toBe(b.tiles[i].isLand);
    }
  });

  it('produces different output from different seeds', () => {
    const a = generateTerrain('seed-alpha', TEST_CONFIG);
    const b = generateTerrain('seed-beta', TEST_CONFIG);

    // At least some tiles should differ
    let differences = 0;
    for (let i = 0; i < a.tiles.length; i++) {
      if (a.tiles[i].biome !== b.tiles[i].biome) differences++;
    }
    expect(differences).toBeGreaterThan(a.tiles.length * 0.1);
  });

  it('generates correct grid dimensions', () => {
    const terrain = generateTerrain('dim-test', TEST_CONFIG);

    expect(terrain.width).toBe(64);
    expect(terrain.height).toBe(128);
    expect(terrain.tiles.length).toBe(64 * 128);
  });

  it('has ocean around the edges', () => {
    const terrain = generateTerrain('edge-test', TEST_CONFIG);

    // Corners should be ocean
    expect(getTile(terrain, 0, 0)?.isLand).toBe(false);
    expect(getTile(terrain, 63, 0)?.isLand).toBe(false);
    expect(getTile(terrain, 0, 127)?.isLand).toBe(false);
    expect(getTile(terrain, 63, 127)?.isLand).toBe(false);

    // Ocean tiles should have 'ocean' biome
    const corner = getTile(terrain, 0, 0);
    expect(corner?.biome).toBe('ocean');
  });

  it('has land in the center', () => {
    const terrain = generateTerrain('center-test', TEST_CONFIG);

    // Center of the map should be land
    const center = getTile(terrain, 32, 64);
    expect(center?.isLand).toBe(true);
  });

  it('generates a reasonable land-to-ocean ratio', () => {
    const terrain = generateTerrain('ratio-test', TEST_CONFIG);
    const landCount = countLandTiles(terrain);
    const totalTiles = terrain.width * terrain.height;
    const landRatio = landCount / totalTiles;

    // Should be roughly 20-60% land (island, not a continent)
    expect(landRatio).toBeGreaterThan(0.15);
    expect(landRatio).toBeLessThan(0.65);
  });

  it('has coast tiles between land and ocean', () => {
    const terrain = generateTerrain('coast-test', TEST_CONFIG);

    const coastTiles = terrain.tiles.filter((t) => t.isCoast);
    expect(coastTiles.length).toBeGreaterThan(0);

    // Every coast tile should be land
    for (const ct of coastTiles) {
      expect(ct.isLand).toBe(true);
    }
  });

  it('elevation is 0 for ocean tiles', () => {
    const terrain = generateTerrain('elev-test', TEST_CONFIG);
    const oceanTiles = terrain.tiles.filter((t) => !t.isLand);

    for (const ot of oceanTiles) {
      expect(ot.elevation).toBe(0);
    }
  });

  it('elevation is between 0 and 1 for all tiles', () => {
    const terrain = generateTerrain('range-test', TEST_CONFIG);

    for (const tile of terrain.tiles) {
      expect(tile.elevation).toBeGreaterThanOrEqual(0);
      expect(tile.elevation).toBeLessThanOrEqual(1);
    }
  });

  it('moisture is between 0 and 1 for land tiles', () => {
    const terrain = generateTerrain('moisture-test', TEST_CONFIG);
    const landTiles = terrain.tiles.filter((t) => t.isLand);

    for (const lt of landTiles) {
      expect(lt.moisture).toBeGreaterThanOrEqual(0);
      expect(lt.moisture).toBeLessThanOrEqual(1);
    }
  });

  it('generates rivers', () => {
    const terrain = generateTerrain('river-test', TEST_CONFIG);

    expect(terrain.rivers.length).toBeGreaterThan(0);

    // Rivers should have paths with at least 8 points
    for (const river of terrain.rivers) {
      expect(river.path.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('river tiles are marked with hasRiver', () => {
    // Use same seed as 'generates rivers' to ensure we have rivers
    const terrain = generateTerrain('river-test', TEST_CONFIG);

    // If rivers were generated, at least some land tiles on the path should be marked
    if (terrain.rivers.length > 0) {
      const riverTileCount = terrain.tiles.filter((t) => t.hasRiver).length;
      expect(riverTileCount).toBeGreaterThan(0);
    }
  });

  it('assigns valid biomes to all tiles', () => {
    const terrain = generateTerrain('biome-test', TEST_CONFIG);
    const validBiomes = [
      'ocean',
      'coast',
      'meadow',
      'farmland',
      'forest',
      'deep_forest',
      'hills',
      'mountain',
      'moor',
      'swamp',
      'riverside',
      'highland',
    ];

    for (const tile of terrain.tiles) {
      expect(validBiomes).toContain(tile.biome);
    }
  });

  it('has biome variety on land', () => {
    const terrain = generateTerrain('variety-test', TEST_CONFIG);
    const landBiomes = new Set(
      terrain.tiles.filter((t) => t.isLand).map((t) => t.biome),
    );

    // Should have at least 4 different land biomes
    expect(landBiomes.size).toBeGreaterThanOrEqual(4);
  });

  it('runs within performance budget', () => {
    const start = performance.now();
    generateTerrain('perf-test', TEST_CONFIG);
    const elapsed = performance.now() - start;

    // Should complete in < 500ms for a 64x128 grid
    expect(elapsed).toBeLessThan(500);
  });
});

describe('getTile', () => {
  const terrain = generateTerrain('getTile-test', TEST_CONFIG);

  it('returns tile for valid coordinates', () => {
    const tile = getTile(terrain, 10, 20);
    expect(tile).toBeDefined();
    expect(tile?.x).toBe(10);
    expect(tile?.y).toBe(20);
  });

  it('returns undefined for out-of-bounds', () => {
    expect(getTile(terrain, -1, 0)).toBeUndefined();
    expect(getTile(terrain, 64, 0)).toBeUndefined();
    expect(getTile(terrain, 0, -1)).toBeUndefined();
    expect(getTile(terrain, 0, 128)).toBeUndefined();
  });
});
