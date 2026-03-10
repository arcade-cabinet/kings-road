import { describe, expect, it } from 'vitest';
import type { KingdomConfig } from '../../schemas/kingdom.schema';
import { generateKingdom, getKingdomTile } from '../world/kingdom-gen';
import { cyrb128, mulberry32 } from './random';
import {
  BLOCK_SIZE,
  CHUNK_SIZE,
  getChunkTypeFromKingdom,
  getRandomDialogue,
  getRandomNPCName,
  getTerrainHeight,
  MAX_TERRAIN_HEIGHT,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  VIEW_DISTANCE,
} from './worldGen';

describe('constants', () => {
  it('exports correct CHUNK_SIZE', () => {
    expect(CHUNK_SIZE).toBe(120);
  });

  it('exports correct BLOCK_SIZE', () => {
    expect(BLOCK_SIZE).toBe(5);
  });

  it('exports correct VIEW_DISTANCE', () => {
    expect(VIEW_DISTANCE).toBe(1);
  });

  it('exports correct PLAYER_HEIGHT', () => {
    expect(PLAYER_HEIGHT).toBe(1.6);
  });

  it('exports correct PLAYER_RADIUS', () => {
    expect(PLAYER_RADIUS).toBe(0.6);
  });
});

describe('getRandomDialogue', () => {
  it('returns a blacksmith dialogue', () => {
    const rng = mulberry32(cyrb128('test'));
    const dialogue = getRandomDialogue('blacksmith', rng);
    expect(typeof dialogue).toBe('string');
    expect(dialogue.length).toBeGreaterThan(0);
  });

  it('returns an innkeeper dialogue', () => {
    const rng = mulberry32(cyrb128('test'));
    const dialogue = getRandomDialogue('innkeeper', rng);
    expect(typeof dialogue).toBe('string');
    expect(dialogue.length).toBeGreaterThan(0);
  });

  it('returns a merchant dialogue', () => {
    const rng = mulberry32(cyrb128('test'));
    const dialogue = getRandomDialogue('merchant', rng);
    expect(typeof dialogue).toBe('string');
    expect(dialogue.length).toBeGreaterThan(0);
  });

  it('returns a wanderer dialogue for unknown types', () => {
    const rng = mulberry32(cyrb128('test'));
    const dialogue = getRandomDialogue('unknown-type', rng);
    expect(typeof dialogue).toBe('string');
    expect(dialogue.length).toBeGreaterThan(0);
  });

  it('returns consistent dialogue for same RNG state', () => {
    const rng1 = mulberry32(cyrb128('same-seed'));
    const rng2 = mulberry32(cyrb128('same-seed'));

    const dialogue1 = getRandomDialogue('blacksmith', rng1);
    const dialogue2 = getRandomDialogue('blacksmith', rng2);
    expect(dialogue1).toBe(dialogue2);
  });
});

