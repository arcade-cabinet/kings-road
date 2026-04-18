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

const registry = new Map<string, BiomeConfig>();
let roadSpine: RoadSpineData | null = null;

/** Lowercase the road-spine biome string to match BiomeConfig ids. */
function normalizeRegionBiome(biome: string): string {
  return biome.toLowerCase();
}

export const BiomeService = {
  /**
   * Register all available biome configs and the road spine.
   * Must be called once at startup before any getCurrentBiome calls.
   */
  init(configs: BiomeConfig[], spine: RoadSpineData): void {
    registry.clear();
    for (const config of configs) {
      registry.set(config.id, Object.freeze(config));
    }
    roadSpine = spine;
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
   * Uses road-spine regions to find the enclosing segment, then returns
   * the BiomeConfig whose id matches the region's biome.
   */
  getCurrentBiome(distanceFromStart: number): BiomeConfig {
    if (!roadSpine) {
      throw new BiomeError(
        'BiomeService.init() must be called before getCurrentBiome()',
      );
    }

    const { anchors, regions } = roadSpine;

    // Build a distance lookup for anchor ids
    const anchorDistance = new Map<string, number>(
      anchors.map((a) => [a.id, a.distanceFromStart]),
    );

    const clampedDistance = Math.max(
      0,
      Math.min(distanceFromStart, roadSpine.totalDistance),
    );

    if (regions) {
      for (const region of regions) {
        const startDist = anchorDistance.get(region.anchorRange[0]) ?? 0;
        const endDist =
          anchorDistance.get(region.anchorRange[1]) ?? roadSpine.totalDistance;

        if (clampedDistance >= startDist && clampedDistance < endDist) {
          const biomeId = normalizeRegionBiome(region.biome);
          if (registry.has(biomeId)) {
            return registry.get(biomeId)!;
          }
          // Fall through — biome data not loaded yet; return first registered biome
          break;
        }
      }
    }

    // Fallback: return the first registered biome (or throw if empty)
    const first = registry.values().next().value;
    if (!first) {
      throw new BiomeError('No biomes registered in BiomeService');
    }
    return first;
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
  getCurrentRegionBounds(
    distanceFromStart: number,
  ): { biomeId: string; startDistance: number; endDistance: number } | null {
    if (!roadSpine?.regions) return null;
    const { anchors, regions, totalDistance } = roadSpine;
    const anchorDistance = new Map<string, number>(
      anchors.map((a) => [a.id, a.distanceFromStart]),
    );
    const clamped = Math.max(0, Math.min(distanceFromStart, totalDistance));
    for (const region of regions) {
      const startDistance = anchorDistance.get(region.anchorRange[0]) ?? 0;
      const endDistance =
        anchorDistance.get(region.anchorRange[1]) ?? totalDistance;
      if (clamped >= startDistance && clamped < endDistance) {
        return {
          biomeId: normalizeRegionBiome(region.biome),
          startDistance,
          endDistance,
        };
      }
    }
    return null;
  },

  /**
   * Return neighbor biome ids adjacent to the given biome in road order.
   * Returns up to two neighbors: [previous, next].
   */
  getNeighbors(biomeId: string): [string | null, string | null] {
    if (!roadSpine?.regions) return [null, null];

    const { regions } = roadSpine;

    const normalized = biomeId.toLowerCase();
    const idx = regions.findIndex(
      (r) => normalizeRegionBiome(r.biome) === normalized,
    );

    if (idx === -1) return [null, null];

    const prev = idx > 0 ? normalizeRegionBiome(regions[idx - 1].biome) : null;
    const next =
      idx < regions.length - 1
        ? normalizeRegionBiome(regions[idx + 1].biome)
        : null;

    return [prev, next];
  },
};
