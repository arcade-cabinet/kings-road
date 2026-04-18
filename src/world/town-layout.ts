import { TILE_SIZE } from '@/factories/building-factory';
import type { TownConfig } from '@/schemas/town.schema';

export interface PlacedBuilding {
  archetype: string;
  label: string;
  worldX: number;
  worldZ: number;
  rotation: number;
  overrides?: Record<string, unknown>;
}

export interface BoundarySegment {
  x: number;
  z: number;
  rotY: number;
  height: number;
}

export interface ApproachData {
  type: string;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  width: number;
}

/**
 * Layout buildings from a town config into world positions.
 * The organic layout places buildings in a rough circle around the center
 * with position jitter and slight rotation variation.
 */
export function layoutTown(
  config: TownConfig,
  chunkOriginX: number,
  chunkOriginZ: number,
): PlacedBuilding[] {
  const [centerX, centerZ] = config.center;
  const worldCenterX = chunkOriginX + centerX * TILE_SIZE;
  const worldCenterZ = chunkOriginZ + centerZ * TILE_SIZE;

  const placed: PlacedBuilding[] = [];

  for (const building of config.buildings) {
    const [bx, bz] = building.position;

    // Convert tile position to world, relative to chunk origin + center
    let worldX = worldCenterX + bx * TILE_SIZE;
    let worldZ = worldCenterZ + bz * TILE_SIZE;

    // Add organic jitter for organic layout
    if (config.layout === 'organic') {
      // Simple deterministic jitter from position
      const hash =
        Math.abs(Math.sin(bx * 12.9898 + bz * 78.233) * 43758.5453) % 1;
      worldX += (hash - 0.5) * 4; // +/-2 units
      worldZ += (Math.abs(Math.sin(hash * 100)) - 0.5) * 4;
    }

    const rotation = building.rotation ?? 0;
    // Add organic rotation jitter
    const finalRotation =
      config.layout === 'organic'
        ? rotation + Math.sin(bx * 7 + bz * 13) * 5 // +/-5 deg extra jitter
        : rotation;

    placed.push({
      archetype: building.archetype,
      label: building.label,
      worldX,
      worldZ,
      rotation: finalRotation,
      overrides: building.overrides as Record<string, unknown> | undefined,
    });
  }

  return placed;
}

/**
 * Generate boundary segments (palisade posts, wall sections, etc.)
 * around a town's perimeter.
 */
export function generateBoundary(
  config: TownConfig,
  chunkOriginX: number,
  chunkOriginZ: number,
): BoundarySegment[] {
  if (config.boundary === 'none') return [];

  const [centerX, centerZ] = config.center;
  const worldCenterX = chunkOriginX + centerX * TILE_SIZE;
  const worldCenterZ = chunkOriginZ + centerZ * TILE_SIZE;

  // Estimate town radius from building positions
  let maxDist = 20; // minimum radius
  for (const b of config.buildings) {
    const dist =
      Math.sqrt(b.position[0] ** 2 + b.position[1] ** 2) * TILE_SIZE + 12;
    if (dist > maxDist) maxDist = dist;
  }
  const radius = maxDist;

  const segments: BoundarySegment[] = [];
  const height =
    config.boundary === 'stone_wall'
      ? 4.0
      : config.boundary === 'palisade'
        ? 3.0
        : 1.5; // hedge

  // Posts/segments around perimeter
  const postSpacing = config.boundary === 'hedge' ? 3.0 : 2.0;
  const circumference = 2 * Math.PI * radius;
  const numPosts = Math.floor(circumference / postSpacing);

  // Gate opening -- south side (angle ~ PI/2, facing the King's Road)
  const gateAngle = Math.PI / 2;
  const gateWidth = 0.15; // radians

  for (let i = 0; i < numPosts; i++) {
    const angle = (i / numPosts) * Math.PI * 2;

    // Skip gate opening
    if (Math.abs(angle - gateAngle) < gateWidth) continue;

    segments.push({
      x: worldCenterX + Math.cos(angle) * radius,
      z: worldCenterZ + Math.sin(angle) * radius,
      rotY: angle + Math.PI / 2,
      height,
    });
  }

  return segments;
}

/**
 * Generate approach data (meadow/stream connecting town to King's Road).
 */
export function generateApproach(
  config: TownConfig,
  chunkOriginX: number,
  chunkOriginZ: number,
): ApproachData {
  const [centerX, centerZ] = config.center;
  const worldCenterX = chunkOriginX + centerX * TILE_SIZE;
  const worldCenterZ = chunkOriginZ + centerZ * TILE_SIZE;

  // Approach extends from the town gate toward the King's Road (south)
  return {
    type: config.approach,
    startX: worldCenterX,
    startZ: worldCenterZ + 30, // just outside the gate
    endX: worldCenterX,
    endZ: worldCenterZ + 60, // toward the road
    width: 8,
  };
}