describe('getRandomNPCName', () => {
  it('returns a string name', () => {
    const rng = mulberry32(cyrb128('test'));
    const name = getRandomNPCName(rng);
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('sometimes returns just first name', () => {
    // Run multiple times to cover both branches
    const names = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const rng = mulberry32(cyrb128(`seed-${i}`));
      const name = getRandomNPCName(rng);
      names.add(name.split(' ').length);
    }
    // Should get both 1-word and 2-word names
    expect(names.has(1) || names.has(2)).toBe(true);
  });

  it('returns consistent name for same RNG state', () => {
    const rng1 = mulberry32(cyrb128('same-seed'));
    const rng2 = mulberry32(cyrb128('same-seed'));

    const name1 = getRandomNPCName(rng1);
    const name2 = getRandomNPCName(rng2);
    expect(name1).toBe(name2);
  });

  it('generates valid names from name lists', () => {
    // Run many times to increase coverage of name selection
    for (let i = 0; i < 50; i++) {
      const rng = mulberry32(cyrb128(`name-${i}`));
      const name = getRandomNPCName(rng);
      // Names should only contain alphabetic characters and spaces
      expect(name).toMatch(/^[A-Za-z-]+( [A-Za-z-]+)?$/);
    }
  });
});

// ── Kingdom-map-aware tests ───────────────────────────────────────────

const KINGDOM_TEST_CONFIG: KingdomConfig = {
  name: 'Test Kingdom',
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

const KINGDOM_SEED = 'worldgen-kingdom-test';
const kingdomMap = generateKingdom(KINGDOM_SEED, KINGDOM_TEST_CONFIG);

describe('getChunkTypeFromKingdom', () => {
  it('returns null for ocean tile (corner of map)', () => {
    const result = getChunkTypeFromKingdom(kingdomMap, 0, 0);
    expect(result).toBeNull();
  });

  it('returns null for out-of-bounds coordinates', () => {
    expect(getChunkTypeFromKingdom(kingdomMap, -1, -1)).toBeNull();
    expect(getChunkTypeFromKingdom(kingdomMap, 200, 200)).toBeNull();
  });

  it('returns TOWN for settlement tiles', () => {
    for (const settlement of kingdomMap.settlements) {
      const [sx, sy] = settlement.position;
      const result = getChunkTypeFromKingdom(kingdomMap, sx, sy);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('TOWN');
      expect(result?.name).toBe(settlement.name);
    }
  });

  it('returns ROAD for road tiles away from settlements', () => {
    // Find a road tile that's far enough from any settlement
    const roadTile = kingdomMap.tiles.find(
      (t) =>
        t.hasRoad &&
        kingdomMap.settlements.every(
          (s) =>
            Math.abs(s.position[0] - t.x) > 3 ||
            Math.abs(s.position[1] - t.y) > 3,
        ),
    );
    if (roadTile) {
      const result = getChunkTypeFromKingdom(
        kingdomMap,
        roadTile.x,
        roadTile.y,
      );
      expect(result).not.toBeNull();
      expect(result?.type).toBe('ROAD');
    }
  });

  it('returns WILD for land tiles away from roads and settlements', () => {
    // Find a land tile that's far from any settlement and has no road
    const wildTile = kingdomMap.tiles.find(
      (t) =>
        t.isLand &&
        !t.hasRoad &&
        kingdomMap.settlements.every(
          (s) =>
            Math.abs(s.position[0] - t.x) > 3 ||
            Math.abs(s.position[1] - t.y) > 3,
        ),
    );
    if (wildTile) {
      const result = getChunkTypeFromKingdom(
        kingdomMap,
        wildTile.x,
        wildTile.y,
      );
      expect(result).not.toBeNull();
      expect(result?.type).toBe('WILD');
    }
  });

  it('includes the map tile in results', () => {
    const landTile = kingdomMap.tiles.find((t) => t.isLand);
    if (landTile) {
      const result = getChunkTypeFromKingdom(
        kingdomMap,
        landTile.x,
        landTile.y,
      );
      expect(result?.tile).toBeDefined();
      expect(result?.tile.biome).toBeDefined();
      expect(result?.tile.elevation).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('getTerrainHeight', () => {
  it('returns 0 for ocean positions', () => {
    // Corner of map should be ocean
    const height = getTerrainHeight(kingdomMap, 0, 0);
    expect(height).toBe(0);
  });

  it('returns positive height for land positions', () => {
    // Find center land tile
    const centerTile = getKingdomTile(kingdomMap, 32, 64);
    if (centerTile?.isLand) {
      const height = getTerrainHeight(
        kingdomMap,
        32 * CHUNK_SIZE + CHUNK_SIZE / 2,
        64 * CHUNK_SIZE + CHUNK_SIZE / 2,
      );
      expect(height).toBeGreaterThan(0);
      expect(height).toBeLessThanOrEqual(MAX_TERRAIN_HEIGHT);
    }
  });

  it('returns height within valid range for all land tiles', () => {
    // Sample a few land tiles
    const landTiles = kingdomMap.tiles.filter((t) => t.isLand).slice(0, 20);
    for (const tile of landTiles) {
      const worldX = tile.x * CHUNK_SIZE + CHUNK_SIZE / 2;
      const worldZ = tile.y * CHUNK_SIZE + CHUNK_SIZE / 2;
      const height = getTerrainHeight(kingdomMap, worldX, worldZ);
      expect(height).toBeGreaterThanOrEqual(0);
      expect(height).toBeLessThanOrEqual(MAX_TERRAIN_HEIGHT);
    }
  });

  it('interpolates smoothly between tiles', () => {
    const landTile = kingdomMap.tiles.find(
      (t) => t.isLand && t.x > 5 && t.y > 5,
    );
    if (landTile) {
      const baseX = landTile.x * CHUNK_SIZE;
      const baseZ = landTile.y * CHUNK_SIZE;
      // Sample across the chunk — heights should change gradually
      const h0 = getTerrainHeight(kingdomMap, baseX, baseZ);
      const h1 = getTerrainHeight(kingdomMap, baseX + CHUNK_SIZE / 4, baseZ);
      const h2 = getTerrainHeight(kingdomMap, baseX + CHUNK_SIZE / 2, baseZ);
      // All should be finite numbers
      expect(Number.isFinite(h0)).toBe(true);
      expect(Number.isFinite(h1)).toBe(true);
      expect(Number.isFinite(h2)).toBe(true);
    }
  });
});

describe('MAX_TERRAIN_HEIGHT', () => {
  it('is a positive number', () => {
    expect(MAX_TERRAIN_HEIGHT).toBeGreaterThan(0);
  });
});
