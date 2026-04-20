/**
 * signpost-text — pure helper for generating directional settlement signpost
 * labels. Each anchor settlement gets a signpost showing the names and
 * distances of the adjacent settlements along the King's Road.
 *
 * Design rules (pastoral, illuminated-manuscript mood):
 * - Distances rendered in leagues (1 league ≈ 1000 game units).
 * - Arrow symbols are plain ASCII to avoid font glyph issues on canvas.
 * - "Grailsend" is the sacred terminus: no forward label past it.
 * - "Ashford" is home: no backward label before it.
 */

export interface SignpostLabels {
  /** Text for the arm pointing back toward the road start (left arm). */
  left: string | null;
  /** Text for the arm pointing forward toward the road end (right arm). */
  right: string | null;
}

export interface SignpostAnchor {
  name: string;
  distanceFromStart: number;
}

/**
 * Convert a game-unit distance gap into a human-readable league string.
 * 1 league = 1000 game units; fractional leagues are shown to one decimal.
 */
export function distanceToLeagues(gameUnits: number): string {
  const leagues = gameUnits / 1000;
  if (leagues < 0.1) return 'near';
  if (Number.isInteger(leagues) || leagues >= 10) {
    return `${Math.round(leagues)} league${Math.round(leagues) === 1 ? '' : 's'}`;
  }
  return `${leagues.toFixed(1)} leagues`;
}

/**
 * Given the full ordered list of anchors and the index of the current
 * settlement, produce the two directional labels for its signpost.
 *
 * - `left`  → toward Ashford (back, index - 1)
 * - `right` → toward Grailsend (forward, index + 1)
 *
 * Returns null for a side that has no neighbour (start/end of road).
 */
export function generateSignpostText(
  anchors: SignpostAnchor[],
  currentIndex: number,
): SignpostLabels {
  if (
    anchors.length === 0 ||
    currentIndex < 0 ||
    currentIndex >= anchors.length
  ) {
    return { left: null, right: null };
  }

  const current = anchors[currentIndex];

  let left: string | null = null;
  if (currentIndex > 0) {
    const prev = anchors[currentIndex - 1];
    const gap = current.distanceFromStart - prev.distanceFromStart;
    left = `<- ${prev.name} (${distanceToLeagues(gap)})`;
  }

  let right: string | null = null;
  if (currentIndex < anchors.length - 1) {
    const next = anchors[currentIndex + 1];
    const gap = next.distanceFromStart - current.distanceFromStart;
    right = `${next.name} (${distanceToLeagues(gap)}) ->`;
  }

  return { left, right };
}

/**
 * Return all signpost placements for a road spine.
 * Each anchor gets a signpost positioned SIGNPOST_OFFSET_M metres before its
 * distanceFromStart on the Z axis (the road runs along +Z).
 */
export const SIGNPOST_OFFSET_M = 20;

export interface SignpostPlacement {
  anchorId: string;
  anchorName: string;
  /** Road-spine distance (game units) of the anchor settlement. */
  distanceFromStart: number;
  labels: SignpostLabels;
}

export function getAllSignpostPlacements(
  anchors: SignpostAnchor[],
  anchorIds: string[],
): SignpostPlacement[] {
  return anchors.map((anchor, i) => ({
    anchorId: anchorIds[i] ?? `anchor-${i}`,
    anchorName: anchor.name,
    distanceFromStart: anchor.distanceFromStart,
    labels: generateSignpostText(anchors, i),
  }));
}
