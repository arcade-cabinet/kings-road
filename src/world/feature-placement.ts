/**
 * Feature placement — deterministic placement of features on the 2D kingdom map.
 *
 * Given a KingdomMap and seed, this module places features (shrines, ruins,
 * standing stones, etc.) at grid positions within each region based on
 * featureDensity and dangerTier.
 *
 * All placement is pure and deterministic from seed.
 * Content is sourced from the content store (game.db) at runtime.
 */

import { cyrb128, mulberry32 } from '@/core';
import { getAllFeatures, isContentStoreReady } from '@/db/content-queries';
import type { FeatureDefinition } from '@/schemas/feature.schema';
import type {
  KingdomBiome,
  KingdomMap,
  KingdomRegion,
} from '@/schemas/kingdom.schema';

// --- Biome → feature affinity ---

/** Features that fit each biome. Features not listed are "universal" and can appear anywhere. */
const BIOME_FEATURES: Partial<Record<KingdomBiome, string[]>> = {
  meadow: [
    'wildflower_patch',
    'berry_bush',
    'bird_nest',
    'ancient_oak',
    'wayside_shrine',
    'milestone_marker',
    'old_well',
    'weather_vane',
    'crossroads_sign',
    'fallen_log',
    'fox_den',
  ],
  forest: [
    'ancient_oak',
    'fallen_log',
    'mushroom_ring',
    'fox_den',
    'bird_nest',
    'fairy_circle',
    'hunter_blind',
    'stream_crossing',
    'enchanted_grove',
    'hermit_cave',
  ],
  deep_forest: [
    'ancient_oak',
    'mushroom_ring',
    'fairy_circle',
    'enchanted_grove',
    'hermit_cave',
    'fallen_log',
    'fox_den',
    'ancient_ruins',
  ],
  hills: [
    'standing_stone',
    'ancient_ruins',
    'watchtower_ruin',
    'hermit_cave',
    'dragon_bones',
    'wayside_shrine',
    'wind_chimes',
    'abandoned_camp',
  ],
  farmland: [
    'wildflower_patch',
    'berry_bush',
    'old_well',
    'weather_vane',
    'crossroads_sign',
    'milestone_marker',
    'ruined_farmstead',
    'stone_bridge',
    'wayside_shrine',
  ],
  moor: [
    'standing_stone',
    'abandoned_camp',
    'watchtower_ruin',
    'ancient_ruins',
    'wind_chimes',
    'hermit_cave',
    'dragon_bones',
    'ruined_farmstead',
  ],
  coast: [
    'old_well',
    'abandoned_camp',
    'stone_bridge',
    'weather_vane',
    'stream_crossing',
    'wayside_shrine',
    'milestone_marker',
  ],
  highland: [
    'standing_stone',
    'watchtower_ruin',
    'hermit_cave',
    'wind_chimes',
    'ancient_ruins',
    'wayside_shrine',
    'dragon_bones',
  ],
  mountain: [
    'standing_stone',
    'hermit_cave',
    'ancient_ruins',
    'dragon_bones',
    'watchtower_ruin',
    'enchanted_grove',
  ],
  swamp: [
    'mushroom_ring',
    'fairy_circle',
    'fallen_log',
    'abandoned_camp',
    'ancient_ruins',
    'hermit_cave',
    'old_well',
  ],
  riverside: [
    'stone_bridge',
    'stream_crossing',
    'old_well',
    'fallen_log',
    'berry_bush',
    'ancient_oak',
    'wayside_shrine',
  ],
};

/** Features gated by minimum danger tier (major/ominous features) */
const DANGER_TIER_MINIMUM: Record<string, number> = {
  dragon_bones: 2,
  ancient_ruins: 1,
  watchtower_ruin: 1,
  hermit_cave: 1,
  enchanted_grove: 1,
};

// --- Density configuration ---

/** Average tiles per feature for each density level */
const DENSITY_TILES_PER_FEATURE: Record<string, number> = {
  sparse: 20,
  normal: 10,
  dense: 5,
};

// --- Placed feature type ---

/** A feature placed on the kingdom grid during world generation */
export interface PlacedFeature {
  /** Unique id for this placed instance */
  id: string;
  /** Reference to the feature definition */
  definition: FeatureDefinition;
  /** Grid position [x, y] on the kingdom map */
  gridPosition: [number, number];
  /** Y rotation in radians */
  rotation: number;
  /** Which region this feature belongs to */
  regionId: string;
}

// --- Core placement logic ---

/**
 * Get all feature definitions from the content store.
 * Returns empty array if the store isn't ready.
 */
function getFeaturePool(): FeatureDefinition[] {
  if (!isContentStoreReady()) return [];
  return getAllFeatures();
}

/**
 * Get features suitable for a given biome and danger tier.
 * Falls back to the full feature list if no biome-specific features exist.
 */
