/**
 * composeBuilding — Phase B1
 *
 * Given a rectangular footprint and a hydrated RNG, return a list of
 * BuildingPlacements in building-local space (origin at footprint center, y=0).
 *
 * Rules:
 *  - Wall body: pick a catalog wall whose footprint fits within the given footprint.
 *  - Roof: pick a catalog roof whose footprint covers the chosen wall.
 *  - Chimney: 60% chance, placed at roof level with small X/Z jitter.
 *  - Door + window: added for shell walls (no baked openings) on the +X face.
 *
 * Pure function — no React, no Three.js, no side-effects. Deterministic when
 * called with a createRng(seed)-hydrated rng. Y-values are layer-stratified so
 * no two parts z-fight.
 */
import { getPartsByRole, VILLAGE_PARTS } from './parts/catalog';
import type { VillageFootprint, VillagePart } from './parts/schema';
import type { BuildingPlacement } from './types';

const WALL_HEIGHT = 3;
const ROOF_HEIGHT = 1.5;
const CHIMNEY_PROB = 0.6;

/** Wall IDs that lack baked door + window sub-meshes; need inserts. */
const SHELL_WALL_IDS = new Set([
  'building-shape-1',
  'building-shape-2',
  'building-shape-3-2-story',
]);

const ROTATIONS = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2] as const;

function assetId(part: VillagePart): string {
  return part.glbPath.replace(/^\/assets\//, '');
}

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickWall(footprint: VillageFootprint, rng: () => number): VillagePart {
  const allWalls = getPartsByRole('wall');
  const fits = allWalls.filter(
    (w) =>
      w.footprint.width <= footprint.width &&
      w.footprint.depth <= footprint.depth,
  );
  return pickRandom(fits.length > 0 ? fits : allWalls, rng);
}

function pickRoof(wall: VillagePart, rng: () => number): VillagePart | null {
  const allRoofs = getPartsByRole('roof');
  if (allRoofs.length === 0) return null;
  const covering = allRoofs.filter(
    (r) =>
      r.footprint.width >= wall.footprint.width &&
      r.footprint.depth >= wall.footprint.depth,
  );
  if (covering.length > 0) return pickRandom(covering, rng);
  // Fallback: the largest roof by area. Safe because allRoofs is non-empty here.
  return allRoofs.reduce((best, r) =>
    r.footprint.width * r.footprint.depth >
    best.footprint.width * best.footprint.depth
      ? r
      : best,
  );
}

export function composeBuilding(
  footprint: VillageFootprint,
  rng: () => number,
): BuildingPlacement[] {
  const placements: BuildingPlacement[] = [];

  const wall = pickWall(footprint, rng);
  const wallRotY = pickRandom(ROTATIONS, rng);

  placements.push({
    assetId: assetId(wall),
    position: { x: 0, y: 0, z: 0 },
    rotation: wallRotY,
    scale: 1,
    role: 'wall',
  });

  const roof = pickRoof(wall, rng);
  if (roof !== null) {
    placements.push({
      assetId: assetId(roof),
      position: { x: 0, y: WALL_HEIGHT, z: 0 },
      rotation: wallRotY,
      scale: 1,
      role: 'roof',
    });
  }

  if (rng() < CHIMNEY_PROB) {
    const chimney = VILLAGE_PARTS.chimny;
    const jitterX = (rng() - 0.5) * wall.footprint.width * 0.4;
    const jitterZ = (rng() - 0.5) * wall.footprint.depth * 0.4;
    placements.push({
      assetId: assetId(chimney),
      position: {
        x: jitterX,
        y: WALL_HEIGHT + ROOF_HEIGHT,
        z: jitterZ,
      },
      rotation: 0,
      scale: 1,
      role: 'chimney',
    });
  }

  if (SHELL_WALL_IDS.has(wall.id)) {
    const door = VILLAGE_PARTS['door-1'];
    const windowPart = VILLAGE_PARTS['window-full'];
    // Inserts sit on the wall's +X face in unrotated building-local space.
    // Rotate the offset by wallRotY so they follow the wall after rotation;
    // GlbInstancer composes position+rotation as T·R and does not rotate the
    // translation vector itself, so we have to pre-rotate the offset here.
    const faceX = wall.footprint.width / 2;
    const cos = Math.cos(wallRotY);
    const sin = Math.sin(wallRotY);
    const offX = faceX * cos;
    const offZ = faceX * sin;
    placements.push({
      assetId: assetId(door),
      position: { x: offX, y: 0, z: offZ },
      rotation: wallRotY,
      scale: 1,
      role: 'door',
    });
    placements.push({
      assetId: assetId(windowPart),
      position: { x: offX, y: 1.5, z: offZ },
      rotation: wallRotY,
      scale: 1,
      role: 'window',
    });
  }

  return placements;
}
