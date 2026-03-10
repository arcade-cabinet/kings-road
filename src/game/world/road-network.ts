/**
 * Road network generator for the kingdom map.
 *
 * Generates a multi-tier road network across the terrain:
 * 1. King's Road (highway) — A* pathfinding between anchor settlements
 * 2. Secondary roads — branches connecting off-road settlements
 * 3. Paths and trails — minor connections between features
 *
 * All functions are pure and deterministic from seed + terrain.
 */

import type { KingdomConfig, RoadType } from '../../schemas/kingdom.schema';
import { cyrb128, mulberry32 } from '../utils/random';
import type { TerrainData, TerrainTile } from './terrain-gen';
import { getTile } from './terrain-gen';

// ── Output types ───────────────────────────────────────────────────────

export interface PlacedSettlement {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  mainQuestChapter?: string;
  description?: string;
  features: string[];
  /** Whether this is on the King's Road */
  isAnchor: boolean;
}

export interface RoadSegment {
  id: string;
  type: RoadType;
  from: [number, number];
  to: [number, number];
  /** Grid tiles the road passes through (in order) */
  path: [number, number][];
  /** Settlement IDs this road connects */
  connectsSettlements: [string, string];
}

export interface RoadNetwork {
  settlements: PlacedSettlement[];
  roads: RoadSegment[];
  /** Set of tile indices that have roads (for fast lookup) */
  roadTiles: Map<number, RoadType>;
}

// ── A* pathfinding ────────────────────────────────────────────────────

/** Movement cost for traversing a tile based on terrain */
function tileCost(tile: TerrainTile): number {
  if (!tile.isLand) return Infinity;
  // Base cost
  let cost = 1;
  // Uphill penalty: steeper = more expensive
  cost += tile.elevation * 3;
  // Mountains are very expensive
  if (tile.elevation > 0.7) cost += 10;
  // Swamp is slow
  if (tile.biome === 'swamp') cost += 3;
  // Deep forest is harder to traverse
  if (tile.biome === 'deep_forest') cost += 1.5;
  return cost;
}

/** Transition cost between two adjacent tiles (gradient penalty) */
function transitionCost(from: TerrainTile, to: TerrainTile): number {
  const elevDiff = to.elevation - from.elevation;
  // Uphill costs more than downhill
  const gradientPenalty = elevDiff > 0 ? elevDiff * 8 : Math.abs(elevDiff) * 2;
  return tileCost(to) + gradientPenalty;
}

/** Chebyshev distance heuristic for 8-directional A* */
function heuristic(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return Math.max(dx, dy);
}

/** 8-directional neighbors (cardinal + diagonal) */
const DIRS: [number, number][] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

/**
 * A* pathfinding from start to goal across terrain.
 * Returns the path as grid coordinates, or null if no path exists.
 */
export function findPath(
  terrain: TerrainData,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
): [number, number][] | null {
  const { width, height } = terrain;
  const startIdx = startY * width + startX;
  const goalIdx = goalY * width + goalX;

  // Validate start and goal
  const startTile = getTile(terrain, startX, startY);
  const goalTile = getTile(terrain, goalX, goalY);
  if (!startTile?.isLand || !goalTile?.isLand) return null;

  // Open set as a simple priority queue (sorted array — good enough for our grid sizes)
  const open: Array<{ idx: number; f: number }> = [
    { idx: startIdx, f: heuristic(startX, startY, goalX, goalY) },
  ];

  const gScore = new Float32Array(width * height).fill(Infinity);
  gScore[startIdx] = 0;

  const cameFrom = new Int32Array(width * height).fill(-1);

  const closed = new Uint8Array(width * height);

  while (open.length > 0) {
    // Pop lowest f-score
    let bestI = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestI].f) bestI = i;
    }
    const current = open[bestI];
    open[bestI] = open[open.length - 1];
    open.pop();

    if (current.idx === goalIdx) {
      // Reconstruct path
      const path: [number, number][] = [];
      let idx = goalIdx;
      while (idx !== -1) {
        const py = Math.floor(idx / width);
        const px = idx % width;
        path.push([px, py]);
        idx = cameFrom[idx];
      }
      path.reverse();
      return path;
    }

    if (closed[current.idx]) continue;
    closed[current.idx] = 1;

    const cx = current.idx % width;
    const cy = Math.floor(current.idx / width);
    const currentTile = terrain.tiles[current.idx];

    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const nIdx = ny * width + nx;
      if (closed[nIdx]) continue;

      const neighborTile = terrain.tiles[nIdx];
      const moveCost = transitionCost(currentTile, neighborTile);
      if (!Number.isFinite(moveCost)) continue;

      // Diagonal moves cost √2 times the base
      const stepCost = dx !== 0 && dy !== 0 ? moveCost * Math.SQRT2 : moveCost;
      const tentativeG = gScore[current.idx] + stepCost;
      if (tentativeG < gScore[nIdx]) {
        gScore[nIdx] = tentativeG;
        cameFrom[nIdx] = current.idx;
        const f = tentativeG + heuristic(nx, ny, goalX, goalY);
        open.push({ idx: nIdx, f });
      }
    }
  }

  return null; // No path found
}

