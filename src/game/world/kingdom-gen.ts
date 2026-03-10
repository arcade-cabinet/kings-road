/**
 * Kingdom generator — the master orchestrator.
 *
 * Called ONCE at New Game time. Generates the complete deterministic world
 * from a seed and the authored kingdom-config.json:
 *
 * 1. Terrain (landmass shape, elevation, biomes, rivers)
 * 2. Region assignment (authored regions painted onto terrain)
 * 3. Settlement placement (anchors on the King's Road + off-road settlements)
 * 4. Road network (King's Road + secondary roads + paths)
 * 5. Feature distribution (deterministic per-region)
 *
 * The result is a KingdomMap that gets stored in memory/db. Chunks READ
 * from it at runtime — no per-chunk type resolution needed.
 *
 * All functions are pure and deterministic from seed.
 */

import type {
  AuthoredRegion,
  KingdomBiome,
  KingdomConfig,
  KingdomMap,
  KingdomRegion,
  MapTile,
  OffRoadSettlement,
  River,
  RoadSegment as SchemaRoadSegment,
  Settlement,
} from '../../schemas/kingdom.schema';
import { cyrb128, mulberry32 } from '../utils/random';
import type { PlacedSettlement, RoadSegment } from './road-network';
import { findPath, generateRoadNetwork } from './road-network';
import type { TerrainData } from './terrain-gen';
import { generateTerrain } from './terrain-gen';

// ── Region assignment ──────────────────────────────────────────────────

/**
 * Assign authored regions to terrain tiles.
 * Each tile gets a regionId if it falls within an authored region's
 * latitude/longitude range AND is land.
 *
 * Regions can overlap — later regions in the array take priority.
 * This lets content authors layer fine-grained regions over broad ones.
 */
function assignRegions(
  terrain: TerrainData,
  authoredRegions: AuthoredRegion[],
): Map<number, string> {
  const regionMap = new Map<number, string>();
  const { width, height } = terrain;

  for (const region of authoredRegions) {
    const [latMin, latMax] = region.latitudeRange;
    const [lonMin, lonMax] = region.longitudeRange ?? [0, 1];

    // Convert normalized ranges to grid coordinates
    // latitude 0 = south (high y), latitude 1 = north (low y)
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

  return regionMap;
}

/**
 * Build KingdomRegion output objects from authored regions and their
 * actual tile coverage on the generated terrain.
 */
function buildRegionObjects(
  terrain: TerrainData,
  authoredRegions: AuthoredRegion[],
  regionMap: Map<number, string>,
): KingdomRegion[] {
  const { width, height } = terrain;
  const regions: KingdomRegion[] = [];

  for (const authored of authoredRegions) {
    // Find actual bounds of this region on the terrain
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    const settlements: string[] = authored.settlements ?? [];

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

    if (minX <= maxX && minY <= maxY) {
      regions.push({
        id: authored.id,
        name: authored.name,
        biome: authored.biome,
        bounds: [minX, minY, maxX, maxY],
        settlements,
        terrainFeatures: authored.terrainFeatures,
        description: authored.description,
        dangerTier: authored.dangerTier,
        weather: authored.weather,
      });
    }
  }

  return regions;
}

// ── Off-road settlement placement ──────────────────────────────────────

/**
 * Place off-road settlements within their assigned regions.
 * Uses seeded RNG to find suitable land tiles within each region.
 */
function placeOffRoadSettlements(
  terrain: TerrainData,
  offRoad: OffRoadSettlement[],
  regionMap: Map<number, string>,
  existingSettlements: PlacedSettlement[],
  rng: () => number,
): PlacedSettlement[] {
  const { width } = terrain;
  const placed: PlacedSettlement[] = [];

  for (const settlement of offRoad) {
    // Collect candidate tiles in the correct region
    const candidates: [number, number][] = [];
    for (const [idx, regionId] of regionMap) {
      if (regionId === settlement.region) {
        const tile = terrain.tiles[idx];
        // Prefer non-coast, moderate elevation, non-mountain
        if (tile.isLand && !tile.isCoast && tile.elevation < 0.65) {
          candidates.push([idx % width, Math.floor(idx / width)]);
        }
      }
    }

    if (candidates.length === 0) continue;

    // Score candidates — prefer distance from existing settlements
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < Math.min(candidates.length, 200); i++) {
      // Sample randomly if too many candidates
      const ci =
        candidates.length > 200 ? Math.floor(rng() * candidates.length) : i;
      const [cx, cy] = candidates[ci];

      let score = rng() * 3; // Some randomness

      // Prefer distance from existing settlements (not too close, not too far)
      let minDist = Infinity;
      for (const existing of [...existingSettlements, ...placed]) {
        const d =
          Math.abs(cx - existing.position[0]) +
          Math.abs(cy - existing.position[1]);
        if (d < minDist) minDist = d;
      }
      if (minDist < 5)
        score -= 50; // Too close
      else if (minDist < 10)
        score += 2; // Nice distance
      else if (minDist > 30) score -= 5; // Too far from anything

      // Ports should be near coast
      if (settlement.type === 'port') {
        const tile = terrain.tiles[cy * width + cx];
        if (tile.isCoast) score += 10;
      }

      // Near rivers is good for villages
      const tile = terrain.tiles[cy * width + cx];
      if (tile.hasRiver && settlement.type === 'village') score += 5;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = ci;
      }
    }

    const [px, py] = candidates[bestIdx];
    placed.push({
      id: settlement.id,
      name: settlement.name,
      type: settlement.type,
      position: [px, py],
      description: settlement.description,
      features: settlement.features,
      isAnchor: false,
    });
  }

  return placed;
}

