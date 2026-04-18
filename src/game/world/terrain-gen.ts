/**
 * Procedural terrain generator for the kingdom map.
 *
 * Generates a Britain-shaped island with:
 * - Elongated landmass with irregular coastline
 * - Mountain ridges running roughly north-south
 * - Lowlands, meadows, forests, moors
 * - Moisture from proximity to coast and elevation
 * - Biome classification from elevation × moisture
 *
 * All functions are pure and deterministic from seed.
 */

import type { KingdomBiome, KingdomConfig } from '../../schemas/kingdom.schema';
import { cyrb128 } from '../utils/random';
import { createSimplex2D, fbm, ridgeNoise } from './simplex';

// ── Output types ───────────────────────────────────────────────────────

export interface TerrainTile {
  x: number;
  y: number;
  elevation: number; // 0-1
  moisture: number; // 0-1
  biome: KingdomBiome;
  isLand: boolean;
  isCoast: boolean;
  hasRiver: boolean;
}

export interface TerrainData {
  width: number;
  height: number;
  tiles: TerrainTile[];
  rivers: Array<{
    path: [number, number][];
    width: 'stream' | 'river' | 'wide';
  }>;
}

// ── Island mask ────────────────────────────────────────────────────────

/**
 * Generate an elongated island mask shaped like Britain.
 * Returns a value 0-1 where 1 = definitely land, 0 = definitely ocean.
 * Uses distance from center with noise for irregular coastline.
 */
function islandMask(
  nx: number, // normalized x: -1 to 1
  ny: number, // normalized y: -1 to 1
  noise: (x: number, y: number) => number,
  config: { elongation: number; coastlineNoise: number },
): number {
  // Elongate vertically (Britain is tall and narrow)
  const ex = nx * config.elongation;
  const ey = ny;

  // Elliptical distance from center (wider horizontally for more land mass)
  const d = Math.sqrt(ex * ex * 1.4 + ey * ey);

  // Add noise to coastline for irregular shape
  const coastNoise =
    fbm(noise, nx * 3 + 100, ny * 3 + 100, 4) * config.coastlineNoise * 0.4;

  // Scotland bulge (wider at the top)
  const topBulge = ny < -0.3 ? (1 - Math.abs(ny + 0.5) * 1.5) * 0.15 : 0;

  // Wales/Cornwall peninsula bumps
  const westBump =
    ny > 0 && ny < 0.4 && nx < -0.1 ? (1 - Math.abs(ny - 0.2) * 3) * 0.08 : 0;

  // Narrowing at the "waist" (like between England and Scotland)
  const waist = Math.abs(ny + 0.15) < 0.1 ? -0.06 : 0;

  // Combine: lower distance = more likely land
  // Scale factor controls island size — lower = larger island
  const landValue = 1 - d * 1.05 + coastNoise + topBulge + westBump + waist;

  return Math.max(0, Math.min(1, landValue));
}

// ── Elevation generation ───────────────────────────────────────────────

/**
 * Generate elevation for a tile.
 * Combines base terrain noise with mountain ridges.
 */
function generateElevation(
  nx: number,
  ny: number,
  landMask: number,
  baseNoise: (x: number, y: number) => number,
  ridgeNoiseFunc: (x: number, y: number) => number,
  ridgeStrength: number,
): number {
  if (landMask <= 0) return 0;

  // Base terrain: gentle rolling hills
  const base = (fbm(baseNoise, nx * 4, ny * 4, 5) + 1) * 0.5;

  // Mountain ridges: run roughly north-south with some wander
  // Offset x slightly with noise so ridges aren't perfectly straight
  const ridgeX = nx + fbm(ridgeNoiseFunc, nx * 2 + 50, ny * 2 + 50, 3) * 0.15;
  const ridge =
    ridgeNoise(ridgeNoiseFunc, ridgeX * 6, ny * 3, 4) * ridgeStrength;

  // Highland bias in the north (Scotland)
  const highlandBias = ny < -0.2 ? (0.2 - ny - 0.2) * 0.3 : 0;

  // Combine and modulate by land mask (edges are lower = coastal)
  const raw =
    (base * 0.5 + ridge * 0.4 + highlandBias) * Math.min(1, landMask * 2);

  return Math.max(0, Math.min(1, raw));
}

// ── Moisture generation ────────────────────────────────────────────────

/**
 * Generate moisture for a tile.
 * Based on distance from coast (closer = wetter), elevation (mountains block rain),
 * and noise for local variation.
 */
function generateMoisture(
  nx: number,
  ny: number,
  elevation: number,
  coastDistance: number,
  moistureNoise: (x: number, y: number) => number,
): number {
  // Coastal proximity: closer to coast = wetter (prevailing westerlies)
  const coastMoisture = Math.max(0, 1 - coastDistance * 0.15);

  // Western side is wetter (prevailing winds off the ocean)
  const westBias = Math.max(0, -nx * 0.2 + 0.1);

  // Elevation: mountains are drier on lee side, wetter on windward
  const elevationEffect = elevation > 0.6 ? -(elevation - 0.6) * 0.5 : 0;

  // Noise for local variation (bogs, dry patches)
  const localNoise =
    (fbm(moistureNoise, nx * 5 + 200, ny * 5 + 200, 3) + 1) * 0.25;

  const raw = coastMoisture + westBias + elevationEffect + localNoise;
  return Math.max(0, Math.min(1, raw));
}