// ── Landmass connectivity ─────────────────────────────────────────────

/**
 * Find the largest connected land region using BFS (flood fill).
 * Returns a Set of tile indices belonging to the main landmass.
 * This prevents settlements from being placed on tiny islands.
 */
export function findMainLandmass(terrain: TerrainData): Set<number> {
  const { width, height, tiles } = terrain;
  const visited = new Uint8Array(width * height);
  let largestComponent = new Set<number>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx] || !tiles[idx].isLand) continue;

      // BFS to find this connected component
      const component = new Set<number>();
      const queue: number[] = [idx];
      visited[idx] = 1;

      let head = 0;
      while (head < queue.length) {
        const cIdx = queue[head++];
        component.add(cIdx);

        const cx = cIdx % width;
        const cy = Math.floor(cIdx / width);

        for (const [dx, dy] of DIRS) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (!visited[nIdx] && tiles[nIdx].isLand) {
            visited[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }

      if (component.size > largestComponent.size) {
        largestComponent = component;
      }
    }
  }

  return largestComponent;
}

// ── Settlement placement ──────────────────────────────────────────────

/**
 * Place anchor settlements onto the terrain grid.
 * Each anchor has a roadSpineProgress (0-1) that maps to a vertical
 * position along the island. We find the best land tile near that target,
 * constrained to the main landmass (largest connected land region).
 */
export function placeAnchorSettlements(
  terrain: TerrainData,
  config: KingdomConfig,
  rng: () => number,
): PlacedSettlement[] {
  const { width, height } = terrain;
  const settlements: PlacedSettlement[] = [];

  // Only place on the main landmass to guarantee A* connectivity
  const mainLand = findMainLandmass(terrain);

  // Pre-compute a vertical center profile using main landmass only
  const rowCenterX = new Float32Array(height);
  const rowLandCount = new Int32Array(height);
  for (let y = 0; y < height; y++) {
    let sumX = 0;
    let count = 0;
    for (let x = 0; x < width; x++) {
      if (mainLand.has(y * width + x)) {
        sumX += x;
        count++;
      }
    }
    rowCenterX[y] = count > 0 ? sumX / count : width / 2;
    rowLandCount[y] = count;
  }

  for (const anchor of config.anchorSettlements) {
    // Target y based on roadSpineProgress (0 = south/bottom, 1 = north/top)
    // Map progress 0->1 to y: bottom (height-1) -> top (0)
    // But we leave margin so settlements aren't at the very edge
    const margin = Math.floor(height * 0.08);
    const targetY = Math.floor(
      (1 - anchor.roadSpineProgress) * (height - 2 * margin) + margin,
    );
    const targetX = Math.round(rowCenterX[Math.min(targetY, height - 1)]);

    // Search in expanding radius for the best land tile on the main landmass
    let bestX = targetX;
    let bestY = targetY;
    let bestScore = -Infinity;
    const searchRadius = Math.max(
      16,
      Math.floor(Math.min(width, height) * 0.2),
    );

    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const sx = targetX + dx;
        const sy = targetY + dy;
        if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;

        const idx = sy * width + sx;
        if (!mainLand.has(idx)) continue;

        const tile = terrain.tiles[idx];

        // Score: prefer close to target, reasonable elevation, not coast
        const dist = Math.sqrt(dx * dx + dy * dy);
        let score = -dist * 2; // Penalty for distance from target

        // Prefer moderate elevation (not mountains, not swamp)
        if (tile.elevation > 0.15 && tile.elevation < 0.55) score += 5;
        if (tile.elevation > 0.65) score -= 10;

        // Prefer non-coast (except ports)
        if (tile.isCoast && anchor.type !== 'port') score -= 3;

        // Prefer near rivers for towns
        if (tile.hasRiver && anchor.type === 'town') score += 4;

        // Small random jitter for variety
        score += rng() * 1.5;

        // Avoid overlapping with existing settlements
        for (const existing of settlements) {
          const eDist =
            Math.abs(sx - existing.position[0]) +
            Math.abs(sy - existing.position[1]);
          if (eDist < 8) score -= 50;
        }

        if (score > bestScore) {
          bestScore = score;
          bestX = sx;
          bestY = sy;
        }
      }
    }

    settlements.push({
      id: anchor.id,
      name: anchor.name,
      type: anchor.type,
      position: [bestX, bestY],
      mainQuestChapter: anchor.mainQuestChapter,
      description: anchor.description,
      features: anchor.features,
      isAnchor: true,
    });
  }

  return settlements;
}

