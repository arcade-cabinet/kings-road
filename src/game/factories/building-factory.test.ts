import { describe, expect, it } from 'vitest';
import type { BuildingArchetype } from '../../schemas/building.schema';
import {
  generateBuildingGeometry,
  generateFloorPlates,
  generateStairs,
  generateWallSegments,
} from './building-factory';

describe('generateWallSegments', () => {
  it('generates 4 wall segments for a closed building', () => {
    const segments = generateWallSegments(2, 2, 0, false);
    // Left, right, back walls (3) + front wall split into 3 for door = 6 total
    expect(segments.filter((s) => s.wall === 'left').length).toBe(1);
    expect(segments.filter((s) => s.wall === 'right').length).toBe(1);
    expect(segments.filter((s) => s.wall === 'back').length).toBe(1);
    expect(
      segments.filter((s) => s.wall === 'front').length,
    ).toBeGreaterThanOrEqual(3);
  });

  it('generates 3 walls for an open-front building', () => {
    const segments = generateWallSegments(2, 2, 0, true);
    expect(segments.filter((s) => s.wall === 'front').length).toBe(0);
    expect(segments.length).toBe(3);
  });

  it('generates window cutout on upper floor', () => {
    const segments = generateWallSegments(2, 2, 1, false);
    const frontParts = segments.filter((s) => s.wall === 'front');
    expect(frontParts.length).toBeGreaterThanOrEqual(4);
  });
});

describe('generateFloorPlates', () => {
  it('generates 1 floor for single-story', () => {
    const floors = generateFloorPlates(2, 2, 1);
    expect(floors.length).toBe(1);
    expect(floors[0].hasStairHole).toBe(false);
  });

  it('generates 3 floor pieces for 2-story (1 ground + 2 upper pieces)', () => {
    const floors = generateFloorPlates(2, 2, 2);
    expect(floors.length).toBe(3);
  });
});

describe('generateStairs', () => {
  it('returns empty for single-story', () => {
    expect(generateStairs(2, 2, 1).length).toBe(0);
  });

  it('returns 10 steps for 2-story', () => {
    expect(generateStairs(2, 2, 2).length).toBe(10);
  });

  it('returns 20 steps for 3-story', () => {
    expect(generateStairs(2, 2, 3).length).toBe(20);
  });
});

describe('generateBuildingGeometry', () => {
  it('generates complete geometry for a 2-story tavern', () => {
    const tavern: BuildingArchetype = {
      id: 'tavern',
      stories: 2,
      footprint: { width: 3, depth: 4 },
      wallMaterial: 'plaster',
      roofStyle: 'thatch',
      openFront: false,
      features: ['door', 'windows', 'hearth'],
      interiorSlots: [],
    };
    const geo = generateBuildingGeometry(tavern);
    expect(geo.walls.length).toBeGreaterThan(0);
    expect(geo.floors.length).toBe(3);
    expect(geo.stairs.length).toBe(10);
    expect(geo.doors.length).toBe(1);
    expect(geo.windows.length).toBe(1);
    expect(geo.collisionBoxes.length).toBeGreaterThan(0);
  });

  it('generates no stairs for single-story', () => {
    const cottage: BuildingArchetype = {
      id: 'cottage',
      stories: 1,
      footprint: { width: 2, depth: 2 },
      wallMaterial: 'plaster',
      roofStyle: 'thatch',
      openFront: false,
      features: ['door'],
      interiorSlots: [],
    };
    const geo = generateBuildingGeometry(cottage);
    expect(geo.stairs.length).toBe(0);
  });

  it('generates no front wall for smithy (openFront)', () => {
    const smithy: BuildingArchetype = {
      id: 'smithy',
      stories: 1,
      footprint: { width: 2, depth: 2 },
      wallMaterial: 'stone',
      roofStyle: 'slate',
      openFront: true,
      features: ['anvil'],
      interiorSlots: [],
    };
    const geo = generateBuildingGeometry(smithy);
    const frontWalls = geo.walls.filter((w) => w.wall === 'front');
    expect(frontWalls.length).toBe(0);
    expect(geo.doors.length).toBe(0);
  });
});