// ── Secondary road generation ──────────────────────────────────────────

/**
 * Generate secondary roads connecting off-road settlements to the
 * nearest point on the King's Road network.
 */
function generateSecondaryRoads(
  terrain: TerrainData,
  offRoadSettlements: PlacedSettlement[],
  roadNetwork: { roads: RoadSegment[]; roadTiles: Map<number, string> },
  offRoadConfigs: OffRoadSettlement[],
): RoadSegment[] {
  const { width } = terrain;
  const secondaryRoads: RoadSegment[] = [];

  for (const settlement of offRoadSettlements) {
    const config = offRoadConfigs.find((c) => c.id === settlement.id);
    if (!config || config.roadConnection === 'none') continue;

    // Find nearest road tile
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

    // A* from settlement to nearest road tile
    const path = findPath(
      terrain,
      settlement.position[0],
      settlement.position[1],
      nearestRoadTile[0],
      nearestRoadTile[1],
    );

    if (path && path.length > 1) {
      const roadType = config.roadConnection as 'secondary' | 'path' | 'trail';
      secondaryRoads.push({
        id: `${roadType}-to-${settlement.id}`,
        type: roadType,
        from: settlement.position,
        to: nearestRoadTile,
        path,
        connectsSettlements: [settlement.id, 'kings-road'],
      });
    }
  }

  return secondaryRoads;
}

// ── River naming ───────────────────────────────────────────────────────

const RIVER_NAMES = [
  'River Mill',
  'River Ash',
  'River Thorn',
  'Silver Brook',
  'Darkwater',
  'River Wren',
  'Clearstream',
  'River Cairn',
  'Whitewater',
  'River Raven',
  'Goldstream',
  'River Elm',
];

// ── Progress callback type ─────────────────────────────────────────────

/** Callback for reporting generation progress to the loading screen. */
export type ProgressCallback = (progress: number, phase: string) => void;

// ── Master generator ───────────────────────────────────────────────────

/**
 * Core kingdom assembly — shared by sync and async generators.
 * Takes pre-computed phase results and assembles the final KingdomMap.
 */
