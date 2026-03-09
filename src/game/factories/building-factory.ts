import type { BuildingArchetype } from '../../schemas/building.schema';

// Constants
export const TILE_SIZE = 4; // world units per tile
export const WALL_H = 3.0; // floor-to-ceiling height
export const WALL_T = 0.2; // wall thickness
export const DOOR_W = 1.5;
export const DOOR_H = 2.5;
export const WINDOW_W = 1.5;
export const WINDOW_H = 1.0;
export const WINDOW_SILL_H = 1.0;
export const STAIR_W = 1.2;
export const STAIR_D = 3.0;

// Types
export interface WallSegment {
  wall: 'left' | 'right' | 'back' | 'front';
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
}

export interface FloorPlate {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  hasStairHole: boolean;
}

export interface StairStep {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
}

export interface BuildingGeometry {
  walls: WallSegment[];
  floors: FloorPlate[];
  stairs: StairStep[];
  doors: { x: number; y: number; z: number; rotY: number }[];
  windows: { x: number; y: number; z: number; rotY: number }[];
  roofCenter: { x: number; y: number; z: number };
  roofSize: { width: number; depth: number };
  collisionBoxes: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minY: number;
    maxY: number;
  }[];
}

/**
 * Generate wall segments for a single story of a building.
 * Ground floor closed front gets a door cutout (3 pieces: left, right, lintel).
 * Upper floor closed front gets a window cutout (4 pieces: left, right, sill, lintel).
 */
export function generateWallSegments(
  widthTiles: number,
  depthTiles: number,
  storyIndex: number,
  openFront: boolean,
): WallSegment[] {
  const w = widthTiles * TILE_SIZE;
  const d = depthTiles * TILE_SIZE;
  const baseY = storyIndex * WALL_H;
  const centerY = baseY + WALL_H / 2;

  const segments: WallSegment[] = [];

  // Left wall (along Z axis, at x = -w/2)
  segments.push({
    wall: 'left',
    x: -w / 2 + WALL_T / 2,
    y: centerY,
    z: 0,
    sx: WALL_T,
    sy: WALL_H,
    sz: d,
  });

  // Right wall (at x = +w/2)
  segments.push({
    wall: 'right',
    x: w / 2 - WALL_T / 2,
    y: centerY,
    z: 0,
    sx: WALL_T,
    sy: WALL_H,
    sz: d,
  });

  // Back wall (along X axis, at z = -d/2)
  segments.push({
    wall: 'back',
    x: 0,
    y: centerY,
    z: -d / 2 + WALL_T / 2,
    sx: w,
    sy: WALL_H,
    sz: WALL_T,
  });

  // Front wall
  if (!openFront) {
    const frontZ = d / 2 - WALL_T / 2;

    if (storyIndex === 0) {
      // Ground floor: door cutout → 3 segments (left side, right side, lintel)
      const doorLeftEdge = -DOOR_W / 2;
      const doorRightEdge = DOOR_W / 2;
      const leftSideWidth = w / 2 + doorLeftEdge; // from -w/2 to doorLeftEdge
      const rightSideWidth = w / 2 - doorRightEdge; // from doorRightEdge to w/2

      // Left of door
      segments.push({
        wall: 'front',
        x: -w / 2 + leftSideWidth / 2,
        y: centerY,
        z: frontZ,
        sx: leftSideWidth,
        sy: WALL_H,
        sz: WALL_T,
      });

      // Right of door
      segments.push({
        wall: 'front',
        x: w / 2 - rightSideWidth / 2,
        y: centerY,
        z: frontZ,
        sx: rightSideWidth,
        sy: WALL_H,
        sz: WALL_T,
      });

      // Lintel above door
      const lintelH = WALL_H - DOOR_H;
      segments.push({
        wall: 'front',
        x: 0,
        y: baseY + DOOR_H + lintelH / 2,
        z: frontZ,
        sx: DOOR_W,
        sy: lintelH,
        sz: WALL_T,
      });
    } else {
      // Upper floors: window cutout → 4 segments (left, right, sill, lintel)
      const winLeftEdge = -WINDOW_W / 2;
      const winRightEdge = WINDOW_W / 2;
      const leftSideWidth = w / 2 + winLeftEdge;
      const rightSideWidth = w / 2 - winRightEdge;

      // Left of window
      segments.push({
        wall: 'front',
        x: -w / 2 + leftSideWidth / 2,
        y: centerY,
        z: frontZ,
        sx: leftSideWidth,
        sy: WALL_H,
        sz: WALL_T,
      });

      // Right of window
      segments.push({
        wall: 'front',
        x: w / 2 - rightSideWidth / 2,
        y: centerY,
        z: frontZ,
        sx: rightSideWidth,
        sy: WALL_H,
        sz: WALL_T,
      });

      // Sill (below window)
      segments.push({
        wall: 'front',
        x: 0,
        y: baseY + WINDOW_SILL_H / 2,
        z: frontZ,
        sx: WINDOW_W,
        sy: WINDOW_SILL_H,
        sz: WALL_T,
      });

      // Lintel (above window)
      const lintelBottom = WINDOW_SILL_H + WINDOW_H;
      const lintelH = WALL_H - lintelBottom;
      segments.push({
        wall: 'front',
        x: 0,
        y: baseY + lintelBottom + lintelH / 2,
        z: frontZ,
        sx: WINDOW_W,
        sy: lintelH,
        sz: WALL_T,
      });
    }
  }

  return segments;
}

