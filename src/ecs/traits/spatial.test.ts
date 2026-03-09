import { createWorld } from 'koota';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Position, Rotation, Velocity } from './spatial';

describe('Spatial Traits', () => {
  let world: ReturnType<typeof createWorld>;

  beforeEach(() => {
    world = createWorld();
  });

  afterEach(() => {
    world.destroy();
  });

  describe('Position', () => {
    it('spawns an entity with default position (0, 0, 0)', () => {
      const entity = world.spawn(Position);
      const pos = entity.get(Position);
      expect(pos).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('spawns an entity with custom position', () => {
      const entity = world.spawn(Position({ x: 10, y: 5, z: -3 }));
      const pos = entity.get(Position);
      expect(pos).toEqual({ x: 10, y: 5, z: -3 });
    });

    it('allows setting position after spawn', () => {
      const entity = world.spawn(Position);
      entity.set(Position, { x: 42, y: 0, z: 99 });
      const pos = entity.get(Position);
      expect(pos?.x).toBe(42);
      expect(pos?.z).toBe(99);
    });
  });

  describe('Velocity', () => {
    it('spawns with default velocity (0, 0, 0)', () => {
      const entity = world.spawn(Velocity);
      const vel = entity.get(Velocity);
      expect(vel).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('spawns with custom velocity', () => {
      const entity = world.spawn(Velocity({ x: 1, y: 0, z: -1 }));
      const vel = entity.get(Velocity);
      expect(vel).toEqual({ x: 1, y: 0, z: -1 });
    });
  });

  describe('Rotation', () => {
    it('spawns with default rotation (0, 0)', () => {
      const entity = world.spawn(Rotation);
      const rot = entity.get(Rotation);
      expect(rot).toEqual({ yaw: 0, pitch: 0 });
    });

    it('spawns with custom rotation', () => {
      const entity = world.spawn(Rotation({ yaw: Math.PI, pitch: 0.5 }));
      const rot = entity.get(Rotation);
      expect(rot?.yaw).toBeCloseTo(Math.PI);
      expect(rot?.pitch).toBeCloseTo(0.5);
    });
  });

  describe('combined spatial entity', () => {
    it('spawns an entity with all spatial traits', () => {
      const entity = world.spawn(
        Position({ x: 1, y: 2, z: 3 }),
        Velocity({ x: 0.1, y: 0, z: 0.2 }),
        Rotation({ yaw: 1.5, pitch: 0 }),
      );
      expect(entity.has(Position)).toBe(true);
      expect(entity.has(Velocity)).toBe(true);
      expect(entity.has(Rotation)).toBe(true);
    });
  });
});