// ── Road network generation ───────────────────────────────────────────

/**
 * Simplify a path by removing collinear intermediate points.
 * Keeps start, end, and direction-change points.
 */
function simplifyPath(path: [number, number][]): [number, number][] {
  if (path.length <= 2) return path;

  const result: [number, number][] = [path[0]];

  for (let i = 1; i < path.length - 1; i++) {
    const [px, py] = path[i - 1];
    const [cx, cy] = path[i];
    const [nx, ny] = path[i + 1];
    const dx1 = cx - px;
    const dy1 = cy - py;
    const dx2 = nx - cx;
    const dy2 = ny - cy;
    // Keep if direction changes
    if (dx1 !== dx2 || dy1 !== dy2) {
      result.push(path[i]);
    }
  }

  result.push(path[path.length - 1]);
  return result;
}

/**
 * Generate the complete road network for a kingdom.
 *
 * 1. Place anchor settlements on terrain
 * 2. A* the King's Road between consecutive anchors
 * 3. (Future: add secondary roads and trails)
 *
 * @param seed - String seed for deterministic generation
 * @param terrain - Generated terrain data
 * @param config - Kingdom configuration with anchor settlements
 */
export function generateRoadNetwork(
  seed: string,
  terrain: TerrainData,
  config: KingdomConfig,
): RoadNetwork {
  const rngSeed = cyrb128(`${seed}:roads`);
  const rng = mulberry32(rngSeed);

  // Step 1: Place anchor settlements
  const settlements = placeAnchorSettlements(terrain, config, rng);

  // Step 2: Generate King's Road (highway) between consecutive anchors
  const roads: RoadSegment[] = [];
  const roadTiles = new Map<number, RoadType>();

  for (let i = 0; i < settlements.length - 1; i++) {
    const from = settlements[i];
    const to = settlements[i + 1];

    const path = findPath(
      terrain,
      from.position[0],
      from.position[1],
      to.position[0],
      to.position[1],
    );

    if (path) {
      // Mark tiles
      for (const [px, py] of path) {
        const idx = py * terrain.width + px;
        // Highway takes priority
        if (!roadTiles.has(idx) || roadTiles.get(idx) !== 'highway') {
          roadTiles.set(idx, 'highway');
        }
      }

      const simplified = simplifyPath(path);

      roads.push({
        id: `kings-road-${i}`,
        type: 'highway',
        from: from.position,
        to: to.position,
        path: simplified,
        connectsSettlements: [from.id, to.id],
      });
    }
  }

  // Step 3: Secondary roads from non-anchor settlements to nearest road node
  // For now, all settlements are anchors on the King's Road.
  // Future: generate additional settlements and connect them.

  return { settlements, roads, roadTiles };
}

/**
 * Check if a tile has a road.
 */
export function hasRoadAt(
  network: RoadNetwork,
  terrain: TerrainData,
  x: number,
  y: number,
): RoadType | null {
  const idx = y * terrain.width + x;
  return network.roadTiles.get(idx) ?? null;
}

/**
 * Get total road length in tiles across all segments.
 */
export function totalRoadLength(network: RoadNetwork): number {
  let total = 0;
  for (const road of network.roads) {
    total += road.path.length;
  }
  return total;
}
