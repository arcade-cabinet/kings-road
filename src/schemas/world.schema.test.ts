import { describe, expect, it } from 'vitest';
import {
  AnchorPointSchema,
  RegionSchema,
  RoadSpineSchema,
} from './world.schema';

describe('World Schema', () => {
  it('validates a valid anchor point', () => {
    const anchor = {
      id: 'anchor-01',
      name: 'Millbrook',
      type: 'VILLAGE_FRIENDLY',
      distanceFromStart: 6000,
      mainQuestChapter: 'chapter-01',
      description: "A quiet farming village at the start of the King's Road.",
      features: ['tavern', 'blacksmith'],
    };
    expect(() => AnchorPointSchema.parse(anchor)).not.toThrow();
  });

  it('rejects anchor with missing required fields', () => {
    const invalid = { id: 'bad', name: 'Bad' };
    expect(() => AnchorPointSchema.parse(invalid)).toThrow();
  });

  it('rejects anchor with invalid type', () => {
    const invalid = {
      id: 'anchor-01',
      name: 'Millbrook',
      type: 'INVALID_TYPE',
      distanceFromStart: 6000,
      mainQuestChapter: 'chapter-01',
      description: 'A quiet farming village at the start of the road.',
      features: ['tavern'],
    };
    expect(() => AnchorPointSchema.parse(invalid)).toThrow();
  });

  it('rejects anchor with negative distance', () => {
    const invalid = {
      id: 'anchor-01',
      name: 'Millbrook',
      type: 'VILLAGE_FRIENDLY',
      distanceFromStart: -100,
      mainQuestChapter: 'chapter-01',
      description: 'A quiet farming village at the start of the road.',
      features: ['tavern'],
    };
    expect(() => AnchorPointSchema.parse(invalid)).toThrow();
  });

  it('rejects anchor with empty features array', () => {
    const invalid = {
      id: 'anchor-01',
      name: 'Millbrook',
      type: 'VILLAGE_FRIENDLY',
      distanceFromStart: 6000,
      mainQuestChapter: 'chapter-01',
      description: 'A quiet farming village at the start of the road.',
      features: [],
    };
    expect(() => AnchorPointSchema.parse(invalid)).toThrow();
  });

  it('applies default sideQuestSlots of 0', () => {
    const anchor = {
      id: 'anchor-01',
      name: 'Millbrook',
      type: 'VILLAGE_FRIENDLY',
      distanceFromStart: 6000,
      mainQuestChapter: 'chapter-01',
      description: 'A quiet farming village at the start of the road.',
      features: ['tavern'],
    };
    const parsed = AnchorPointSchema.parse(anchor);
    expect(parsed.sideQuestSlots).toBe(0);
  });

  it('validates a complete road spine', () => {
    const spine = {
      totalDistance: 30000,
      anchors: [
        {
          id: 'home',
          name: 'Ashford',
          type: 'VILLAGE_FRIENDLY',
          distanceFromStart: 0,
          mainQuestChapter: 'chapter-00',
          description: 'Your home town.',
          features: ['home', 'tavern'],
        },
        {
          id: 'anchor-01',
          name: 'Millbrook',
          type: 'VILLAGE_FRIENDLY',
          distanceFromStart: 6000,
          mainQuestChapter: 'chapter-01',
          description: 'First stop on the road.',
          features: ['tavern'],
        },
      ],
    };
    expect(() => RoadSpineSchema.parse(spine)).not.toThrow();
  });

  it('rejects road spine where first anchor is not at distance 0', () => {
    const spine = {
      totalDistance: 30000,
      anchors: [
        {
          id: 'home',
          name: 'Ashford',
          type: 'VILLAGE_FRIENDLY',
          distanceFromStart: 1000,
          mainQuestChapter: 'chapter-00',
          description: 'Your home town, not at zero.',
          features: ['home'],
        },
        {
          id: 'anchor-01',
          name: 'Millbrook',
          type: 'VILLAGE_FRIENDLY',
          distanceFromStart: 6000,
          mainQuestChapter: 'chapter-01',
          description: 'First stop on the road.',
          features: ['tavern'],
        },
      ],
    };
    expect(() => RoadSpineSchema.parse(spine)).toThrow(
      'First anchor must be at distance 0',
    );
  });

  it('rejects road spine with fewer than 2 anchors', () => {
    const spine = {
      totalDistance: 30000,
      anchors: [
        {
          id: 'home',
          name: 'Ashford',
          type: 'VILLAGE_FRIENDLY',
          distanceFromStart: 0,
          mainQuestChapter: 'chapter-00',
          description: 'Your home town.',
          features: ['home'],
        },
      ],
    };
    expect(() => RoadSpineSchema.parse(spine)).toThrow();
  });

  it('validates a region definition', () => {
    const region = {
      id: 'region-01',
      name: 'The Shire Downs',
      biome: 'MEADOW',
      anchorRange: ['home', 'anchor-01'],
      terrainFeatures: ['rolling_hills', 'wildflowers', 'stone_walls'],
    };
    expect(() => RegionSchema.parse(region)).not.toThrow();
  });

  it('rejects region with invalid biome', () => {
    const region = {
      id: 'region-01',
      name: 'The Shire Downs',
      biome: 'DESERT',
      anchorRange: ['home', 'anchor-01'],
      terrainFeatures: ['sand_dunes'],
    };
    expect(() => RegionSchema.parse(region)).toThrow();
  });
});
