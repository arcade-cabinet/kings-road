/**
 * Kingdom generation performance profiling and regression tests.
 *
 * Profiles each phase of the pipeline on the production 128x256 grid.
 * Reports timing breakdown and asserts overall budget of <2s.
 */
import { describe, expect, it } from 'vitest';
import { cyrb128, mulberry32 } from '@/core';
import type { KingdomConfig } from '@/schemas/kingdom.schema';
import { generateKingdom } from '@/world/kingdom-gen';
import {
  findMainLandmass,
  findPath,
  generateRoadNetwork,
  placeAnchorSettlements,
} from '@/world/road-network';
import { generateTerrain } from '@/world/terrain-gen';

// --- Helpers ---

function timeMs(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

function timeMsResult<T>(fn: () => T): { elapsed: number; result: T } {
  const start = performance.now();
  const result = fn();
  const elapsed = performance.now() - start;
  return { elapsed, result };
}

// --- Production config (128x256) ---

const PROD_CONFIG: KingdomConfig = {
  name: 'Benchmark Kingdom',
  width: 128,
  height: 256,
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
      roadSpineProgress: 0.2,
      features: ['market'],
      preferredRegion: 'forest',
    },
    {
      id: 'thornfield',
      name: 'Thornfield',
      type: 'ruin',
      roadSpineProgress: 0.4,
      features: ['camp'],
      preferredRegion: 'hills',
    },
    {
      id: 'ravensgate',
      name: 'Ravensgate',
      type: 'city',
      roadSpineProgress: 0.57,
      features: ['gate'],
      preferredRegion: 'moors',
    },
    {
      id: 'pilgrims-rest',
      name: "Pilgrim's Rest",
      type: 'monastery',
      roadSpineProgress: 0.75,
      features: ['chapel'],
      preferredRegion: 'highland',
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
      name: 'Meadows',
      biome: 'meadow',
      latitudeRange: [0, 0.18],
      terrainFeatures: ['rolling_hills'],
      settlements: [],
      dangerTier: 0,
      featureDensity: 'normal',
    },
    {
      id: 'forest',
      name: 'Forest',
      biome: 'forest',
      latitudeRange: [0.15, 0.38],
      terrainFeatures: ['dense_canopy'],
      settlements: [],
      dangerTier: 1,
      featureDensity: 'dense',
    },
    {
      id: 'hills',
      name: 'Hills',
      biome: 'hills',
      latitudeRange: [0.33, 0.52],
      terrainFeatures: ['rocky_outcrops'],
      settlements: [],
      dangerTier: 2,
      featureDensity: 'sparse',
    },
    {
      id: 'moors',
      name: 'Moors',
      biome: 'moor',
      latitudeRange: [0.48, 0.68],
      terrainFeatures: ['boggy_hollows'],
      settlements: [],
      dangerTier: 3,
      featureDensity: 'normal',
    },
    {
      id: 'highland',
      name: 'Highlands',
      biome: 'highland',
      latitudeRange: [0.65, 0.82],
      terrainFeatures: ['cliff_faces'],
      settlements: [],
      dangerTier: 3,
      featureDensity: 'sparse',
    },
    {
      id: 'highlands',
      name: 'Peaks',
      biome: 'mountain',
      latitudeRange: [0.78, 1.0],
      terrainFeatures: ['steep_cliffs'],
      settlements: [],
      dangerTier: 4,
      featureDensity: 'sparse',
    },
  ],
  offRoadSettlements: [
    {
      id: 'hamlet-a',
      name: 'Hamlet A',
      type: 'hamlet',
      region: 'meadows',
      features: ['campfire'],
      population: 'tiny',
      roadConnection: 'path',
    },
    {
      id: 'hamlet-b',
      name: 'Hamlet B',
      type: 'hamlet',
      region: 'forest',
      features: ['campfire'],
      population: 'tiny',
      roadConnection: 'trail',
    },
    {
      id: 'outpost-c',
      name: 'Outpost C',
      type: 'outpost',
      region: 'moors',
      features: ['watchtower'],
      population: 'tiny',
      roadConnection: 'path',
    },
  ],
  terrainModifiers: {
    elongation: 1.8,
    coastlineNoise: 0.5,
    ridgeStrength: 0.6,
  },
};

// --- Phase profiling ---

