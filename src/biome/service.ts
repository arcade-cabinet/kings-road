import { BiomeError } from '@/core';
import type { BiomeConfig } from './schema';

type RoadSpineRegion = {
  biome: string;
  anchorRange: [string, string];
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
    const [startAnchor, endAnchor] = region.anchorRange;
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
