import { describe, expect, it } from 'vitest';
import {
  KingdomBiome,
  KingdomConfigSchema,
  KingdomMapSchema,
  KingdomRegionSchema,
  MapTileSchema,
  RiverSchema,
  RoadSegmentSchema,
  RoadType,
  SettlementSchema,
  SettlementType,
} from './kingdom.schema';

describe('Kingdom Schema', () => {
  describe('KingdomBiome', () => {
    it('accepts all biome types', () => {
      const biomes = [
        'meadow',
        'forest',
        'deep_forest',
        'hills',
        'farmland',
        'moor',
        'riverside',
        'coast',
        'mountain',
        'swamp',
        'highland',
        'ocean',
      ];
      for (const biome of biomes) {
        expect(() => KingdomBiome.parse(biome)).not.toThrow();
      }
    });

    it('rejects invalid biome', () => {
      expect(() => KingdomBiome.parse('desert')).toThrow();
    });
  });

  describe('MapTileSchema', () => {
    it('validates a basic land tile', () => {
      const tile = {
        x: 10,
        y: 20,
        elevation: 0.5,
        moisture: 0.6,
        biome: 'meadow',
        isLand: true,
        isCoast: false,
      };
      expect(() => MapTileSchema.parse(tile)).not.toThrow();
    });

    it('validates a coast tile with river and road', () => {
      const tile = {
        x: 0,
        y: 0,
        elevation: 0.1,
        moisture: 0.9,
        biome: 'coast',
        isLand: true,
        isCoast: true,
        hasRiver: true,
        hasRoad: true,
        roadType: 'highway',
      };
      const parsed = MapTileSchema.parse(tile);
      expect(parsed.hasRiver).toBe(true);
      expect(parsed.roadType).toBe('highway');
    });

    it('rejects elevation out of range', () => {
      const tile = {
        x: 0,
        y: 0,
        elevation: 1.5,
        moisture: 0.5,
        biome: 'hills',
        isLand: true,
        isCoast: false,
      };
      expect(() => MapTileSchema.parse(tile)).toThrow();
    });

    it('defaults hasRiver and hasRoad to false', () => {
      const tile = {
        x: 0,
        y: 0,
        elevation: 0.5,
        moisture: 0.5,
        biome: 'forest',
        isLand: true,
        isCoast: false,
      };
      const parsed = MapTileSchema.parse(tile);
      expect(parsed.hasRiver).toBe(false);
      expect(parsed.hasRoad).toBe(false);
    });
  });

  describe('RoadSegmentSchema', () => {
    it('validates a highway segment', () => {
      const road = {
        id: 'kings-road-01',
        type: 'highway',
        from: [10, 20],
        to: [10, 30],
        waypoints: [[10, 25]],
      };
      expect(() => RoadSegmentSchema.parse(road)).not.toThrow();
    });

    it('validates a minimal road segment', () => {
      const road = {
        id: 'path-01',
        type: 'trail',
        from: [5, 5],
        to: [8, 8],
      };
      const parsed = RoadSegmentSchema.parse(road);
      expect(parsed.waypoints).toEqual([]);
    });

    it('accepts all road types', () => {
      for (const type of ['highway', 'secondary', 'path', 'trail']) {
        expect(() => RoadType.parse(type)).not.toThrow();
      }
    });
  });

  describe('SettlementSchema', () => {
    it('validates a town settlement', () => {
      const settlement = {
        id: 'millbrook',
        name: 'Millbrook',
        type: 'town',
        position: [50, 80],
        connectedTo: ['ashford', 'ravensgate'],
        mainQuestChapter: 'chapter-01',
        description: 'A market town where the road crosses the river.',
        features: ['tavern', 'market', 'chapel'],
      };
      expect(() => SettlementSchema.parse(settlement)).not.toThrow();
    });

    it('validates a minimal settlement', () => {
      const settlement = {
        id: 'hamlet-01',
        name: 'Willowdale',
        type: 'hamlet',
        position: [30, 40],
      };
      const parsed = SettlementSchema.parse(settlement);
      expect(parsed.connectedTo).toEqual([]);
      expect(parsed.features).toEqual([]);
      expect(parsed.population).toBe('small');
    });

    it('accepts all settlement types', () => {
      const types = [
        'city',
        'town',
        'village',
        'hamlet',
        'outpost',
        'monastery',
        'ruin',
        'port',
      ];
      for (const type of types) {
        expect(() => SettlementType.parse(type)).not.toThrow();
      }
    });
  });

  describe('KingdomRegionSchema', () => {
    it('validates a region', () => {
      const region = {
        id: 'ashford-meadows',
        name: 'Ashford Meadows',
        biome: 'meadow',
        bounds: [0, 0, 50, 40],
        settlements: ['ashford'],
        terrainFeatures: ['rolling_hills', 'wildflower_fields'],
        dangerTier: 0,
      };
      expect(() => KingdomRegionSchema.parse(region)).not.toThrow();
    });

    it('validates a minimal region', () => {
      const region = {
        id: 'wild-coast',
        name: 'Wild Coast',
        biome: 'coast',
        bounds: [0, 80, 30, 100],
      };
      const parsed = KingdomRegionSchema.parse(region);
      expect(parsed.settlements).toEqual([]);
      expect(parsed.terrainFeatures).toEqual([]);
    });
  });

  describe('RiverSchema', () => {
    it('validates a river', () => {
      const river = {
        id: 'river-mill',
        name: 'River Mill',
        path: [
          [50, 20],
          [48, 30],
          [45, 40],
          [42, 50],
        ],
        width: 'river',
      };
      expect(() => RiverSchema.parse(river)).not.toThrow();
    });

    it('requires at least 2 path points', () => {
      const river = {
        id: 'stream-01',
        name: 'Tiny Stream',
        path: [[10, 10]],
      };
      expect(() => RiverSchema.parse(river)).toThrow();
    });
  });

  describe('KingdomConfigSchema', () => {
    it('validates a full kingdom config', () => {
      const config = {
        name: 'The Kingdom of Albion',
        width: 128,
        height: 256,
        seaLevel: 0.35,
        mountainLevel: 0.75,
        anchorSettlements: [
          {
            id: 'ashford',
            name: 'Ashford',
            type: 'village',
            mainQuestChapter: 'chapter-00',
            description: 'Your home town.',
            features: ['home', 'tavern'],
            roadSpineProgress: 0,
          },
          {
            id: 'grailsend',
            name: 'Grailsend',
            type: 'ruin',
            mainQuestChapter: 'chapter-05',
            roadSpineProgress: 1,
          },
        ],
        terrainModifiers: {
          elongation: 1.5,
          coastlineNoise: 0.5,
          ridgeStrength: 0.6,
        },
      };
      expect(() => KingdomConfigSchema.parse(config)).not.toThrow();
    });

    it('applies defaults for optional fields', () => {
      const config = {
        name: 'Albion',
        width: 64,
        height: 128,
        anchorSettlements: [
          {
            id: 'start',
            name: 'Start',
            type: 'village',
            roadSpineProgress: 0,
          },
          {
            id: 'end',
            name: 'End',
            type: 'ruin',
            roadSpineProgress: 1,
          },
        ],
      };
      const parsed = KingdomConfigSchema.parse(config);
      expect(parsed.seaLevel).toBe(0.35);
      expect(parsed.mountainLevel).toBe(0.75);
      // terrainModifiers defaults to {} which means inner defaults apply
      expect(parsed.terrainModifiers).toBeDefined();
    });

    it('rejects grid dimensions too small', () => {
      const config = {
        name: 'Tiny',
        width: 10,
        height: 10,
        anchorSettlements: [],
      };
      expect(() => KingdomConfigSchema.parse(config)).toThrow();
    });
  });

  describe('KingdomMapSchema', () => {
    it('validates a minimal generated map', () => {
      const map = {
        seed: 'Golden Verdant Meadow',
        width: 2,
        height: 2,
        tiles: [
          {
            x: 0,
            y: 0,
            elevation: 0.1,
            moisture: 0.8,
            biome: 'ocean',
            isLand: false,
            isCoast: false,
          },
          {
            x: 1,
            y: 0,
            elevation: 0.4,
            moisture: 0.6,
            biome: 'coast',
            isLand: true,
            isCoast: true,
          },
          {
            x: 0,
            y: 1,
            elevation: 0.3,
            moisture: 0.7,
            biome: 'coast',
            isLand: true,
            isCoast: true,
          },
          {
            x: 1,
            y: 1,
            elevation: 0.6,
            moisture: 0.5,
            biome: 'meadow',
            isLand: true,
            isCoast: false,
          },
        ],
        settlements: [],
        roads: [],
        rivers: [],
        regions: [],
      };
      expect(() => KingdomMapSchema.parse(map)).not.toThrow();
    });
  });
});