describe('kingdom generation: phase profiling (128x256)', () => {
  it('profiles each phase and reports timing breakdown', () => {
    const phases: Record<string, number> = {};

    // Phase 1: Terrain
    const { elapsed: terrainTime, result: terrain } = timeMsResult(() =>
      generateTerrain('profile-seed', PROD_CONFIG),
    );
    phases['Phase 1: Terrain gen'] = terrainTime;

    // Phase 2: Region assignment (run within kingdom gen, estimate separately)
    // We approximate by running the full kingdom gen and subtracting known phases
    // But first let's measure individual components

    // Phase 3a: Main landmass detection
    const landmassTime = timeMs(() => {
      findMainLandmass(terrain);
    });
    phases['Phase 3a: Main landmass BFS'] = landmassTime;

    // Phase 3b: Anchor settlement placement
    const rng = mulberry32(cyrb128('profile-seed:roads'));
    const settlementTime = timeMs(() => {
      placeAnchorSettlements(terrain, PROD_CONFIG, rng);
    });
    phases['Phase 3b: Settlement placement'] = settlementTime;

    // Phase 3c: A* road network (includes settlement placement + pathfinding)
    const roadTime = timeMs(() => {
      generateRoadNetwork('profile-seed', terrain, PROD_CONFIG);
    });
    phases['Phase 3: Road network (total)'] = roadTime;

    // Phase 3d: Isolated A* pathfinding
    // Find two land tiles for pathfinding
    let startTile: [number, number] = [64, 200];
    let endTile: [number, number] = [64, 50];
    for (let y = 200; y > 0; y--) {
      if (terrain.tiles[y * terrain.width + 64].isLand) {
        startTile = [64, y];
        break;
      }
    }
    for (let y = 50; y < terrain.height; y++) {
      if (terrain.tiles[y * terrain.width + 64].isLand) {
        endTile = [64, y];
        break;
      }
    }
    const astarTime = timeMs(() => {
      findPath(terrain, startTile[0], startTile[1], endTile[0], endTile[1]);
    });
    phases['Phase 3d: Single A* (long path)'] = astarTime;

    // Full kingdom gen
    const fullTime = timeMs(() => {
      generateKingdom('profile-seed', PROD_CONFIG);
    });
    phases['TOTAL: Full generateKingdom'] = fullTime;

    // Report
    const report = Object.entries(phases)
      .map(([name, ms]) => `  ${name}: ${ms.toFixed(1)}ms`)
      .join('\n');
    console.log(`\n--- Kingdom Generation Profile (128x256) ---\n${report}\n`);

    // The total should be within our <2s budget
    // Use a generous threshold for CI
    expect(fullTime).toBeLessThan(2000);
  });
});

// --- Regression thresholds ---

describe('kingdom generation: regression thresholds', () => {
  it('full kingdom generation (128x256) completes in <2000ms', () => {
    const elapsed = timeMs(() => {
      generateKingdom('regression-seed', PROD_CONFIG);
    });
    expect(elapsed).toBeLessThan(2000);
  });

  it('terrain generation (128x256) completes in <500ms', () => {
    const elapsed = timeMs(() => {
      generateTerrain('regression-seed', PROD_CONFIG);
    });
    expect(elapsed).toBeLessThan(500);
  });

  it('road network generation completes in <1500ms', () => {
    const terrain = generateTerrain('regression-seed', PROD_CONFIG);
    const elapsed = timeMs(() => {
      generateRoadNetwork('regression-seed', terrain, PROD_CONFIG);
    });
    expect(elapsed).toBeLessThan(1500);
  });

  it('main landmass BFS completes in <50ms', () => {
    const terrain = generateTerrain('regression-seed', PROD_CONFIG);
    const elapsed = timeMs(() => {
      findMainLandmass(terrain);
    });
    expect(elapsed).toBeLessThan(50);
  });

  it('single long-distance A* path completes in <500ms', () => {
    const terrain = generateTerrain('regression-seed', PROD_CONFIG);
    // Find two land tiles
    let startY = 200;
    let endY = 50;
    for (let y = 200; y > 0; y--) {
      if (terrain.tiles[y * terrain.width + 64].isLand) {
        startY = y;
        break;
      }
    }
    for (let y = 50; y < terrain.height; y++) {
      if (terrain.tiles[y * terrain.width + 64].isLand) {
        endY = y;
        break;
      }
    }
    const elapsed = timeMs(() => {
      findPath(terrain, 64, startY, 64, endY);
    });
    expect(elapsed).toBeLessThan(500);
  });

  it('deterministic: same seed produces identical results', () => {
    const a = generateKingdom('determinism-check', PROD_CONFIG);
    const b = generateKingdom('determinism-check', PROD_CONFIG);
    expect(a.settlements.length).toBe(b.settlements.length);
    expect(a.roads.length).toBe(b.roads.length);
    for (let i = 0; i < a.settlements.length; i++) {
      expect(a.settlements[i].position).toEqual(b.settlements[i].position);
    }
  });
});

// --- Data size profiling ---

describe('kingdom generation: data size analysis', () => {
  it('reports tile counts and sizes for 128x256', () => {
    const kingdom = generateKingdom('size-seed', PROD_CONFIG);

    const totalTiles = kingdom.tiles.length;
    const landTiles = kingdom.tiles.filter((t) => t.isLand).length;
    const coastTiles = kingdom.tiles.filter((t) => t.isCoast).length;
    const roadTiles = kingdom.tiles.filter((t) => t.hasRoad).length;
    const riverTiles = kingdom.tiles.filter((t) => t.hasRiver).length;

    console.log(`\n--- Kingdom Data Size (128x256) ---`);
    console.log(`  Total tiles: ${totalTiles}`);
    console.log(
      `  Land tiles: ${landTiles} (${((landTiles / totalTiles) * 100).toFixed(1)}%)`,
    );
    console.log(`  Coast tiles: ${coastTiles}`);
    console.log(`  Road tiles: ${roadTiles}`);
    console.log(`  River tiles: ${riverTiles}`);
    console.log(`  Settlements: ${kingdom.settlements.length}`);
    console.log(`  Road segments: ${kingdom.roads.length}`);
    console.log(`  Rivers: ${kingdom.rivers.length}`);
    console.log(`  Regions: ${kingdom.regions.length}`);
    console.log('');

    expect(totalTiles).toBe(128 * 256);
    expect(landTiles).toBeGreaterThan(0);
    expect(kingdom.settlements.length).toBeGreaterThanOrEqual(6);
  });
});
