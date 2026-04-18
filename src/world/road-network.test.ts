import { describe, expect, it } from 'vitest';
import type { KingdomConfig } from '@/schemas/kingdom.schema';
import { cyrb128, mulberry32 } from '@/utils/random';
import {
  findPath,
  generateRoadNetwork,
  hasRoadAt,
  placeAnchorSettlements,
  totalRoadLength,
} from './road-network';
import { generateTerrain } from './terrain-gen';

// Shared test config matching terrain-gen tests
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
    },
    {
      id: 'millbrook',
      name: 'Millbrook',
      type: 'town',
      roadSpineProgress: 0.25,
      features: ['market'],
    },
    {
      id: 'ravensgate',
      name: 'Ravensgate',
      type: 'city',
      roadSpineProgress: 0.5,
      features: ['gate'],
    },
    {
      id: 'pilgrims-rest',
      name: "Pilgrim's Rest",
      type: 'monastery',
      roadSpineProgress: 0.75,
      features: ['chapel'],
    },
    {
      id: 'grailsend',
      name: 'Grailsend',
      type: 'ruin',
      roadSpineProgress: 1,
      features: ['temple_entrance'],
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

const SEED = 'road-network-test';
const terrain = generateTerrain(SEED, TEST_CONFIG);

describe('placeAnchorSettlements', () => {
  const rng = mulberry32(cyrb128(`${SEED}:test`));
  const settlements = placeAnchorSettlements(terrain, TEST_CONFIG, rng);

  it('places all anchor settlements', () => {
    expect(settlements.length).toBe(TEST_CONFIG.anchorSettlements.length);
  });

  it('marks all settlements as anchors', () => {
    for (const s of settlements) {
      expect(s.isAnchor).toBe(true);
    }
  });

  it('places settlements on land tiles', () => {
    for (const s of settlements) {
      const [x, y] = s.position;
      const tile = terrain.tiles[y * terrain.width + x];
      expect(tile.isLand).toBe(true);
    }
  });

  it('preserves settlement metadata', () => {
    const ashford = settlements.find((s) => s.id === 'ashford');
    expect(ashford).toBeDefined();
    expect(ashford?.name).toBe('Ashford');
    expect(ashford?.type).toBe('village');
    expect(ashford?.features).toContain('tavern');
  });

  it('places settlements in roughly correct vertical order', () => {
    // roadSpineProgress 0 should be at higher y (south/bottom)
    // roadSpineProgress 1 should be at lower y (north/top)
    const first = settlements[0];
    const last = settlements[settlements.length - 1];
    expect(first.position[1]).toBeGreaterThan(last.position[1]);
  });

  it('maintains minimum distance between settlements', () => {
    for (let i = 0; i < settlements.length; i++) {
      for (let j = i + 1; j < settlements.length; j++) {
        const [ax, ay] = settlements[i].position;
        const [bx, by] = settlements[j].position;
        const dist = Math.abs(ax - bx) + Math.abs(ay - by);
        expect(dist).toBeGreaterThanOrEqual(5);
      }
    }
  });
});

describe('findPath', () => {
  it('finds a path between two land tiles', () => {
    // Find two land tiles in the center
    const centerY = Math.floor(terrain.height / 2);
    let startX = -1;
    let endX = -1;
    for (let x = 0; x < terrain.width; x++) {
      if (terrain.tiles[centerY * terrain.width + x].isLand) {
        if (startX === -1) startX = x;
        endX = x;
      }
    }

    if (startX !== -1 && endX !== -1 && startX !== endX) {
      const path = findPath(terrain, startX, centerY, endX, centerY);
      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThan(0);
      expect(path![0]).toEqual([startX, centerY]);
      expect(path![path!.length - 1]).toEqual([endX, centerY]);
    }
  });

  it('returns null for ocean-to-ocean path', () => {
    const path = findPath(terrain, 0, 0, 1, 0);
    expect(path).toBeNull();
  });

  it('returns a single-tile path for same start and goal', () => {
    // Find any land tile
    const landTile = terrain.tiles.find((t) => t.isLand);
    if (landTile) {
      const path = findPath(
        terrain,
        landTile.x,
        landTile.y,
        landTile.x,
        landTile.y,
      );
      expect(path).not.toBeNull();
      expect(path!.length).toBe(1);
    }
  });

  it('path only passes through land tiles', () => {
    const centerY = Math.floor(terrain.height / 2);
    let startX = -1;
    let endX = -1;
    for (let x = 0; x < terrain.width; x++) {
      if (terrain.tiles[centerY * terrain.width + x].isLand) {
        if (startX === -1) startX = x;
        endX = x;
      }
    }

    if (startX !== -1 && endX !== -1) {
      const path = findPath(terrain, startX, centerY, endX, centerY);
      if (path) {
        for (const [px, py] of path) {
          const tile = terrain.tiles[py * terrain.width + px];
          expect(tile.isLand).toBe(true);
        }
      }
    }
  });

  it('path steps are adjacent (no teleporting)', () => {
    const centerY = Math.floor(terrain.height / 2);
    let startX = -1;
    let endX = -1;
    for (let x = 0; x < terrain.width; x++) {
      if (terrain.tiles[centerY * terrain.width + x].isLand) {
        if (startX === -1) startX = x;
        endX = x;
      }
    }

    if (startX !== -1 && endX !== -1) {
      const path = findPath(terrain, startX, centerY, endX, centerY);
      if (path && path.length > 1) {
        for (let i = 1; i < path.length; i++) {
          const [px, py] = path[i - 1];
          const [nx, ny] = path[i];
          // 8-directional: Chebyshev distance must be 1
          const chebyshev = Math.max(Math.abs(px - nx), Math.abs(py - ny));
          expect(chebyshev).toBe(1);
        }
      }
    }
  });
});

describe('generateRoadNetwork', () => {
  const network = generateRoadNetwork(SEED, terrain, TEST_CONFIG);

  it('produces deterministic output', () => {
    const a = generateRoadNetwork(SEED, terrain, TEST_CONFIG);
    const b = generateRoadNetwork(SEED, terrain, TEST_CONFIG);

    expect(a.settlements.length).toBe(b.settlements.length);
    expect(a.roads.length).toBe(b.roads.length);

    for (let i = 0; i < a.settlements.length; i++) {
      expect(a.settlements[i].position).toEqual(b.settlements[i].position);
    }
  });

  it('places all anchor settlements', () => {
    expect(network.settlements.length).toBe(
      TEST_CONFIG.anchorSettlements.length,
    );
  });

  it('generates roads between consecutive anchors', () => {
    // Should have at most N-1 road segments for N settlements.
    // Some paths may fail on small grids if terrain blocks connectivity.
    const maxRoads = TEST_CONFIG.anchorSettlements.length - 1;
    expect(network.roads.length).toBeGreaterThan(0);
    expect(network.roads.length).toBeLessThanOrEqual(maxRoads);
  });

  it("all roads are highway type (King's Road)", () => {
    for (const road of network.roads) {
      expect(road.type).toBe('highway');
    }
  });

  it('road segments connect consecutive settlements', () => {
    for (const road of network.roads) {
      // Each road should connect two distinct settlements
      expect(road.connectsSettlements[0]).not.toBe(road.connectsSettlements[1]);
      // Both endpoints should exist in our settlement list
      const fromExists = network.settlements.some(
        (s) => s.id === road.connectsSettlements[0],
      );
      const toExists = network.settlements.some(
        (s) => s.id === road.connectsSettlements[1],
      );
      expect(fromExists).toBe(true);
      expect(toExists).toBe(true);
    }
  });

  it('road segments have non-empty paths', () => {
    for (const road of network.roads) {
      expect(road.path.length).toBeGreaterThan(0);
    }
  });

  it('road segments start and end at settlement positions', () => {
    for (const road of network.roads) {
      expect(road.from).toEqual(
        network.settlements.find((s) => s.id === road.connectsSettlements[0])
          ?.position,
      );
      expect(road.to).toEqual(
        network.settlements.find((s) => s.id === road.connectsSettlements[1])
          ?.position,
      );
    }
  });

  it('roadTiles map is populated', () => {
    expect(network.roadTiles.size).toBeGreaterThan(0);
  });

  it('all road tiles are on land', () => {
    for (const [idx] of network.roadTiles) {
      const tile = terrain.tiles[idx];
      expect(tile.isLand).toBe(true);
    }
  });

  it('has positive total road length', () => {
    expect(totalRoadLength(network)).toBeGreaterThan(0);
  });
});

describe('hasRoadAt', () => {
  const network = generateRoadNetwork(SEED, terrain, TEST_CONFIG);

  it("returns highway for tiles on the King's Road", () => {
    // Pick any tile from the first road segment
    if (network.roads.length > 0 && network.roads[0].path.length > 1) {
      const [x, y] = network.roads[0].path[1];
      const roadType = hasRoadAt(network, terrain, x, y);
      expect(roadType).toBe('highway');
    }
  });

  it('returns null for tiles not on any road', () => {
    // Ocean corner should have no road
    const result = hasRoadAt(network, terrain, 0, 0);
    expect(result).toBeNull();
  });
});

describe('performance', () => {
  it('generates road network within budget', () => {
    const start = performance.now();
    generateRoadNetwork('perf-test', terrain, TEST_CONFIG);
    const elapsed = performance.now() - start;

    // Should complete in < 2s for a 64x128 grid with 5 settlements
    expect(elapsed).toBeLessThan(2000);
  });
});