// ── Biome classification ───────────────────────────────────────────────

/**
 * Classify biome from elevation and moisture (Whittaker diagram style).
 */
function classifyBiome(
  elevation: number,
  moisture: number,
  isCoast: boolean,
): KingdomBiome {
  if (!isCoast && elevation < 0.05) return 'ocean';
  if (isCoast) return 'coast';

  // Mountains (high elevation)
  if (elevation > 0.75) return 'mountain';
  if (elevation > 0.65) return 'highland';

  // Hills (medium-high elevation)
  if (elevation > 0.5) {
    if (moisture > 0.6) return 'moor';
    return 'hills';
  }

  // Lowlands
  if (moisture > 0.75) return 'swamp';
  if (moisture > 0.55) {
    if (elevation > 0.3) return 'deep_forest';
    return 'forest';
  }
  if (moisture > 0.35) {
    if (elevation < 0.2) return 'riverside';
    return 'meadow';
  }

  // Drier lowlands
  return 'farmland';
}

// ── Coast distance calculation ─────────────────────────────────────────

/**
 * Compute distance from each land tile to the nearest ocean tile.
 * Uses a BFS flood fill from ocean edges for efficiency.
 */
function computeCoastDistance(
  width: number,
  height: number,
  isLandGrid: boolean[],
): Float32Array {
  const dist = new Float32Array(width * height).fill(Infinity);
  const queue: [number, number][] = [];

  // Seed BFS from all ocean tiles adjacent to land
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!isLandGrid[idx]) {
        dist[idx] = 0;
        // Check if adjacent to land
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const nx = x + dx;
          const ny2 = y + dy;
          if (nx >= 0 && nx < width && ny2 >= 0 && ny2 < height) {
            if (isLandGrid[ny2 * width + nx]) {
              queue.push([x, y]);
              break;
            }
          }
        }
      }
    }
  }

  // BFS
  let head = 0;
  while (head < queue.length) {
    const [cx, cy] = queue[head++];
    const currentDist = dist[cy * width + cx];

    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nx = cx + dx;
      const ny2 = cy + dy;
      if (nx >= 0 && nx < width && ny2 >= 0 && ny2 < height) {
        const nIdx = ny2 * width + nx;
        const newDist = currentDist + 1;
        if (newDist < dist[nIdx]) {
          dist[nIdx] = newDist;
          queue.push([nx, ny2]);
        }
      }
    }
  }

  return dist;
}

// ── River generation ───────────────────────────────────────────────────

interface RiverPath {
  path: [number, number][];
  width: 'stream' | 'river' | 'wide';
}

/**
 * Generate rivers that flow from highlands to coast following elevation gradient.
 * Uses gradient descent from randomly selected high points.
 */
function generateRivers(
  width: number,
  height: number,
  elevations: Float32Array,
  isLandGrid: boolean[],
  seed: number,
  maxRivers: number = 8,
): RiverPath[] {
  const rivers: RiverPath[] = [];
  const usedTiles = new Set<number>();

  // Simple LCG for deterministic river source selection
  let s = seed;
  const _rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s >>> 0) / 4294967296;
  };

  // Find candidate high points for river sources
  // Use a lower threshold so rivers form even on gentle terrain
  const candidates: [number, number, number][] = []; // [x, y, elevation]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (isLandGrid[idx] && elevations[idx] > 0.35) {
        candidates.push([x, y, elevations[idx]]);
      }
    }
  }

  // Sort by elevation descending, pick sources with spacing
  candidates.sort((a, b) => b[2] - a[2]);

  for (const [sx, sy] of candidates) {
    if (rivers.length >= maxRivers) break;

    // Skip if too close to existing river source
    const sourceIdx = sy * width + sx;
    if (usedTiles.has(sourceIdx)) continue;

    // Trace path downhill
    const path: [number, number][] = [[sx, sy]];
    let cx = sx;
    let cy = sy;
    const visited = new Set<number>();
    visited.add(cy * width + cx);

    for (let step = 0; step < 500; step++) {
      // Find lowest neighbor
      let bestX = cx;
      let bestY = cy;
      let bestElev = elevations[cy * width + cx];

      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx;
          if (!visited.has(nIdx) && elevations[nIdx] < bestElev) {
            bestElev = elevations[nIdx];
            bestX = nx;
            bestY = ny;
          }
        }
      }

      // Stuck — nowhere downhill
      if (bestX === cx && bestY === cy) break;

      cx = bestX;
      cy = bestY;
      const idx = cy * width + cx;
      visited.add(idx);
      path.push([cx, cy]);

      // Reached ocean
      if (!isLandGrid[idx]) break;
    }

    // Only keep rivers that are long enough and reach the ocean
    if (path.length >= 8) {
      // Mark tiles as used
      for (const [px, py] of path) {
        usedTiles.add(py * width + px);
      }

      const riverWidth: 'stream' | 'river' | 'wide' =
        path.length > 40 ? 'wide' : path.length > 20 ? 'river' : 'stream';

      rivers.push({ path, width: riverWidth });
    }
  }

  return rivers;
}

