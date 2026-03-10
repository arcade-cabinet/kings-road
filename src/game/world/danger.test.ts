import { describe, expect, it } from 'vitest';
import type { KingdomConfig } from '../../schemas/kingdom.schema';
import {
  getDangerTier,
  getEncounterChance,
  getRegionDangerTier,
} from './danger';
import { generateKingdom } from './kingdom-gen';

// --- Test with a minimal kingdom map ---

const TEST_CONFIG: KingdomConfig = {
  name: 'Danger Test Kingdom',
  width: 64,
  height: 128,
  seaLevel: 0.35,
  mountainLevel: 0.75,
  anchorSettlements: [
    {
      id: 'start',
      name: 'Start Town',
      type: 'village',
      roadSpineProgress: 0,
      features: ['tavern'],
    },
    {
      id: 'end',
      name: 'End Town',
      type: 'town',
      roadSpineProgress: 1,
      features: ['market'],
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

const kingdomMap = generateKingdom('danger-test-seed', TEST_CONFIG);

describe('getDangerTier', () => {
  it('returns 0 for TOWN chunks', () => {
    expect(getDangerTier(0, 5, 'TOWN')).toBe(0);
    expect(getDangerTier(10, 5, 'TOWN')).toBe(0);
  });

  it('returns 4 for DUNGEON chunks', () => {
    expect(getDangerTier(3, 10, 'DUNGEON')).toBe(4);
    expect(getDangerTier(0, 0, 'DUNGEON')).toBe(4);
  });

  it('returns 0 for ROAD chunks', () => {
    expect(getDangerTier(0, 0, 'ROAD')).toBe(0);
    expect(getDangerTier(5, 100, 'ROAD')).toBe(0);
  });

  it('returns 1 (default) for WILD without kingdom map', () => {
    expect(getDangerTier(2, 0, 'WILD')).toBe(1);
    expect(getDangerTier(10, 50, 'WILD')).toBe(1);
  });

  it('returns 1 (default) for WILD with kingdom map but outside any region', () => {
    // Use a tile far from any authored region
    expect(getDangerTier(0, 0, 'WILD', kingdomMap)).toBe(1);
  });

  it('uses region dangerTier when kingdom map and region are available', () => {
    // Create a config with known regions using latitudeRange (authored format)
    const configWithRegion: KingdomConfig = {
      ...TEST_CONFIG,
      regions: [
        {
          id: 'safe-meadow',
          name: 'Safe Meadow',
          biome: 'meadow',
          latitudeRange: [0.0, 0.4] as [number, number],
          dangerTier: 0,
          featureDensity: 'normal' as const,
          terrainFeatures: [],
          settlements: [],
        },
        {
          id: 'dangerous-forest',
          name: 'Dangerous Forest',
          biome: 'deep_forest',
          latitudeRange: [0.6, 0.9] as [number, number],
          dangerTier: 3,
          featureDensity: 'normal' as const,
          terrainFeatures: [],
          settlements: [],
        },
      ],
    };
    const map = generateKingdom('danger-region-test', configWithRegion);

    // Find a tile inside the safe meadow region
    const safeRegion = map.regions.find((r) => r.id === 'safe-meadow');
    if (safeRegion) {
      const [minX, minY, maxX, maxY] = safeRegion.bounds;
      const midX = Math.floor((minX + maxX) / 2);
      const midY = Math.floor((minY + maxY) / 2);
      expect(getDangerTier(midX, midY, 'WILD', map)).toBe(0);
    }

    // Find a tile inside the dangerous forest region
    const dangerRegion = map.regions.find((r) => r.id === 'dangerous-forest');
    if (dangerRegion) {
      const [minX, minY, maxX, maxY] = dangerRegion.bounds;
      const midX = Math.floor((minX + maxX) / 2);
      const midY = Math.floor((minY + maxY) / 2);
      expect(getDangerTier(midX, midY, 'WILD', map)).toBe(3);
    }
  });
});

describe('getEncounterChance', () => {
  it('returns 0 for safe tier', () => {
    expect(getEncounterChance(0)).toBe(0);
  });

  it('increases with danger tier', () => {
    expect(getEncounterChance(1)).toBeLessThan(getEncounterChance(2));
    expect(getEncounterChance(2)).toBeLessThan(getEncounterChance(3));
    expect(getEncounterChance(3)).toBeLessThan(getEncounterChance(4));
  });

  it('returns 0 for unknown tier', () => {
    expect(getEncounterChance(99)).toBe(0);
  });

  it('returns specific values for each tier', () => {
    expect(getEncounterChance(1)).toBe(0.001);
    expect(getEncounterChance(2)).toBe(0.005);
    expect(getEncounterChance(3)).toBe(0.01);
    expect(getEncounterChance(4)).toBe(0.02);
  });
});

describe('getRegionDangerTier', () => {
  it('returns tier 1 and undefined region for tiles outside any region', () => {
    const result = getRegionDangerTier(kingdomMap, 0, 0);
    expect(result.tier).toBe(1);
    expect(result.region).toBeUndefined();
  });

  it('returns the region and its dangerTier when available', () => {
    const configWithRegion: KingdomConfig = {
      ...TEST_CONFIG,
      regions: [
        {
          id: 'test-region',
          name: 'Test Region',
          biome: 'moor',
          latitudeRange: [0.3, 0.7] as [number, number],
          dangerTier: 2,
          featureDensity: 'normal' as const,
          terrainFeatures: [],
          settlements: [],
        },
      ],
    };
    const map = generateKingdom('region-tier-test', configWithRegion);

    // Find the center of the generated region bounds
    const region = map.regions.find((r) => r.id === 'test-region');
    if (region) {
      const [minX, minY, maxX, maxY] = region.bounds;
      const midX = Math.floor((minX + maxX) / 2);
      const midY = Math.floor((minY + maxY) / 2);
      const result = getRegionDangerTier(map, midX, midY);
      expect(result.tier).toBe(2);
      expect(result.region?.id).toBe('test-region');
    }
  });
});
