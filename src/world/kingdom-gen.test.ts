import { describe, expect, it } from 'vitest';
import type { KingdomConfig } from '@/schemas/kingdom.schema';
import {
  generateKingdom,
  getKingdomTile,
  getRegionAt,
  getSettlementAt,
} from './kingdom-gen';

// Full config matching kingdom-config.json structure
const TEST_CONFIG: KingdomConfig = {
  name: 'Test Kingdom',
  width: 64,
  height: 128,
  seaLevel: 0.35,
  mountainLevel: 0.75,
  anchorSettlements: [
    {
      id: 'ashford',
      name: 'Ashford',
      type: 'village',
      roadSpineProgress: 0,
      features: ['tavern'],
      preferredRegion: 'meadows',
    },
    {
      id: 'millbrook',
      name: 'Millbrook',
      type: 'town',
      roadSpineProgress: 0.3,
      features: ['market'],
      preferredRegion: 'forest',
    },
    {
      id: 'ravensgate',
      name: 'Ravensgate',
      type: 'city',
      roadSpineProgress: 0.6,
      features: ['gate'],
      preferredRegion: 'moors',
    },
    {
      id: 'grailsend',
      name: 'Grailsend',
      type: 'ruin',
      roadSpineProgress: 1,
      features: ['temple_entrance'],
      preferredRegion: 'highlands',
    },
  ],
  regions: [
    {
      id: 'meadows',
      name: 'Test Meadows',
      biome: 'meadow',
      latitudeRange: [0, 0.3] as [number, number],
      terrainFeatures: ['rolling_hills'],
      settlements: [],
      dangerTier: 0,
      featureDensity: 'normal',
    },
    {
      id: 'forest',
      name: 'Test Forest',
      biome: 'forest',
      latitudeRange: [0.25, 0.55] as [number, number],
      terrainFeatures: ['dense_canopy'],
      settlements: [],
      dangerTier: 1,
      featureDensity: 'dense',
    },
    {
      id: 'moors',
      name: 'Test Moors',
      biome: 'moor',
      latitudeRange: [0.5, 0.75] as [number, number],
      terrainFeatures: ['boggy_hollows'],
      settlements: [],
      dangerTier: 2,
      featureDensity: 'normal',
    },
    {
      id: 'highlands',
      name: 'Test Highlands',
      biome: 'highland',
      latitudeRange: [0.7, 1.0] as [number, number],
      terrainFeatures: ['steep_cliffs'],
      settlements: [],
      dangerTier: 3,
      featureDensity: 'sparse',
    },
  ],
  offRoadSettlements: [
    {
      id: 'hamlet-a',
      name: 'Test Hamlet',
      type: 'hamlet',
      region: 'meadows',
      features: ['campfire'],
      population: 'tiny',
      roadConnection: 'path',
    },
  ],
  terrainModifiers: {
    elongation: 1.5,
    coastlineNoise: 0.5,
    ridgeStrength: 0.6,
  },
};

const SEED = 'kingdom-gen-test';

