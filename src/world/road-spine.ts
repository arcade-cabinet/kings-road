import {
  type AnchorPoint,
  type Region,
  type RoadSpine,
  RoadSpineSchema,
} from '@/schemas/world.schema';
import roadSpineData from '../content/world/road-spine.json';

let cachedSpine: RoadSpine | null = null;
/** Cached anchor-id → distanceFromStart map; invalidated with cachedSpine. */
let cachedAnchorDistMap: Map<string, number> | null = null;

/**
 * Load and validate the road spine JSON against the Zod schema.
 * Caches the result after first successful parse.
 */
export function loadRoadSpine(): RoadSpine {
  if (cachedSpine) return cachedSpine;
  cachedSpine = RoadSpineSchema.parse(roadSpineData);
  return cachedSpine;
}

/**
 * Clear the cached road spine (useful for testing).
 */
export function clearRoadSpineCache(): void {
  cachedSpine = null;
  cachedAnchorDistMap = null;
}

/**
 * Return the cached anchor-id → distanceFromStart map, building it once per
 * spine instance. This avoids allocating a new Map on every getRegionAtDistance
 * call (which is invoked every 0.25 s during gameplay).
 */
function getAnchorDistMap(): Map<string, number> {
  if (cachedAnchorDistMap) return cachedAnchorDistMap;
  const spine = loadRoadSpine();
  cachedAnchorDistMap = new Map(
    spine.anchors.map((a) => [a.id, a.distanceFromStart]),
  );
  return cachedAnchorDistMap;
}

/**
 * Find the anchor closest to a given distance, within a threshold.
 * Returns null if no anchor is within the threshold.
 */
export function getAnchorAtDistance(
  distance: number,
  threshold = 500,
): AnchorPoint | null {
  const spine = loadRoadSpine();
  let closest: AnchorPoint | null = null;
  let closestDelta = Infinity;

  for (const anchor of spine.anchors) {
    const delta = Math.abs(anchor.distanceFromStart - distance);
    if (delta < threshold && delta < closestDelta) {
      closest = anchor;
      closestDelta = delta;
    }
  }

  return closest;
}

/**
 * Get the next anchor ahead of the current distance.
 * Returns null if there are no more anchors ahead.
 */
export function getNextAnchor(currentDistance: number): AnchorPoint | null {
  const spine = loadRoadSpine();
  return (
    spine.anchors.find((a) => a.distanceFromStart > currentDistance) ?? null
  );
}

/**
 * Get an anchor by its unique id.
 * Returns null if no anchor with that id exists.
 */
export function getAnchorById(id: string): AnchorPoint | null {
  const spine = loadRoadSpine();
  return spine.anchors.find((a) => a.id === id) ?? null;
}

/**
 * Find the road-spine region that contains the given distance from start.
 * Distance is clamped to [0, spine.totalDistance] before lookup so that
 * slightly negative or over-max values resolve to the nearest terminal region
 * rather than silently returning null.
 *
 * Returns null when the spine has no regions or the clamped distance falls
 * outside every defined region.
 *
 * Region boundaries belong to the next region (open on the right), except
 * for the last region which is closed on both ends.
 *
 * Throws if a region references an anchor id that does not exist in the spine,
 * matching the behaviour of BiomeService.precomputeRegions.
 */
export function getRegionAtDistance(distance: number): Region | null {
  const spine = loadRoadSpine();
  const regions = spine.regions;
  if (!regions || regions.length === 0) return null;

  const clamped = Math.max(0, Math.min(distance, spine.totalDistance));
  const anchorDistance = getAnchorDistMap();

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const [startId, endId] = region.anchorRange;
    const start = anchorDistance.get(startId);
    const end = anchorDistance.get(endId);
    if (start === undefined)
      throw new Error(
        `getRegionAtDistance: unknown anchor id "${startId}" in region "${region.id}"`,
      );
    if (end === undefined)
      throw new Error(
        `getRegionAtDistance: unknown anchor id "${endId}" in region "${region.id}"`,
      );
    const isLast = i === regions.length - 1;
    const withinEnd = isLast ? clamped <= end : clamped < end;
    if (clamped >= start && withinEnd) return region;
  }

  return null;
}