/**
 * Generate floor plates for the building.
 * Ground floor is a solid plate.
 * Upper floors have a main area + side strip with stair hole in back-right corner.
 */
export function generateFloorPlates(
  widthTiles: number,
  depthTiles: number,
  stories: number,
): FloorPlate[] {
  const w = widthTiles * TILE_SIZE;
  const d = depthTiles * TILE_SIZE;
  const floorThickness = 0.15;
  const floors: FloorPlate[] = [];

  // Ground floor: solid plate at y=0
  floors.push({
    x: 0,
    y: -floorThickness / 2,
    z: 0,
    sx: w,
    sy: floorThickness,
    sz: d,
    hasStairHole: false,
  });

  // Upper floors
  for (let i = 1; i < stories; i++) {
    const floorY = i * WALL_H - floorThickness / 2;

    // Main floor area (everything except the stair hole in back-right)
    const holeW = STAIR_W + 0.4; // small margin around stairs
    const holeD = STAIR_D + 0.4;
    const mainW = w - holeW;

    // Main area (left portion, full depth)
    floors.push({
      x: -holeW / 2,
      y: floorY,
      z: 0,
      sx: mainW,
      sy: floorThickness,
      sz: d,
      hasStairHole: false,
    });

    // Side strip (right portion, front part only - behind the hole)
    const stripD = d - holeD;
    floors.push({
      x: w / 2 - holeW / 2,
      y: floorY,
      z: d / 2 - stripD / 2,
      sx: holeW,
      sy: floorThickness,
      sz: stripD,
      hasStairHole: true,
    });
  }

  return floors;
}

/**
 * Generate stair steps between floors.
 * 10 steps per flight, positioned in the back-right corner.
 */
export function generateStairs(
  widthTiles: number,
  depthTiles: number,
  stories: number,
): StairStep[] {
  if (stories < 2) return [];

  const w = widthTiles * TILE_SIZE;
  const d = depthTiles * TILE_SIZE;
  const stepsPerFlight = 10;
  const stepH = WALL_H / stepsPerFlight;
  const stepD = STAIR_D / stepsPerFlight;
  const steps: StairStep[] = [];

  for (let flight = 0; flight < stories - 1; flight++) {
    const baseY = flight * WALL_H;
    // Stairs in back-right corner, going from back toward front
    const stairX = w / 2 - STAIR_W / 2 - 0.2; // offset from right wall
    const stairStartZ = -d / 2 + 0.2; // start near back wall

    for (let s = 0; s < stepsPerFlight; s++) {
      steps.push({
        x: stairX,
        y: baseY + stepH * (s + 0.5),
        z: stairStartZ + stepD * (s + 0.5),
        sx: STAIR_W,
        sy: stepH,
        sz: stepD,
      });
    }
  }

  return steps;
}

/**
 * Generate complete building geometry from an archetype.
 */
export function generateBuildingGeometry(
  archetype: BuildingArchetype,
): BuildingGeometry {
  const { stories, footprint, openFront, features } = archetype;
  const { width: widthTiles, depth: depthTiles } = footprint;
  const w = widthTiles * TILE_SIZE;
  const d = depthTiles * TILE_SIZE;

  const walls: WallSegment[] = [];
  const doors: BuildingGeometry['doors'] = [];
  const windows: BuildingGeometry['windows'] = [];

  for (let story = 0; story < stories; story++) {
    const storyWalls = generateWallSegments(
      widthTiles,
      depthTiles,
      story,
      openFront,
    );
    walls.push(...storyWalls);

    if (!openFront) {
      const frontZ = d / 2 - WALL_T / 2;

      if (story === 0 && features.includes('door')) {
        doors.push({
          x: 0,
          y: DOOR_H / 2,
          z: frontZ,
          rotY: 0,
        });
      }

      if (story > 0 && features.includes('windows')) {
        windows.push({
          x: 0,
          y: story * WALL_H + WINDOW_SILL_H + WINDOW_H / 2,
          z: frontZ,
          rotY: 0,
        });
      }
    }
  }

  const floors = generateFloorPlates(widthTiles, depthTiles, stories);
  const stairs = generateStairs(widthTiles, depthTiles, stories);

  const totalH = stories * WALL_H;
  const roofCenter = {
    x: 0,
    y: totalH + (archetype.roofStyle === 'flat' ? 0.15 : stories * 0.75),
    z: 0,
  };
  const roofSize = { width: w, depth: d };

  // Collision AABB for the whole building
  const collisionBoxes: BuildingGeometry['collisionBoxes'] = [
    {
      minX: -w / 2,
      maxX: w / 2,
      minZ: -d / 2,
      maxZ: d / 2,
      minY: 0,
      maxY: totalH,
    },
  ];

  return {
    walls,
    floors,
    stairs,
    doors,
    windows,
    roofCenter,
    roofSize,
    collisionBoxes,
  };
}
