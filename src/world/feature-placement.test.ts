import { beforeAll, describe, expect, it } from 'vitest';
import { initContentStore } from '@/db/content-queries';
import type { KingdomConfig } from '@/schemas/kingdom.schema';
import {
  buildFeatureIndex,
  generateFeaturePlacements,
  generateFeaturePlacementsWithDensity,
  getFeaturesAtTile,
} from './feature-placement';
import { generateKingdom } from './kingdom-gen';

// Load feature JSON files for the content store
const featureModules = import.meta.glob<{ default: { id: string } }>(
  '../content/features/*.json',
  { eager: true },
);

beforeAll(() => {
  const features = Object.values(featureModules).map((m) => ({
    id: m.default.id,
    data: JSON.stringify(m.default),
  }));

  initContentStore({
    monsters: [],
    items: [],
    encounterTables: [],
    lootTables: [],
    npcsNamed: [],
    npcPools: [],
    buildings: [],
    towns: [],
    features,
    quests: [],
    dungeons: [],
    encounters: [],
    roadSpine: null,
    pacingConfig: null,
  });
});

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
  offRoadSettlements: [],
  terrainModifiers: {
    elongation: 1.5,
    coastlineNoise: 0.5,
    ridgeStrength: 0.6,
  },
};

const SEED = 'feature-placement-test';

describe('generateFeaturePlacements', () => {
  const kingdom = generateKingdom(SEED, TEST_CONFIG);

  it('places features on the kingdom map', () => {
    const placements = generateFeaturePlacements(kingdom, SEED);
    expect(placements.length).toBeGreaterThan(0);
  });

  it('is deterministic from seed', () => {
    const a = generateFeaturePlacements(kingdom, SEED);
    const b = generateFeaturePlacements(kingdom, SEED);

    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].id).toBe(b[i].id);
      expect(a[i].gridPosition).toEqual(b[i].gridPosition);
      expect(a[i].definition.id).toBe(b[i].definition.id);
      expect(a[i].rotation).toBe(b[i].rotation);
    }
  });

  it('different seeds produce different placements', () => {
    const a = generateFeaturePlacements(kingdom, 'seed-alpha');
    const b = generateFeaturePlacements(kingdom, 'seed-beta');

    // At least some features should be at different positions or be different types
    let differences = 0;
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      if (
        a[i].gridPosition[0] !== b[i].gridPosition[0] ||
        a[i].gridPosition[1] !== b[i].gridPosition[1] ||
        a[i].definition.id !== b[i].definition.id
      ) {
        differences++;
      }
    }
    expect(differences).toBeGreaterThan(0);
  });

  it('places ambient features off roads, but allows specific roadside features on roads', () => {
    const placements = generateFeaturePlacements(kingdom, SEED);
    for (const p of placements) {
      const [gx, gy] = p.gridPosition;
      const tile = kingdom.tiles[gy * kingdom.width + gx];
      if (p.id.startsWith('road_feature:')) {
        expect(tile.hasRoad).toBe(true);
      } else {
        expect(tile.hasRoad).toBe(false);
      }
    }
  });

  it('does not place features on settlement tiles', () => {
    const placements = generateFeaturePlacements(kingdom, SEED);
    const settlementPositions = new Set(
      kingdom.settlements.map((s) => `${s.position[0]},${s.position[1]}`),
    );
    for (const p of placements) {
      expect(
        settlementPositions.has(`${p.gridPosition[0]},${p.gridPosition[1]}`),
      ).toBe(false);
    }
  });

  it('only places features on land tiles', () => {
    const placements = generateFeaturePlacements(kingdom, SEED);
    for (const p of placements) {
      const [gx, gy] = p.gridPosition;
      const tile = kingdom.tiles[gy * kingdom.width + gx];
      expect(tile.isLand).toBe(true);
    }
  });

  it('assigns each feature to a region', () => {
    const placements = generateFeaturePlacements(kingdom, SEED);
    const regionIds = new Set(kingdom.regions.map((r) => r.id));
    regionIds.add('unknown'); // Road tiles on exact boundaries might map to unknown
    for (const p of placements) {
      expect(regionIds.has(p.regionId)).toBe(true);
    }
  });

  it('has valid feature definitions', () => {
    const placements = generateFeaturePlacements(kingdom, SEED);
    for (const p of placements) {
      expect(p.definition).toBeDefined();
      expect(p.definition.id).toBeTruthy();
      expect(p.definition.name).toBeTruthy();
      expect(['ambient', 'minor', 'major']).toContain(p.definition.tier);
    }
  });
});

describe('generateFeaturePlacementsWithDensity', () => {
  const kingdom = generateKingdom(SEED, TEST_CONFIG);

  it('respects density overrides', () => {
    const sparse = new Map<string, 'sparse' | 'normal' | 'dense'>([
      ['meadows', 'sparse'],
      ['forest', 'sparse'],
      ['highlands', 'sparse'],
    ]);
    const dense = new Map<string, 'sparse' | 'normal' | 'dense'>([
      ['meadows', 'dense'],
      ['forest', 'dense'],
      ['highlands', 'dense'],
    ]);

    const sparsePlacements = generateFeaturePlacementsWithDensity(
      kingdom,
      SEED,
      sparse,
    );
    const densePlacements = generateFeaturePlacementsWithDensity(
      kingdom,
      SEED,
      dense,
    );

    // Dense should produce more features than sparse
    expect(densePlacements.length).toBeGreaterThan(sparsePlacements.length);
  });
});

describe('buildFeatureIndex', () => {
  const kingdom = generateKingdom(SEED, TEST_CONFIG);
  const placements = generateFeaturePlacements(kingdom, SEED);
  const index = buildFeatureIndex(placements);

  it('creates an index keyed by grid position', () => {
    expect(index.size).toBeGreaterThan(0);
  });

  it('all placements are retrievable via the index', () => {
    let foundCount = 0;
    for (const p of placements) {
      const features = getFeaturesAtTile(
        index,
        p.gridPosition[0],
        p.gridPosition[1],
      );
      if (features.some((f) => f.id === p.id)) {
        foundCount++;
      }
    }
    expect(foundCount).toBe(placements.length);
  });

  it('returns empty array for tiles without features', () => {
    const features = getFeaturesAtTile(index, -999, -999);
    expect(features).toEqual([]);
  });
});