function assembleKingdom(
  seed: string,
  config: KingdomConfig,
  terrain: TerrainData,
  authoredRegions: AuthoredRegion[],
  regionMap: Map<number, string>,
  regions: KingdomRegion[],
  roadNetwork: ReturnType<typeof generateRoadNetwork>,
  offRoadPlaced: PlacedSettlement[],
  secondaryRoads: RoadSegment[],
): KingdomMap {
  // ── Assemble tiles ──────────────────────────────────────────────────
  const allRoadTiles = new Map(roadNetwork.roadTiles);
  for (const road of secondaryRoads) {
    for (const [px, py] of road.path) {
      const idx = py * terrain.width + px;
      if (!allRoadTiles.has(idx)) {
        allRoadTiles.set(idx, road.type);
      }
    }
  }

  const tiles: MapTile[] = terrain.tiles.map((t, idx) => {
    const regionId = regionMap.get(idx) ?? null;
    let biome: KingdomBiome = t.biome;
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

  // ── Name rivers ─────────────────────────────────────────────────────
  const rivers: River[] = terrain.rivers.map((r, i) => ({
    id: `river-${i}`,
    name: RIVER_NAMES[i % RIVER_NAMES.length],
    path: r.path,
    width: r.width,
  }));

  // ── Assemble settlements ────────────────────────────────────────────
  const allSettlements: Settlement[] = [
    ...roadNetwork.settlements.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type as Settlement['type'],
      position: s.position as [number, number],
      connectedTo: [] as string[],
      mainQuestChapter: s.mainQuestChapter,
      description: s.description,
      features: s.features,
      population: 'medium' as const,
    })),
    ...offRoadPlaced.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type as Settlement['type'],
      position: s.position as [number, number],
      connectedTo: [] as string[],
      description: s.description,
      features: s.features,
      population: 'small' as const,
    })),
  ];

  // Fill in connectedTo from road segments
  const allRoads = [...roadNetwork.roads, ...secondaryRoads];
  for (const road of allRoads) {
    const [fromId, toId] = road.connectsSettlements;
    const fromSettlement = allSettlements.find((s) => s.id === fromId);
    const toSettlement = allSettlements.find((s) => s.id === toId);
    if (fromSettlement && !fromSettlement.connectedTo.includes(toId)) {
      fromSettlement.connectedTo.push(toId);
    }
    if (toSettlement && !toSettlement.connectedTo.includes(fromId)) {
      toSettlement.connectedTo.push(fromId);
    }
  }

  // ── Assemble road segments for schema ───────────────────────────────
  const schemaRoads: SchemaRoadSegment[] = allRoads.map((r) => ({
    id: r.id,
    type: r.type,
    from: r.from,
    to: r.to,
    waypoints: r.path.length > 2 ? r.path.slice(1, -1) : [],
    connectsSettlements: r.connectsSettlements,
  }));

  return {
    seed,
    width: config.width,
    height: config.height,
    tiles,
    settlements: allSettlements,
    roads: schemaRoads,
    rivers,
    regions,
    features: [],
  };
}

/**
 * Generate the complete kingdom map from a seed and config (sync).
 *
 * Used by tests and benchmarks where blocking is acceptable.
 * For the game loading screen, use generateKingdomAsync instead.
 */
export function generateKingdom(
  seed: string,
  config: KingdomConfig,
): KingdomMap {
  const rng = mulberry32(cyrb128(`${seed}:kingdom`));

  const terrain = generateTerrain(seed, config);
  const authoredRegions = config.regions ?? [];
  const regionMap = assignRegions(terrain, authoredRegions);
  const regions = buildRegionObjects(terrain, authoredRegions, regionMap);
  const roadNetwork = generateRoadNetwork(seed, terrain, config);
  const offRoadConfigs = config.offRoadSettlements ?? [];
  const offRoadPlaced = placeOffRoadSettlements(
    terrain,
    offRoadConfigs,
    regionMap,
    roadNetwork.settlements,
    rng,
  );
  const secondaryRoads = generateSecondaryRoads(
    terrain,
    offRoadPlaced,
    roadNetwork,
    offRoadConfigs,
  );

  return assembleKingdom(
    seed,
    config,
    terrain,
    authoredRegions,
    regionMap,
    regions,
    roadNetwork,
    offRoadPlaced,
    secondaryRoads,
  );
}

