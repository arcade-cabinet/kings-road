import { BiomeError } from '@/core';
import type { BiomeConfig } from './schema';

type RoadSpineRegion = {
  biome: string;
  // Zod v4 infers z.tuple output as [T?, T?, ...unknown[]]; accept that shape.
  anchorRange: [string?, string?, ...unknown[]];
};

type RoadSpineAnchor = {
  id: string;
  distanceFromStart: number;
};

type RoadSpineData = {
  totalDistance: number;
  anchors: RoadSpineAnchor[];
  regions?: RoadSpineRegion[];
};

type ResolvedRegion = {
  biomeId: string;
  startDistance: number;
  endDistance: number;
};

const registry = new Map<string, BiomeConfig>();
let roadSpine: RoadSpineData | null = null;
let resolvedRegions: ResolvedRegion[] = [];
let spineTotalDistance = 0;

/**
 * Fallback map for biome ids that kingdom-gen emits but that we have no
 * dedicated BiomeConfig for yet. Keeps the visual consistent instead of
 * dropping terrain/vegetation for entire classes of tile. Phase 0 content
 * has only 5 configs (meadow/forest/moor/thornfield/ocean) but terrain-gen
 * in src/world/terrain-gen.ts classifies tiles into 12 biome ids. Rather
 * than degrading to null (no terrain, no vegetation — the big brown walls
 * seen at the coast spawn), map the missing ones to their closest visual
 * neighbour until per-biome configs are authored.
 */
const BIOME_ALIASES: Record<string, string> = {
  // Low elevation, dry-to-medium moisture → meadow-like pastoral.
  farmland: 'meadow',
  riverside: 'meadow',
  // Coastal strip — no dedicated config; mirror meadow until authored.
  coast: 'meadow',
  // Wet lowlands — moor is the closest registered biome visually.
  swamp: 'moor',
  // Mid-upland — treat as moor until we have dedicated hills content.
  hills: 'moor',
  // High elevation — moor until we have a highland config (darker, rockier).
  highland: 'moor',
  mountain: 'moor',
  // Dense woodland — forest already covers the look.
  deep_forest: 'forest',
};

/** Lowercase the road-spine biome string to match BiomeConfig ids. */
function normalizeRegionBiome(biome: string): string {
  return biome.toLowerCase();
}

/**
 * Recursively freeze an object and all its nested objects/arrays.
 * Plain Object.freeze is shallow; the service contract promises
 * returned BiomeConfig objects are fully immutable.
 */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.keys(value as object)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

/**
 * Resolve road-spine regions into absolute distance bounds once, at init().
 * Throws if any region references an unknown anchor id — silently falling
 * back to 0 / totalDistance would mask spine-data bugs.
 */
function precomputeRegions(spine: RoadSpineData): ResolvedRegion[] {
  if (!spine.regions) return [];
  const anchorDistance = new Map<string, number>(
    spine.anchors.map((a) => [a.id, a.distanceFromStart]),
  );
  return spine.regions.map((region) => {
    const startAnchor = region.anchorRange[0];
    const endAnchor = region.anchorRange[1];
    if (!startAnchor || !endAnchor) {
      throw new BiomeError(
        `road-spine region has invalid anchorRange: expected [string, string]`,
      );
    }
    const startDistance = anchorDistance.get(startAnchor);
    const endDistance = anchorDistance.get(endAnchor);
    if (startDistance === undefined) {
      throw new BiomeError(
        `road-spine region references unknown anchor "${startAnchor}"`,
      );
    }
    if (endDistance === undefined) {
      throw new BiomeError(
        `road-spine region references unknown anchor "${endAnchor}"`,
      );
    }
    return {
      biomeId: normalizeRegionBiome(region.biome),
      startDistance,
      endDistance,
    };
  });
}

/**
 * Find the index of the region enclosing `distance`. Uses `<` on the end
 * bound so boundaries belong to the next region, EXCEPT for the final
 * region where `distance === totalDistance` is valid and must match.
 */
