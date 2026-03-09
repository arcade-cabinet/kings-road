import { RoadSpineSchema, type RoadSpine, type AnchorPoint } from '../../schemas/world.schema';
import roadSpineData from '../../../content/world/road-spine.json';

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
  return spine.anchors.find((a) => a.distanceFromStart > currentDistance) ?? null;
}

/**
 * Get an anchor by its unique id.
 * Returns null if no anchor with that id exists.
 */
export function getAnchorById(id: string): AnchorPoint | null {
  const spine = loadRoadSpine();
  return spine.anchors.find((a) => a.id === id) ?? null;
}