/** Yield to the browser event loop so React can re-render. */
const yieldToUI = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Async kingdom generator with real per-phase progress callbacks.
 *
 * Yields to the UI between each generation phase so the loading screen
 * can display meaningful progress. Same deterministic output as the
 * sync version — the yields only affect rendering, not generation.
 *
 * Phase breakdown (matching benchmark profiling):
 *   0.00 - 0.30  Terrain generation (simplex noise, rivers, biomes)
 *   0.30 - 0.40  Region assignment
 *   0.40 - 0.60  Road network (A* pathfinding)
 *   0.60 - 0.70  Settlement placement
 *   0.70 - 0.85  Secondary roads
 *   0.85 - 1.00  Map assembly
 */
export async function generateKingdomAsync(
  seed: string,
  config: KingdomConfig,
  onProgress?: ProgressCallback,
): Promise<KingdomMap> {
  const rng = mulberry32(cyrb128(`${seed}:kingdom`));

  // ── Phase 1: Terrain (0.00 → 0.30) ──────────────────────────────
  onProgress?.(0, 'Shaping the terrain...');
  await yieldToUI();
  const terrain = generateTerrain(seed, config);

  // ── Phase 2: Regions (0.30 → 0.40) ──────────────────────────────
  onProgress?.(0.3, 'Painting the regions...');
  await yieldToUI();
  const authoredRegions = config.regions ?? [];
  const regionMap = assignRegions(terrain, authoredRegions);
  const regions = buildRegionObjects(terrain, authoredRegions, regionMap);

  // ── Phase 3: Road network (0.40 → 0.60) ─────────────────────────
  onProgress?.(0.4, "Charting the King's Road...");
  await yieldToUI();
  const roadNetwork = generateRoadNetwork(seed, terrain, config);

  // ── Phase 4: Settlements (0.60 → 0.70) ──────────────────────────
  onProgress?.(0.6, 'Founding settlements...');
  await yieldToUI();
  const offRoadConfigs = config.offRoadSettlements ?? [];
  const offRoadPlaced = placeOffRoadSettlements(
    terrain,
    offRoadConfigs,
    regionMap,
    roadNetwork.settlements,
    rng,
  );

  // ── Phase 5: Secondary roads (0.70 → 0.85) ──────────────────────
  onProgress?.(0.7, 'Blazing trails...');
  await yieldToUI();
  const secondaryRoads = generateSecondaryRoads(
    terrain,
    offRoadPlaced,
    roadNetwork,
    offRoadConfigs,
  );

  // ── Phase 6: Assembly (0.85 → 1.00) ─────────────────────────────
  onProgress?.(0.85, 'Assembling the realm...');
  await yieldToUI();
  const map = assembleKingdom(
    seed,
    config,
    terrain,
    authoredRegions,
    regionMap,
    regions,
    roadNetwork,
    offRoadPlaced,
    secondaryRoads,
  );

  onProgress?.(1, 'The realm awaits...');
  return map;
}

// ── Lookup helpers ──────────────────────────────────────────────────────

/**
 * Get the map tile at grid coordinates.
 */
export function getKingdomTile(
  map: KingdomMap,
  x: number,
  y: number,
): MapTile | undefined {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return undefined;
  return map.tiles[y * map.width + x];
}

/**
 * Find which region a tile belongs to.
 */
export function getRegionAt(
  map: KingdomMap,
  x: number,
  y: number,
): KingdomRegion | undefined {
  const tile = getKingdomTile(map, x, y);
  if (!tile) return undefined;

  // Check each region's bounds
  for (const region of map.regions) {
    const [minX, minY, maxX, maxY] = region.bounds;
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      return region;
    }
  }

  return undefined;
}

/**
 * Find the settlement at or near a tile position.
 */
export function getSettlementAt(
  map: KingdomMap,
  x: number,
  y: number,
  radius: number = 2,
): Settlement | undefined {
  for (const settlement of map.settlements) {
    const [sx, sy] = settlement.position;
    if (Math.abs(sx - x) <= radius && Math.abs(sy - y) <= radius) {
      return settlement;
    }
  }
  return undefined;
}