function getFeaturesForBiome(
  biome: KingdomBiome,
  dangerTier: number,
): FeatureDefinition[] {
  const allFeatures = getFeaturePool();
  const biomeFeatureIds = BIOME_FEATURES[biome];

  let pool: FeatureDefinition[];
  if (biomeFeatureIds) {
    pool = allFeatures.filter((f) => biomeFeatureIds.includes(f.id));
  } else {
    // Unknown biome — use all features
    pool = [...allFeatures];
  }

  // Filter by danger tier: exclude features that require higher danger
  pool = pool.filter((f) => {
    const minTier = DANGER_TIER_MINIMUM[f.id];
    return minTier === undefined || dangerTier >= minTier;
  });

  // If danger filtering removed everything, fall back to ambient-only
  if (pool.length === 0) {
    pool = allFeatures.filter((f) => f.tier === 'ambient');
  }

  return pool;
}

/**
 * Generate deterministic feature placements across the entire kingdom map.
 *
 * For each region, iterates its tiles and places features at a rate determined
 * by the region's featureDensity. Features are chosen from a pool filtered by
 * biome and dangerTier. Skips tiles that have settlements, roads, or are not land.
 */
export function generateFeaturePlacements(
  map: KingdomMap,
  seed: string,
): PlacedFeature[] {
  const placements: PlacedFeature[] = [];

  // Build a set of settlement tiles to avoid (with a 2-tile buffer)
  const settlementTiles = new Set<number>();
  for (const settlement of map.settlements) {
    const [sx, sy] = settlement.position;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = sx + dx;
        const ty = sy + dy;
        if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
          settlementTiles.add(ty * map.width + tx);
        }
      }
    }
  }

  for (const region of map.regions) {
    const rng = mulberry32(cyrb128(`${seed}:features:${region.id}`));
    const dangerTier = region.dangerTier ?? 0;

    const densityKey = getRegionDensity(region);
    const tilesPerFeature = DENSITY_TILES_PER_FEATURE[densityKey] ?? 10;

    const [minX, minY, maxX, maxY] = region.bounds;
    const regionArea = (maxX - minX + 1) * (maxY - minY + 1);
    const targetCount = Math.max(1, Math.floor(regionArea / tilesPerFeature));

    const pool = getFeaturesForBiome(region.biome, dangerTier);
    if (pool.length === 0) continue;

    // Collect candidate tiles for this region
    const candidates: [number, number][] = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = y * map.width + x;
        const tile = map.tiles[idx];
        if (!tile) continue;
        if (!tile.isLand) continue;
        if (tile.hasRoad) continue;
        if (settlementTiles.has(idx)) continue;
        candidates.push([x, y]);
      }
    }

    if (candidates.length === 0) continue;

    // Shuffle candidates with seeded RNG (Fisher-Yates)
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    // Place features at the first N candidates
    const count = Math.min(targetCount, candidates.length);
    for (let i = 0; i < count; i++) {
      const [gx, gy] = candidates[i];

      // Pick a feature from the pool
      const definition = pool[Math.floor(rng() * pool.length)];
      const rotation = rng() * Math.PI * 2;

      placements.push({
        id: `feature:${region.id}:${gx},${gy}`,
        definition,
        gridPosition: [gx, gy],
        rotation,
        regionId: region.id,
      });
    }
  }

  // PASS 2: Roadside features (to prevent dead zones)
  const allFeatures = getFeaturePool();
  const roadPool = allFeatures.filter((f) => ROADSIDE_FEATURES.includes(f.id));

  if (roadPool.length > 0) {
    const roadTiles: [number, number, string][] = [];
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const idx = y * map.width + x;
        const tile = map.tiles[idx];
        if (tile?.isLand && tile.hasRoad && !settlementTiles.has(idx)) {
          // Find which region this belongs to
          const region = map.regions.find(
            (r) =>
              x >= r.bounds[0] &&
              x <= r.bounds[2] &&
              y >= r.bounds[1] &&
              y <= r.bounds[3],
          );
          roadTiles.push([x, y, region?.id ?? 'unknown']);
        }
      }
    }

    // Sort road tiles south to north
    roadTiles.sort((a, b) => a[1] - b[1]);

    let tilesSinceInteraction = 0;
    const roadRng = mulberry32(cyrb128(`${seed}:roadside`));

    for (const [x, y, regionId] of roadTiles) {
      tilesSinceInteraction++;
      // If we've gone 10-14 tiles without a feature, force a spawn
      if (tilesSinceInteraction > 10 + Math.floor(roadRng() * 4)) {
        const definition = roadPool[Math.floor(roadRng() * roadPool.length)];
        placements.push({
          id: `road_feature:${regionId}:${x},${y}`,
          definition,
          gridPosition: [x, y],
          rotation: roadRng() * Math.PI * 2,
          regionId: regionId,
        });
        tilesSinceInteraction = 0;
      }
    }
  }

  return placements;
}

/**
 * Look up placed features at a specific grid tile.
 * Uses a pre-built index for O(1) lookup per chunk.
 */
