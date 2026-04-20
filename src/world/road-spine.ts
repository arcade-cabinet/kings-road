import {
  type AnchorPoint,
  type Region,
  type RoadSpine,
  RoadSpineSchema,
} from '@/schemas/world.schema';
import roadSpineData from '../content/world/road-spine.json';

let cachedSpine: RoadSpine | null = null;

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
 * Returns null when the spine has no regions or the distance falls outside
 * every defined region.
 *
 * Region boundaries belong to the next region (open on the right), except
 * for the last region which is closed on both ends.
 */
export function getRegionAtDistance(distance: number): Region | null {
  const spine = loadRoadSpine();
  const regions = spine.regions;
  if (!regions || regions.length === 0) return null;

  const anchorDistance = new Map<string, number>(
    spine.anchors.map((a) => [a.id, a.distanceFromStart]),
  );

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const [startId, endId] = region.anchorRange;
    const start = anchorDistance.get(startId) ?? 0;
    const end = anchorDistance.get(endId) ?? spine.totalDistance;
    const isLast = i === regions.length - 1;
    const withinEnd = isLast ? distance <= end : distance < end;
    if (distance >= start && withinEnd) return region;
  }

  return null;
}
