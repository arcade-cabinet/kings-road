/**
 * Kingdom generation pipeline benchmark.
 *
 * Times each phase individually for the production 128x256 grid.
 * Runs 3 iterations and reports averages + min/max.
 *
 * Run: pnpm test -- src/game/world/kingdom-gen.bench.ts
 */

import { describe, expect, it } from 'vitest';
import type { KingdomConfig } from '../../schemas/kingdom.schema';
import { cyrb128, mulberry32 } from '../utils/random';
import { findPath, generateRoadNetwork } from './road-network';
import { generateTerrain } from './terrain-gen';

// ── Load production config ─────────────────────────────────────────────
// Inline the production config to avoid dynamic import issues in vitest
const PROD_CONFIG: KingdomConfig = {
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
      features: ['home', 'tavern', 'blacksmith', 'stable'],
      preferredRegion: 'ashford-meadows',
      roadSpineProgress: 0,
    },
    {
      id: 'millbrook',
      name: 'Millbrook',
      type: 'town',
      mainQuestChapter: 'chapter-01',
      features: ['tavern', 'market', 'chapel', 'mill', 'stable'],
      preferredRegion: 'millbrook-forests',
      roadSpineProgress: 0.2,
    },
    {
      id: 'thornfield-ruins',
      name: 'Thornfield Ruins',
      type: 'ruin',
      mainQuestChapter: 'chapter-02',
      features: ['dungeon_entrance', 'camp'],
      preferredRegion: 'thornfield-hills',
      roadSpineProgress: 0.4,
    },
    {
      id: 'ravensgate',
      name: 'Ravensgate',
      type: 'city',
      mainQuestChapter: 'chapter-03',
      features: ['gate', 'prison', 'tavern', 'market', 'barracks', 'arena'],
      preferredRegion: 'ravensgate-moors',
      roadSpineProgress: 0.57,
    },
    {
      id: 'pilgrims-rest',
      name: "The Pilgrim's Rest",
      type: 'monastery',
      mainQuestChapter: 'chapter-04',
      features: ['chapel', 'garden', 'library', 'hospice'],
      preferredRegion: 'highland-pass',
      roadSpineProgress: 0.75,
    },
    {
      id: 'grailsend',
      name: 'Grailsend',
      type: 'ruin',
      mainQuestChapter: 'chapter-05',
      features: ['temple_entrance', 'guardian'],
      preferredRegion: 'grailsend-highlands',
      roadSpineProgress: 1,
    },
  ],
  regions: [
    {
      id: 'ashford-meadows',
      name: 'Ashford Meadows',
      biome: 'meadow',
      latitudeRange: [0.0, 0.18],
      terrainFeatures: ['rolling_hills'],
      settlements: ['ashford'],
      dangerTier: 0,
      featureDensity: 'normal',
    },
    {
      id: 'millbrook-forests',
      name: 'The Millwood',
      biome: 'forest',
      latitudeRange: [0.15, 0.38],
      terrainFeatures: ['dense_canopy'],
      settlements: ['millbrook'],
      dangerTier: 1,
      featureDensity: 'dense',
    },
    {
      id: 'thornfield-hills',
      name: 'Thornfield Hills',
      biome: 'hills',
      latitudeRange: [0.33, 0.52],
      terrainFeatures: ['rocky_outcrops'],
      settlements: ['thornfield-ruins'],
      dangerTier: 2,
      featureDensity: 'sparse',
    },
    {
      id: 'ravensgate-moors',
      name: 'The Bleakmoors',
      biome: 'moor',
      latitudeRange: [0.48, 0.68],
      terrainFeatures: ['boggy_hollows'],
      settlements: ['ravensgate'],
      dangerTier: 3,
      featureDensity: 'normal',
    },
    {
      id: 'highland-pass',
      name: "The Pilgrim's Way",
      biome: 'highland',
      latitudeRange: [0.65, 0.82],
      terrainFeatures: ['mountain_streams'],
      settlements: ['pilgrims-rest'],
      dangerTier: 3,
      featureDensity: 'sparse',
    },
    {
      id: 'grailsend-highlands',
      name: 'The Grailsend Highlands',
      biome: 'mountain',
      latitudeRange: [0.78, 1.0],
      terrainFeatures: ['steep_cliffs'],
      settlements: ['grailsend'],
      dangerTier: 4,
      featureDensity: 'sparse',
    },
    {
      id: 'western-coast',
      name: 'The Saltmarsh Coast',
      biome: 'coast',
      latitudeRange: [0.1, 0.5],
      longitudeRange: [0.0, 0.25],
      terrainFeatures: ['tidal_flats'],
      settlements: [],
      dangerTier: 1,
      featureDensity: 'normal',
    },
    {
      id: 'eastern-downs',
      name: 'The Chalk Downs',
      biome: 'farmland',
      latitudeRange: [0.1, 0.45],
      longitudeRange: [0.7, 1.0],
      terrainFeatures: ['chalk_cliffs'],
      settlements: [],
      dangerTier: 1,
      featureDensity: 'dense',
    },
    {
      id: 'deepwood',
      name: 'The Deepwood',
      biome: 'deep_forest',
      latitudeRange: [0.25, 0.5],
      longitudeRange: [0.15, 0.45],
      terrainFeatures: ['ancient_trees'],
      settlements: [],
      dangerTier: 2,
      featureDensity: 'dense',
    },
    {
      id: 'fenlands',
      name: 'The Fenlands',
      biome: 'swamp',
      latitudeRange: [0.5, 0.7],
      longitudeRange: [0.65, 0.95],
      terrainFeatures: ['reed_beds'],
      settlements: [],
      dangerTier: 3,
      featureDensity: 'normal',
    },
  ],
  offRoadSettlements: [
    {
      id: 'whitecliff',
      name: 'Whitecliff',
      type: 'port',
      region: 'western-coast',
      features: ['tavern', 'dock', 'fishmonger'],
      population: 'small',
      roadConnection: 'secondary',
    },
    {
      id: 'woodhaven',
      name: 'Woodhaven',
      type: 'hamlet',
      region: 'deepwood',
      features: ['campfire', 'woodcutter'],
      population: 'tiny',
      roadConnection: 'trail',
    },
    {
      id: 'barrowfield',
      name: 'Barrowfield',
      type: 'hamlet',
      region: 'eastern-downs',
      features: ['tavern', 'shrine'],
      population: 'tiny',
      roadConnection: 'path',
    },
    {
      id: 'fenwatch',
      name: 'Fenwatch',
      type: 'outpost',
      region: 'fenlands',
      features: ['watchtower', 'barracks'],
      population: 'tiny',
      roadConnection: 'path',
    },
    {
      id: 'saltmarsh',
      name: 'Saltmarsh',
      type: 'village',
      region: 'western-coast',
      features: ['tavern', 'market', 'dock'],
      population: 'small',
      roadConnection: 'secondary',
    },
    {
      id: 'cairnholm',
      name: 'Cairnholm',
      type: 'hamlet',
      region: 'thornfield-hills',
      features: ['shrine', 'herbalist'],
      population: 'tiny',
      roadConnection: 'trail',
    },
    {
      id: 'eagles-perch',
      name: "Eagle's Perch",
      type: 'outpost',
      region: 'grailsend-highlands',
      features: ['campfire', 'ranger_post'],
      population: 'tiny',
      roadConnection: 'trail',
    },
    {
      id: 'millbrook-crossing',
      name: 'The Crossing',
      type: 'hamlet',
      region: 'millbrook-forests',
      features: ['ferry', 'campfire'],
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

// ── Smaller test config (64x128) for comparison ────────────────────────
const SMALL_CONFIG: KingdomConfig = {
  ...PROD_CONFIG,
  width: 64,
  height: 128,
};

const ITERATIONS = 3;
const SEED = 'benchmark-seed-2026';

// ── Phase timing helpers ───────────────────────────────────────────────

interface PhaseTimings {
  terrain: number;
  regionAssignment: number;
  roadNetwork: number;
  offRoadSettlements: number;
  secondaryRoads: number;
  tileAssembly: number;
  total: number;
}

/**
 * Run the full pipeline with per-phase timing.
 * Mirrors the structure of generateKingdom() but instruments each phase.
 */
function timedGenerateKingdom(
  seed: string,
  config: KingdomConfig,
): PhaseTimings {
  const timings: PhaseTimings = {
    terrain: 0,
    regionAssignment: 0,
    roadNetwork: 0,
    offRoadSettlements: 0,
    secondaryRoads: 0,
    tileAssembly: 0,
    total: 0,
  };

  const totalStart = performance.now();

  // Phase 1: Terrain
  let t0 = performance.now();
  const terrain = generateTerrain(seed, config);
  timings.terrain = performance.now() - t0;

  // Phase 2: Region assignment (inline from kingdom-gen.ts)
  t0 = performance.now();
  const authoredRegions = config.regions ?? [];
  const regionMap = new Map<number, string>();
  const { width, height } = terrain;
  for (const region of authoredRegions) {
    const [latMin, latMax] = region.latitudeRange;
    const [lonMin, lonMax] = region.longitudeRange ?? [0, 1];
    const yMax = Math.floor((1 - latMin) * height);
    const yMin = Math.floor((1 - latMax) * height);
    const xMin = Math.floor(lonMin * width);
    const xMax = Math.floor(lonMax * width);
    for (let y = Math.max(0, yMin); y < Math.min(height, yMax); y++) {
      for (let x = Math.max(0, xMin); x < Math.min(width, xMax); x++) {
        const idx = y * width + x;
        if (terrain.tiles[idx].isLand) {
          regionMap.set(idx, region.id);
        }
      }
    }
  }
  // Build region objects
  for (const authored of authoredRegions) {
    let minX = width,
      maxX = 0,
      minY = height,
      maxY = 0;
    for (const [idx, regionId] of regionMap) {
      if (regionId === authored.id) {
        const x = idx % width;
        const y = Math.floor(idx / width);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  timings.regionAssignment = performance.now() - t0;

  // Phase 3: Road network (includes settlement placement + A* for King's Road)
  t0 = performance.now();
  const roadNetwork = generateRoadNetwork(seed, terrain, config);
  timings.roadNetwork = performance.now() - t0;

  // Phase 4: Off-road settlement placement
  t0 = performance.now();
  const rng = mulberry32(cyrb128(`${seed}:kingdom`));
  const offRoadConfigs = config.offRoadSettlements ?? [];
  const offRoadPlaced: Array<{
    id: string;
    position: [number, number];
    type: string;
  }> = [];
  for (const settlement of offRoadConfigs) {
    const candidates: [number, number][] = [];
    for (const [idx, regionId] of regionMap) {
      if (regionId === settlement.region) {
        const tile = terrain.tiles[idx];
        if (tile.isLand && !tile.isCoast && tile.elevation < 0.65) {
          candidates.push([idx % width, Math.floor(idx / width)]);
        }
      }
    }
    if (candidates.length === 0) continue;
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < Math.min(candidates.length, 200); i++) {
      const ci =
        candidates.length > 200 ? Math.floor(rng() * candidates.length) : i;
      const [cx, cy] = candidates[ci];
      let score = rng() * 3;
      let minDist = Infinity;
      for (const existing of [...roadNetwork.settlements, ...offRoadPlaced]) {
        const d =
          Math.abs(cx - existing.position[0]) +
          Math.abs(cy - existing.position[1]);
        if (d < minDist) minDist = d;
      }
      if (minDist < 5) score -= 50;
      else if (minDist < 10) score += 2;
      else if (minDist > 30) score -= 5;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = ci;
      }
    }
    const [px, py] = candidates[bestIdx];
    offRoadPlaced.push({
      id: settlement.id,
      position: [px, py],
      type: settlement.type,
    });
  }
  timings.offRoadSettlements = performance.now() - t0;

  // Phase 5: Secondary roads (A* from each off-road settlement to nearest road tile)
  t0 = performance.now();
  for (const settlement of offRoadPlaced) {
    const cfg = offRoadConfigs.find((c) => c.id === settlement.id);
    if (!cfg || cfg.roadConnection === 'none') continue;
    let nearestRoadTile: [number, number] | null = null;
    let nearestDist = Infinity;
    for (const [idx] of roadNetwork.roadTiles) {
      const rx = idx % width;
      const ry = Math.floor(idx / width);
      const dist =
        Math.abs(rx - settlement.position[0]) +
        Math.abs(ry - settlement.position[1]);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestRoadTile = [rx, ry];
      }
    }
    if (!nearestRoadTile) continue;
    findPath(
      terrain,
      settlement.position[0],
      settlement.position[1],
      nearestRoadTile[0],
      nearestRoadTile[1],
    );
  }
  timings.secondaryRoads = performance.now() - t0;

  // Phase 6: Tile assembly (biome painting + road overlay)
  t0 = performance.now();
  const allRoadTiles = new Map(roadNetwork.roadTiles);
  const _tiles = terrain.tiles.map((t, idx) => {
    const regionId = regionMap.get(idx) ?? null;
    let biome = t.biome;
    if (regionId && t.isLand && !t.isCoast) {
      const authoredRegion = authoredRegions.find((r) => r.id === regionId);
      if (authoredRegion) {
        if (
          t.elevation < config.mountainLevel ||
          authoredRegion.biome === 'mountain'
        ) {
          biome = authoredRegion.biome;
        }
      }
    }
    const roadType = allRoadTiles.get(idx);
    return {
      x: t.x,
      y: t.y,
      elevation: t.elevation,
      moisture: t.moisture,
      biome,
      isLand: t.isLand,
      isCoast: t.isCoast,
      hasRiver: t.hasRiver,
      hasRoad: !!roadType,
      roadType: roadType ?? undefined,
    };
  });
  timings.tileAssembly = performance.now() - t0;

  timings.total = performance.now() - totalStart;
  return timings;
}

function average(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function _formatRow(label: string, times: number[]): string {
  const avg = average(times);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const _pctOfTotal = 0; // filled later
  return `| ${label.padEnd(24)} | ${avg.toFixed(1).padStart(8)} ms | ${min.toFixed(1).padStart(8)} ms | ${max.toFixed(1).padStart(8)} ms |`;
}

// ── Benchmark tests ────────────────────────────────────────────────────

describe('Kingdom Generation Benchmark', () => {
  it(`production grid (128x256) — ${ITERATIONS} iterations`, () => {
    const allTimings: PhaseTimings[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
      const t = timedGenerateKingdom(`${SEED}-${i}`, PROD_CONFIG);
      allTimings.push(t);
    }

    // Collect per-phase arrays
    const phases: Record<string, number[]> = {
      terrain: allTimings.map((t) => t.terrain),
      regionAssignment: allTimings.map((t) => t.regionAssignment),
      roadNetwork: allTimings.map((t) => t.roadNetwork),
      offRoadSettlements: allTimings.map((t) => t.offRoadSettlements),
      secondaryRoads: allTimings.map((t) => t.secondaryRoads),
      tileAssembly: allTimings.map((t) => t.tileAssembly),
      total: allTimings.map((t) => t.total),
    };

    const avgTotal = average(phases.total);

    // Print results table
    console.log('\n=== PRODUCTION GRID (128x256 = 32,768 tiles) ===');
    console.log(`Iterations: ${ITERATIONS}, Seed base: ${SEED}`);
    console.log('');
    console.log(
      '| Phase                    |    Avg     |    Min     |    Max     | % Total |',
    );
    console.log(
      '|--------------------------|------------|------------|------------|---------|',
    );

    const phaseLabels: [string, keyof PhaseTimings][] = [
      ['1. Terrain gen', 'terrain'],
      ['2. Region assignment', 'regionAssignment'],
      ['3. Road network (A*)', 'roadNetwork'],
      ['4. Off-road settlements', 'offRoadSettlements'],
      ['5. Secondary roads (A*)', 'secondaryRoads'],
      ['6. Tile assembly', 'tileAssembly'],
    ];

    for (const [label, key] of phaseLabels) {
      const times = phases[key];
      const avg = average(times);
      const min = Math.min(...times);
      const max = Math.max(...times);
      const pct = ((avg / avgTotal) * 100).toFixed(1);
      console.log(
        `| ${label.padEnd(24)} | ${avg.toFixed(1).padStart(8)} ms | ${min.toFixed(1).padStart(8)} ms | ${max.toFixed(1).padStart(8)} ms | ${pct.padStart(5)}%  |`,
      );
    }

    console.log(
      '|--------------------------|------------|------------|------------|---------|',
    );
    console.log(
      `| ${'TOTAL'.padEnd(24)} | ${avgTotal.toFixed(1).padStart(8)} ms | ${Math.min(
        ...phases.total,
      )
        .toFixed(1)
        .padStart(8)} ms | ${Math.max(...phases.total)
        .toFixed(1)
        .padStart(8)} ms | 100.0%  |`,
    );
    console.log('');

    // Identify bottleneck
    let bottleneckPhase = '';
    let bottleneckTime = 0;
    for (const [label, key] of phaseLabels) {
      const avg = average(phases[key]);
      if (avg > bottleneckTime) {
        bottleneckTime = avg;
        bottleneckPhase = label;
      }
    }
    const bottleneckPct = ((bottleneckTime / avgTotal) * 100).toFixed(1);
    console.log(
      `BOTTLENECK: ${bottleneckPhase} — ${bottleneckTime.toFixed(1)}ms (${bottleneckPct}% of total)`,
    );
    console.log('');

    // Budget check: 2 seconds for production grid
    console.log(
      `TARGET: < 2000ms | ACTUAL: ${avgTotal.toFixed(1)}ms | ${avgTotal < 2000 ? 'PASS' : 'FAIL'}`,
    );
    console.log('');

    // This assertion documents the result but uses a generous bound
    // so CI doesn't flake on slow runners. The console output above
    // is the real report.
    expect(avgTotal).toBeLessThan(30000);
  });

  it(`small grid (64x128) — ${ITERATIONS} iterations (baseline comparison)`, () => {
    const allTimings: PhaseTimings[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
      const t = timedGenerateKingdom(`${SEED}-small-${i}`, SMALL_CONFIG);
      allTimings.push(t);
    }

    const phases: Record<string, number[]> = {
      terrain: allTimings.map((t) => t.terrain),
      regionAssignment: allTimings.map((t) => t.regionAssignment),
      roadNetwork: allTimings.map((t) => t.roadNetwork),
      offRoadSettlements: allTimings.map((t) => t.offRoadSettlements),
      secondaryRoads: allTimings.map((t) => t.secondaryRoads),
      tileAssembly: allTimings.map((t) => t.tileAssembly),
      total: allTimings.map((t) => t.total),
    };

    const avgTotal = average(phases.total);

    console.log('\n=== SMALL GRID (64x128 = 8,192 tiles) ===');
    console.log(`Iterations: ${ITERATIONS}`);
    console.log('');
    console.log(
      '| Phase                    |    Avg     |    Min     |    Max     |',
    );
    console.log(
      '|--------------------------|------------|------------|------------|',
    );

    const phaseLabels: [string, keyof PhaseTimings][] = [
      ['1. Terrain gen', 'terrain'],
      ['2. Region assignment', 'regionAssignment'],
      ['3. Road network (A*)', 'roadNetwork'],
      ['4. Off-road settlements', 'offRoadSettlements'],
      ['5. Secondary roads (A*)', 'secondaryRoads'],
      ['6. Tile assembly', 'tileAssembly'],
    ];

    for (const [label, key] of phaseLabels) {
      const times = phases[key];
      const avg = average(times);
      const min = Math.min(...times);
      const max = Math.max(...times);
      console.log(
        `| ${label.padEnd(24)} | ${avg.toFixed(1).padStart(8)} ms | ${min.toFixed(1).padStart(8)} ms | ${max.toFixed(1).padStart(8)} ms |`,
      );
    }

    console.log(
      '|--------------------------|------------|------------|------------|',
    );
    console.log(
      `| ${'TOTAL'.padEnd(24)} | ${avgTotal.toFixed(1).padStart(8)} ms | ${Math.min(
        ...phases.total,
      )
        .toFixed(1)
        .padStart(8)} ms | ${Math.max(...phases.total)
        .toFixed(1)
        .padStart(8)} ms |`,
    );
    console.log('');

    // Scaling factor
    const prodTile = 128 * 256;
    const smallTile = 64 * 128;
    console.log(
      `Grid scaling factor: ${(prodTile / smallTile).toFixed(1)}x tiles`,
    );
    console.log('');
  });

  it('A* priority queue analysis — open set sizes', () => {
    // The A* in road-network.ts uses a sorted-array priority queue.
    // With an unsorted array + linear scan for min, extraction is O(n).
    // Let's measure how large the open set gets for the production grid.
    const terrain = generateTerrain(SEED, PROD_CONFIG);
    const roadNetwork = generateRoadNetwork(SEED, terrain, PROD_CONFIG);

    // Count total road tiles across all King's Road segments
    const totalRoadTiles = roadNetwork.roadTiles.size;
    const numSegments = roadNetwork.roads.length;

    console.log('\n=== A* ANALYSIS ===');
    console.log(`King's Road segments: ${numSegments}`);
    console.log(`Total road tiles: ${totalRoadTiles}`);
    console.log(
      `Grid size: ${PROD_CONFIG.width}x${PROD_CONFIG.height} = ${PROD_CONFIG.width * PROD_CONFIG.height} tiles`,
    );
    console.log('');
    console.log(
      'The A* open set uses linear scan for min extraction (O(n) per pop).',
    );
    console.log(
      'With grid size 32,768, worst-case open set can grow to thousands of entries.',
    );
    console.log('A binary heap would reduce extraction from O(n) to O(log n).');
    console.log('');

    // Measure individual A* segment times
    console.log('| Segment                        | Path len | Time (ms) |');
    console.log('|--------------------------------|----------|-----------|');

    for (let i = 0; i < roadNetwork.settlements.length - 1; i++) {
      const from = roadNetwork.settlements[i];
      const to = roadNetwork.settlements[i + 1];

      const t0 = performance.now();
      const path = findPath(
        terrain,
        from.position[0],
        from.position[1],
        to.position[0],
        to.position[1],
      );
      const elapsed = performance.now() - t0;

      const label = `${from.id} -> ${to.id}`;
      const pathLen = path ? path.length : 0;
      console.log(
        `| ${label.padEnd(30)} | ${String(pathLen).padStart(8)} | ${elapsed.toFixed(1).padStart(9)} |`,
      );
    }
    console.log('');

    expect(roadNetwork.roads.length).toBeGreaterThan(0);
  });
});
