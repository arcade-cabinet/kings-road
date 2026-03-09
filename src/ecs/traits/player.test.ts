import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWorld } from 'koota';
import {
  IsPlayer,
  Health,
  Stamina,
  Movement,
  PlayerInput,
  DistanceTraveled,
} from './player';

describe('Player Traits', () => {
  let world: ReturnType<typeof createWorld>;

  beforeEach(() => {
    world = createWorld();
  });

  afterEach(() => {
    world.destroy();
  });

  describe('IsPlayer', () => {
    it('is a tag trait with no data', () => {
      const entity = world.spawn(IsPlayer);
      expect(entity.has(IsPlayer)).toBe(true);
    });
  });

  describe('Health', () => {
    it('has default values of 100/100', () => {
      const entity = world.spawn(Health);
      const hp = entity.get(Health);
      expect(hp).toEqual({ current: 100, max: 100 });
    });

    it('accepts custom health values', () => {
      const entity = world.spawn(Health({ current: 50, max: 200 }));
      const hp = entity.get(Health);
      expect(hp?.current).toBe(50);
      expect(hp?.max).toBe(200);
    });

    it('can be updated to reflect damage', () => {
      const entity = world.spawn(Health);
      entity.set(Health, { current: 75, max: 100 });
      expect(entity.get(Health)?.current).toBe(75);
    });
  });

  describe('Stamina', () => {
    it('has default values of 100/100', () => {
      const entity = world.spawn(Stamina);
      const stam = entity.get(Stamina);
      expect(stam).toEqual({ current: 100, max: 100 });
    });
  });

  describe('Movement', () => {
    it('has correct defaults', () => {
      const entity = world.spawn(Movement);
      const mov = entity.get(Movement);
      expect(mov).toEqual({
        speed: 0,
        angularSpeed: 0,
        isSprinting: false,
        isGrounded: true,
      });
    });

    it('can be set to sprinting', () => {
      const entity = world.spawn(Movement);
      entity.set(Movement, { speed: 7, angularSpeed: 0, isSprinting: true, isGrounded: true });
      expect(entity.get(Movement)?.isSprinting).toBe(true);
      expect(entity.get(Movement)?.speed).toBe(7);
    });
  });

  describe('PlayerInput', () => {
    it('defaults all inputs to false', () => {
      const entity = world.spawn(PlayerInput);
      const input = entity.get(PlayerInput);
      expect(input?.forward).toBe(false);
      expect(input?.backward).toBe(false);
      expect(input?.left).toBe(false);
      expect(input?.right).toBe(false);
      expect(input?.strafeLeft).toBe(false);
      expect(input?.strafeRight).toBe(false);
      expect(input?.jump).toBe(false);
      expect(input?.walk).toBe(false);
      expect(input?.interact).toBe(false);
    });

    it('can update partial input', () => {
      const entity = world.spawn(PlayerInput);
      entity.set(PlayerInput, { forward: true });
      expect(entity.get(PlayerInput)?.forward).toBe(true);
      // Other values remain default
      expect(entity.get(PlayerInput)?.backward).toBe(false);
    });
  });

  describe('DistanceTraveled', () => {
    it('starts at zero', () => {
      const entity = world.spawn(DistanceTraveled);
      const dist = entity.get(DistanceTraveled);
      expect(dist).toEqual({ total: 0, sinceLastFeature: 0 });
    });

    it('can accumulate distance', () => {
      const entity = world.spawn(DistanceTraveled);
      entity.set(DistanceTraveled, { total: 1500, sinceLastFeature: 200 });
      expect(entity.get(DistanceTraveled)?.total).toBe(1500);
    });
  });

  describe('full player entity', () => {
    it('spawns a complete player with all traits', () => {
      const entity = world.spawn(
        IsPlayer,
        Health,
        Stamina,
        Movement,
        PlayerInput,
        DistanceTraveled,
      );
      expect(entity.has(IsPlayer)).toBe(true);
      expect(entity.has(Health)).toBe(true);
      expect(entity.has(Stamina)).toBe(true);
      expect(entity.has(Movement)).toBe(true);
      expect(entity.has(PlayerInput)).toBe(true);
      expect(entity.has(DistanceTraveled)).toBe(true);
    });
  });
});