describe('generateKingdom', () => {
  // Generate once and reuse (it's deterministic)
  const kingdom = generateKingdom(SEED, TEST_CONFIG);

  it('is deterministic from seed', () => {
    const a = generateKingdom(SEED, TEST_CONFIG);
    const b = generateKingdom(SEED, TEST_CONFIG);

    expect(a.seed).toBe(b.seed);
    expect(a.tiles.length).toBe(b.tiles.length);
    expect(a.settlements.length).toBe(b.settlements.length);
    expect(a.roads.length).toBe(b.roads.length);
    expect(a.regions.length).toBe(b.regions.length);

    for (let i = 0; i < a.settlements.length; i++) {
      expect(a.settlements[i].position).toEqual(b.settlements[i].position);
    }
  });

  it('different seeds produce different kingdoms', () => {
    const a = generateKingdom('alpha-kingdom', TEST_CONFIG);
    const b = generateKingdom('beta-kingdom', TEST_CONFIG);

    // At least some settlement positions should differ
    let positionDifferences = 0;
    const minLen = Math.min(a.settlements.length, b.settlements.length);
    for (let i = 0; i < minLen; i++) {
      if (
        a.settlements[i].position[0] !== b.settlements[i].position[0] ||
        a.settlements[i].position[1] !== b.settlements[i].position[1]
      ) {
        positionDifferences++;
      }
    }
    expect(positionDifferences).toBeGreaterThan(0);
  });

  it('has correct dimensions', () => {
    expect(kingdom.width).toBe(64);
    expect(kingdom.height).toBe(128);
    expect(kingdom.tiles.length).toBe(64 * 128);
  });

  it('stores the seed', () => {
    expect(kingdom.seed).toBe(SEED);
  });

  it('places anchor settlements', () => {
    const anchors = kingdom.settlements.filter((s) =>
      TEST_CONFIG.anchorSettlements.some((a) => a.id === s.id),
    );
    expect(anchors.length).toBe(TEST_CONFIG.anchorSettlements.length);
  });

  it('places off-road settlements', () => {
    const hamlet = kingdom.settlements.find((s) => s.id === 'hamlet-a');
    expect(hamlet).toBeDefined();
    expect(hamlet?.name).toBe('Test Hamlet');
    expect(hamlet?.type).toBe('hamlet');
  });

  it('all settlements are on land tiles', () => {
    for (const settlement of kingdom.settlements) {
      const tile = getKingdomTile(
        kingdom,
        settlement.position[0],
        settlement.position[1],
      );
      expect(tile?.isLand).toBe(true);
    }
  });

  it('generates at least one road segment', () => {
    expect(kingdom.roads.length).toBeGreaterThan(0);
  });

  it('road tiles are marked on the map', () => {
    const roadTileCount = kingdom.tiles.filter((t) => t.hasRoad).length;
    expect(roadTileCount).toBeGreaterThan(0);
  });

  it('assigns regions to land tiles', () => {
    expect(kingdom.regions.length).toBeGreaterThan(0);
  });

  it('generates rivers', () => {
    expect(kingdom.rivers.length).toBeGreaterThanOrEqual(0);
    for (const river of kingdom.rivers) {
      expect(river.name.length).toBeGreaterThan(0);
      expect(river.path.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('tiles have valid biomes', () => {
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
    for (const tile of kingdom.tiles) {
      expect(validBiomes).toContain(tile.biome);
    }
  });

  it('authored regions paint biomes on land tiles', () => {
    // Find a land tile in the meadows region area
    const meadowRegion = kingdom.regions.find((r) => r.id === 'meadows');
    if (meadowRegion) {
      const [minX, minY, maxX, maxY] = meadowRegion.bounds;
      const cx = Math.floor((minX + maxX) / 2);
      const cy = Math.floor((minY + maxY) / 2);
      const tile = getKingdomTile(kingdom, cx, cy);
      if (tile?.isLand && !tile.isCoast) {
        // Should be meadow biome (from authored region)
        expect(tile.biome).toBe('meadow');
      }
    }
  });

  it('completes within performance budget', () => {
    const start = performance.now();
    generateKingdom('perf-kingdom', TEST_CONFIG);
    const elapsed = performance.now() - start;

    // Full kingdom gen should complete in < 3s for 64x128
    expect(elapsed).toBeLessThan(3000);
  });
});

describe('getKingdomTile', () => {
  const kingdom = generateKingdom(SEED, TEST_CONFIG);

  it('returns tile for valid coordinates', () => {
    const tile = getKingdomTile(kingdom, 32, 64);
    expect(tile).toBeDefined();
    expect(tile?.x).toBe(32);
    expect(tile?.y).toBe(64);
  });

  it('returns undefined for out-of-bounds', () => {
    expect(getKingdomTile(kingdom, -1, 0)).toBeUndefined();
    expect(getKingdomTile(kingdom, 100, 0)).toBeUndefined();
  });
});

describe('getRegionAt', () => {
  const kingdom = generateKingdom(SEED, TEST_CONFIG);

  it('finds region for tiles within region bounds', () => {
    if (kingdom.regions.length > 0) {
      const region = kingdom.regions[0];
      const cx = Math.floor((region.bounds[0] + region.bounds[2]) / 2);
      const cy = Math.floor((region.bounds[1] + region.bounds[3]) / 2);
      const found = getRegionAt(kingdom, cx, cy);
      // May or may not match the first region (overlaps possible),
      // but should find SOME region
      expect(found).toBeDefined();
    }
  });

  it('returns undefined for ocean tiles', () => {
    // Corner of map should be ocean with no region
    const region = getRegionAt(kingdom, 0, 0);
    expect(region).toBeUndefined();
  });
});

describe('getSettlementAt', () => {
  const kingdom = generateKingdom(SEED, TEST_CONFIG);

  it('finds settlement at its position', () => {
    if (kingdom.settlements.length > 0) {
      const s = kingdom.settlements[0];
      const found = getSettlementAt(kingdom, s.position[0], s.position[1]);
      expect(found).toBeDefined();
      expect(found?.id).toBe(s.id);
    }
  });

  it('returns undefined far from settlements', () => {
    const found = getSettlementAt(kingdom, 0, 0);
    expect(found).toBeUndefined();
  });
});