function findRegionIndex(distance: number): number {
  const clamped = Math.max(0, Math.min(distance, spineTotalDistance));
  for (let i = 0; i < resolvedRegions.length; i++) {
    const { startDistance, endDistance } = resolvedRegions[i];
    const isLast = i === resolvedRegions.length - 1;
    const withinEnd = isLast ? clamped <= endDistance : clamped < endDistance;
    if (clamped >= startDistance && withinEnd) return i;
  }
  return -1;
}

export const BiomeService = {
  /**
   * Register all available biome configs and the road spine.
   * Must be called once at startup before any getCurrentBiome calls.
   * Throws BiomeError if any region references an unknown anchor.
   */
  init(configs: BiomeConfig[], spine: RoadSpineData): void {
    registry.clear();
    for (const config of configs) {
      registry.set(config.id, deepFreeze(config));
    }
    roadSpine = spine;
    spineTotalDistance = spine.totalDistance;
    resolvedRegions = precomputeRegions(spine);
  },

  getBiomeById(id: string): BiomeConfig {
    const config = registry.get(id);
    if (!config) {
      throw new BiomeError(`Unknown biome id: "${id}"`);
    }
    return config;
  },

  /**
   * Soft-resolve a biome id for rendering. Used by chunk rendering where
   * we'd rather fall back to an aliased neighbour than leave the chunk
   * unconfigured (no terrain, no vegetation, no fog). Returns null only
   * when the id is neither registered nor aliased — callers can then
   * treat the tile as blank ground.
   */
  resolveForChunk(id: string): BiomeConfig | null {
    const direct = registry.get(id);
    if (direct) return direct;
    const aliased = BIOME_ALIASES[id];
    if (aliased) {
      const alt = registry.get(aliased);
      if (alt) return alt;
    }
    return null;
  },

  /**
   * Resolve the current biome from a 1D road position (distance from start).
   * Throws BiomeError if the enclosing region's biome id is not registered
   * (preferring loud failure to a silent "first registered biome" fallback
   * that would hide missing content). Accepts distance === totalDistance.
   */
  getCurrentBiome(distanceFromStart: number): BiomeConfig {
    if (!roadSpine) {
      throw new BiomeError(
        'BiomeService.init() must be called before getCurrentBiome()',
      );
    }
    const idx = findRegionIndex(distanceFromStart);
    if (idx === -1) {
      const first = registry.values().next().value;
      if (!first) {
        throw new BiomeError('No biomes registered in BiomeService');
      }
      return first;
    }
    return this.getBiomeById(resolvedRegions[idx].biomeId);
  },

  /**
   * Return all registered biome configs.
   */
  getAllBiomes(): BiomeConfig[] {
    return Array.from(registry.values());
  },

  /**
   * Resolve the road-region enclosing the given distance and return its
   * biome id + [startDistance, endDistance] bounds. Used by transition
   * cross-fade math, which needs boundary positions, not just biome id.
   */
  getCurrentRegionBounds(distanceFromStart: number): ResolvedRegion | null {
    if (!roadSpine) return null;
    const idx = findRegionIndex(distanceFromStart);
    if (idx === -1) return null;
    return resolvedRegions[idx];
  },

  /**
   * Return the biome ids of regions immediately before and after the
   * region enclosing `distanceFromStart`. Distance-keyed (not biome-id
   * keyed) because the same biome can appear in multiple non-adjacent
   * regions along the road (e.g. HILLS recurs), and an id-keyed lookup
   * would collapse those into one position. Returns [null, null] when
   * the distance falls outside any region.
   */
  getNeighbors(distanceFromStart: number): [string | null, string | null] {
    if (!roadSpine) return [null, null];
    const idx = findRegionIndex(distanceFromStart);
    if (idx === -1) return [null, null];
    const prev = idx > 0 ? resolvedRegions[idx - 1].biomeId : null;
    const next =
      idx < resolvedRegions.length - 1
        ? resolvedRegions[idx + 1].biomeId
        : null;
    return [prev, next];
  },
};