export function buildFeatureIndex(
  placements: PlacedFeature[],
): Map<string, PlacedFeature[]> {
  const index = new Map<string, PlacedFeature[]>();
  for (const p of placements) {
    const key = `${p.gridPosition[0]},${p.gridPosition[1]}`;
    const existing = index.get(key);
    if (existing) {
      existing.push(p);
    } else {
      index.set(key, [p]);
    }
  }
  return index;
}

/**
 * Get features at a specific grid position from the index.
 */
export function getFeaturesAtTile(
  index: Map<string, PlacedFeature[]>,
  gx: number,
  gy: number,
): PlacedFeature[] {
  return index.get(`${gx},${gy}`) ?? [];
}

// --- Helpers ---

/**
 * Derive feature density for a region.
 * Since KingdomRegion doesn't carry featureDensity directly,
 * we use dangerTier as a heuristic: higher danger = sparser features.
 * This can be overridden by passing a density map.
 */
function getRegionDensity(region: KingdomRegion): string {
  // Heuristic from dangerTier: safe regions are denser
  const tier = region.dangerTier ?? 0;
  if (tier <= 1) return 'normal';
  if (tier <= 2) return 'normal';
  return 'sparse';
}

/**
 * Generate features with explicit per-region density overrides.
 * This is the preferred entry point when the kingdom config is available.
 */
const ROADSIDE_FEATURES = [
  'milestone_marker',
  'wayside_shrine',
  'crossroads_sign',
  'abandoned_camp',
  'old_well',
];

export function generateFeaturePlacementsWithDensity(
  map: KingdomMap,
  seed: string,
  regionDensities: Map<string, 'sparse' | 'normal' | 'dense'>,
): PlacedFeature[] {
  const placements: PlacedFeature[] = [];

  // Build settlement exclusion set
  const settlementTiles = new Set<number>();
  for (const settlement of map.settlements) {
    const [sx, sy] = settlement.position;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = sx + dx;
        const ty = sy + dy;
        if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
          settlementTiles.add(ty * map.width + tx);
        }
      }
    }
  }

  // PASS 1: Ambient wilderness features
  for (const region of map.regions) {
    const rng = mulberry32(cyrb128(`${seed}:features:${region.id}`));
    const dangerTier = region.dangerTier ?? 0;
    const densityKey =
      regionDensities.get(region.id) ?? getRegionDensity(region);
    const tilesPerFeature = DENSITY_TILES_PER_FEATURE[densityKey] ?? 10;

    const [minX, minY, maxX, maxY] = region.bounds;
    const regionArea = (maxX - minX + 1) * (maxY - minY + 1);
    const targetCount = Math.max(1, Math.floor(regionArea / tilesPerFeature));

    const pool = getFeaturesForBiome(region.biome, dangerTier);
    if (pool.length === 0) continue;

    // Collect candidate tiles
    const candidates: [number, number][] = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = y * map.width + x;
        const tile = map.tiles[idx];
        if (!tile?.isLand || tile.hasRoad || settlementTiles.has(idx)) continue;
        candidates.push([x, y]);
      }
    }

    if (candidates.length === 0) continue;

    // Fisher-Yates shuffle
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const count = Math.min(targetCount, candidates.length);
    for (let i = 0; i < count; i++) {
      const [gx, gy] = candidates[i];
      const definition = pool[Math.floor(rng() * pool.length)];
      const rotation = rng() * Math.PI * 2;

      placements.push({
        id: `feature:${region.id}:${gx},${gy}`,
        definition,
        gridPosition: [gx, gy],
        rotation,
        regionId: region.id,
      });
    }
  }

  // PASS 2: Roadside features (to prevent dead zones)
  const allFeatures = getFeaturePool();
  const roadPool = allFeatures.filter((f) => ROADSIDE_FEATURES.includes(f.id));

  if (roadPool.length > 0) {
    const roadTiles: [number, number, string][] = [];
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const idx = y * map.width + x;
        const tile = map.tiles[idx];
        if (tile?.isLand && tile.hasRoad && !settlementTiles.has(idx)) {
          // Find which region this belongs to
          const region = map.regions.find(
            (r) =>
              x >= r.bounds[0] &&
              x <= r.bounds[2] &&
              y >= r.bounds[1] &&
              y <= r.bounds[3],
          );
          roadTiles.push([x, y, region?.id ?? 'unknown']);
        }
      }
    }

    // Sort road tiles south to north
    roadTiles.sort((a, b) => a[1] - b[1]);

    let tilesSinceInteraction = 0;
    const roadRng = mulberry32(cyrb128(`${seed}:roadside`));

    for (const [x, y, regionId] of roadTiles) {
      tilesSinceInteraction++;
      // If we've gone 10-14 tiles without a feature, force a spawn
      if (tilesSinceInteraction > 10 + Math.floor(roadRng() * 4)) {
        const definition = roadPool[Math.floor(roadRng() * roadPool.length)];
        placements.push({
          id: `road_feature:${regionId}:${x},${y}`,
          definition,
          gridPosition: [x, y],
          rotation: roadRng() * Math.PI * 2,
          regionId: regionId,
        });
        tilesSinceInteraction = 0;
      }
    }
  }

  return placements;
}