// ── Main terrain generator ─────────────────────────────────────────────

/**
 * Generate the complete terrain for a kingdom.
 * Deterministic: same seed + config always produces identical terrain.
 *
 * @param seed - String seed for deterministic generation
 * @param config - Kingdom configuration parameters
 * @returns TerrainData with all tiles, biomes, and rivers
 */
export function generateTerrain(
  seed: string,
  config: KingdomConfig,
): TerrainData {
  const { width, height, seaLevel } = config;
  const modifiers = config.terrainModifiers ?? {
    elongation: 1.5,
    coastlineNoise: 0.5,
    ridgeStrength: 0.6,
  };

  // Create noise functions from seed
  const baseSeed = cyrb128(`${seed}:terrain`);
  const baseNoise = createSimplex2D(baseSeed);
  const ridgeNoiseSeed = cyrb128(`${seed}:ridges`);
  const ridgeNoiseFunc = createSimplex2D(ridgeNoiseSeed);
  const coastNoiseSeed = cyrb128(`${seed}:coast`);
  const coastNoise = createSimplex2D(coastNoiseSeed);
  const moistureSeed = cyrb128(`${seed}:moisture`);
  const moistureNoise = createSimplex2D(moistureSeed);

  // Phase 1: Generate land mask and raw elevation
  const isLandGrid = new Array<boolean>(width * height);
  const elevations = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      // Normalize coordinates to [-1, 1]
      const nx = (x / width) * 2 - 1;
      const ny = (y / height) * 2 - 1;

      // Island mask determines land vs ocean
      const mask = islandMask(nx, ny, coastNoise, {
        elongation: modifiers.elongation,
        coastlineNoise: modifiers.coastlineNoise,
      });

      isLandGrid[idx] = mask > seaLevel;

      // Elevation (only meaningful on land)
      if (isLandGrid[idx]) {
        elevations[idx] = generateElevation(
          nx,
          ny,
          mask,
          baseNoise,
          ridgeNoiseFunc,
          modifiers.ridgeStrength,
        );
      } else {
        elevations[idx] = 0;
      }
    }
  }

  // Phase 2: Coast detection and distance
  const coastDist = computeCoastDistance(width, height, isLandGrid);

  // Phase 3: Generate rivers
  const riverSeed = cyrb128(`${seed}:rivers`);
  const rivers = generateRivers(
    width,
    height,
    elevations,
    isLandGrid,
    riverSeed,
  );

  // Mark river tiles
  const riverTiles = new Set<number>();
  for (const river of rivers) {
    for (const [rx, ry] of river.path) {
      const idx = ry * width + rx;
      if (isLandGrid[idx]) riverTiles.add(idx);
    }
  }

  // Phase 4: Generate moisture and classify biomes
  const tiles: TerrainTile[] = new Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const nx = (x / width) * 2 - 1;
      const ny = (y / height) * 2 - 1;
      const isLand = isLandGrid[idx];
      const elevation = elevations[idx];

      // Coast detection: land tile adjacent to ocean
      let isCoast = false;
      if (isLand) {
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const nx2 = x + dx;
          const ny2 = y + dy;
          if (nx2 >= 0 && nx2 < width && ny2 >= 0 && ny2 < height) {
            if (!isLandGrid[ny2 * width + nx2]) {
              isCoast = true;
              break;
            }
          }
        }
      }

      // Moisture
      const moisture = isLand
        ? generateMoisture(nx, ny, elevation, coastDist[idx], moistureNoise)
        : 0;

      // River proximity increases moisture
      const hasRiver = riverTiles.has(idx);
      const adjustedMoisture = hasRiver
        ? Math.min(1, moisture + 0.2)
        : moisture;

      // Biome
      const biome: KingdomBiome = isLand
        ? classifyBiome(elevation, adjustedMoisture, isCoast)
        : 'ocean';

      tiles[idx] = {
        x,
        y,
        elevation,
        moisture: adjustedMoisture,
        biome,
        isLand,
        isCoast,
        hasRiver,
      };
    }
  }

  return { width, height, tiles, rivers };
}

/**
 * Get a terrain tile at grid coordinates.
 * Returns undefined for out-of-bounds coordinates.
 */
export function getTile(
  terrain: TerrainData,
  x: number,
  y: number,
): TerrainTile | undefined {
  if (x < 0 || x >= terrain.width || y < 0 || y >= terrain.height) {
    return undefined;
  }
  return terrain.tiles[y * terrain.width + x];
}

/**
 * Count land tiles in the terrain grid.
 */
export function countLandTiles(terrain: TerrainData): number {
  return terrain.tiles.filter((t) => t.isLand).length;
}
