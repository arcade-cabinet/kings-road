/**
 * Mile-marker placement logic for the King's Road.
 *
 * Generates deterministic, evenly-spaced marker positions along the 1D road
 * spine. Each marker carries its kilometre label (integer km from Ashford).
 * Markers at boundary 0 and totalDistance are intentionally excluded — those
 * positions are anchor settlements (Ashford / Grailsend) with their own
 * diegetic signage.
 */

export interface MileMarkerPosition {
  /** Road distance from Ashford (same units as the road spine, metres). */
  distance: number;
  /** Integer kilometre label shown on the stone face. */
  labelKm: number;
}

/**
 * Compute the positions and labels for all road mile-markers.
 *
 * @param totalDistance  Full road length in metres (e.g. 30000).
 * @param intervalMeters Spacing between markers in metres (e.g. 2000).
 * @param skipBoundary   Distance threshold: markers closer than this to 0 or
 *                       totalDistance are omitted (avoids overlapping anchor
 *                       settlements). Default 1 — effectively only skips exact
 *                       boundary hits when set to 1.
 * @returns Array of marker descriptors sorted ascending by distance.
 */
export function computeMileMarkerPositions(
  totalDistance: number,
  intervalMeters: number,
  skipBoundary = 1,
): MileMarkerPosition[] {
  if (intervalMeters <= 0 || totalDistance <= 0) return [];

  const markers: MileMarkerPosition[] = [];

  for (let d = intervalMeters; d < totalDistance; d += intervalMeters) {
    if (d < skipBoundary || d > totalDistance - skipBoundary) continue;
    markers.push({
      distance: d,
      labelKm: Math.round(d / 1000),
    });
  }

  return markers;
}
