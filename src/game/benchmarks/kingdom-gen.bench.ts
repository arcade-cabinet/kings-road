import { bench, describe } from 'vitest';
import type { KingdomConfig } from '../../schemas/kingdom.schema';
import { generateKingdom } from '../world/kingdom-gen';
import { findPath, generateRoadNetwork } from '../world/road-network';
import { generateTerrain } from '../world/terrain-gen';

// Production config (128x256)
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

// Smaller config for faster iteration
const SMALL_CONFIG: KingdomConfig = {
  ...PROD_CONFIG,
  width: 64,
  height: 128,
};

describe('Kingdom Generation Pipeline (128x256 production)', () => {
  bench(
    'full generateKingdom (128x256)',
    () => {
      generateKingdom('bench-seed', PROD_CONFIG);
    },
    { time: 5000, warmupTime: 500, warmupIterations: 1, throws: false },
  );
});

describe('Kingdom Generation Pipeline (64x128 half-size)', () => {
  bench(
    'full generateKingdom (64x128)',
    () => {
      generateKingdom('bench-seed', SMALL_CONFIG);
    },
    { time: 5000, warmupTime: 500, warmupIterations: 1, throws: false },
  );
});

describe('Phase Breakdown (128x256)', () => {
  bench(
    'Phase 1: terrain generation',
    () => {
      generateTerrain('bench-seed', PROD_CONFIG);
    },
    { time: 5000, warmupTime: 500, warmupIterations: 1, throws: false },
  );

  // Generate terrain once for road benchmarks
  const terrain = generateTerrain('bench-seed', PROD_CONFIG);

  bench(
    'Phase 3: road network (settlement placement + A* pathfinding)',
    () => {
      generateRoadNetwork('bench-seed', terrain, PROD_CONFIG);
    },
    { time: 5000, warmupTime: 500, warmupIterations: 1, throws: false },
  );
});

describe('A* Pathfinding Isolation', () => {
  const terrain = generateTerrain('bench-seed', PROD_CONFIG);

  // Find two land tiles to pathfind between
  const startX = 64;
  let startY = 200;
  const endX = 64;
  let endY = 50;

  // Adjust to land tiles
  for (let y = 200; y > 0; y--) {
    const tile = terrain.tiles[y * terrain.width + 64];
    if (tile.isLand) {
      startY = y;
      break;
    }
  }
  for (let y = 50; y < terrain.height; y++) {
    const tile = terrain.tiles[y * terrain.width + 64];
    if (tile.isLand) {
      endY = y;
      break;
    }
  }

  bench(
    'single A* path (long distance)',
    () => {
      findPath(terrain, startX, startY, endX, endY);
    },
    { time: 5000, warmupTime: 500, warmupIterations: 1, throws: false },
  );

  bench(
    'single A* path (short distance ~30 tiles)',
    () => {
      findPath(terrain, startX, startY, startX + 15, startY - 15);
    },
    { time: 3000, warmupTime: 300, warmupIterations: 1, throws: false },
  );
});
