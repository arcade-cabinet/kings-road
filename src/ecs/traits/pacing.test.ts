import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWorld } from 'koota';
import { RoadPosition, IsOnRoad, IsAnchor, IsFeature } from './pacing';

describe('Pacing Traits', () => {
  let world: ReturnType<typeof createWorld>;

  beforeEach(() => {
    world = createWorld();
  });

  afterEach(() => {
    world.destroy();
  });

  describe('RoadPosition', () => {
    it('defaults to distance 0', () => {
      const entity = world.spawn(RoadPosition);
      expect(entity.get(RoadPosition)?.distance).toBe(0);
    });

    it('stores a road distance', () => {
      const entity = world.spawn(RoadPosition({ distance: 6000 }));
      expect(entity.get(RoadPosition)?.distance).toBe(6000);
    });
  });

  describe('IsOnRoad', () => {
    it('is a tag trait', () => {
      const entity = world.spawn(IsOnRoad);
      expect(entity.has(IsOnRoad)).toBe(true);
    });
  });

  describe('IsAnchor', () => {
    it('defaults to empty anchorId', () => {
      const entity = world.spawn(IsAnchor);
      expect(entity.get(IsAnchor)?.anchorId).toBe('');
    });

    it('stores an anchor reference', () => {
      const entity = world.spawn(IsAnchor({ anchorId: 'anchor-01' }));
      expect(entity.get(IsAnchor)?.anchorId).toBe('anchor-01');
    });
  });

  describe('IsFeature', () => {
    it('defaults to empty values', () => {
      const entity = world.spawn(IsFeature);
      const feat = entity.get(IsFeature);
      expect(feat?.featureId).toBe('');
      expect(feat?.tier).toBe('');
    });

    it('stores feature info', () => {
      const entity = world.spawn(IsFeature({ featureId: 'stone-bridge-01', tier: 'minor' }));
      const feat = entity.get(IsFeature);
      expect(feat?.featureId).toBe('stone-bridge-01');
      expect(feat?.tier).toBe('minor');
    });
  });

  describe('road entity composition', () => {
    it('creates an anchor point entity', () => {
      const entity = world.spawn(
        RoadPosition({ distance: 6000 }),
        IsOnRoad,
        IsAnchor({ anchorId: 'anchor-01' }),
      );
      expect(entity.has(IsOnRoad)).toBe(true);
      expect(entity.get(RoadPosition)?.distance).toBe(6000);
      expect(entity.get(IsAnchor)?.anchorId).toBe('anchor-01');
    });

    it('creates a road feature entity', () => {
      const entity = world.spawn(
        RoadPosition({ distance: 3500 }),
        IsOnRoad,
        IsFeature({ featureId: 'wayside-shrine', tier: 'ambient' }),
      );
      expect(entity.has(IsOnRoad)).toBe(true);
      expect(entity.get(IsFeature)?.tier).toBe('ambient');
    });
  });
});
