import { describe, expect, it } from 'vitest';
import {
  DUNGEON_DARKNESS_BOOST,
  DUNGEON_OFFSET_REDUCTION,
  combineDungeonVignette,
  lerpDungeonVignette,
} from './dungeonVignette';

describe('lerpDungeonVignette', () => {
  it('returns zero when not in dungeon', () => {
    const result = lerpDungeonVignette(0, 0, false, 0.016);
    expect(result.darkness).toBeCloseTo(0, 5);
    expect(result.offset).toBeCloseTo(0, 5);
  });

  it('approaches dungeon target values when inDungeon=true', () => {
    // After many frames the lerp should converge to the target values.
    let darkness = 0;
    let offset = 0;
    const delta = 0.016; // ~60fps
    for (let i = 0; i < 300; i++) {
      const r = lerpDungeonVignette(darkness, offset, true, delta);
      darkness = r.darkness;
      offset = r.offset;
    }
    expect(darkness).toBeCloseTo(DUNGEON_DARKNESS_BOOST, 3);
    expect(offset).toBeCloseTo(DUNGEON_OFFSET_REDUCTION, 3);
  });

  it('returns toward zero when exiting dungeon', () => {
    // Start at fully-entered dungeon state then exit
    let darkness = DUNGEON_DARKNESS_BOOST;
    let offset = DUNGEON_OFFSET_REDUCTION;
    const delta = 0.016;
    for (let i = 0; i < 300; i++) {
      const r = lerpDungeonVignette(darkness, offset, false, delta);
      darkness = r.darkness;
      offset = r.offset;
    }
    expect(darkness).toBeCloseTo(0, 3);
    expect(offset).toBeCloseTo(0, 3);
  });

  it('has meaningful progress after one 0.016s frame when entering', () => {
    // Should have moved at least 2% toward target in first frame (k ≈ 0.039)
    const result = lerpDungeonVignette(0, 0, true, 0.016);
    expect(result.darkness).toBeGreaterThan(DUNGEON_DARKNESS_BOOST * 0.02);
  });
});

describe('combineDungeonVignette', () => {
  it('returns biome values unchanged when dungeon contribution is zero', () => {
    const result = combineDungeonVignette(0.42, 0.35, 0, 0);
    expect(result.darkness).toBeCloseTo(0.42);
    expect(result.offset).toBeCloseTo(0.35);
  });

  it('darkness is higher when fully in dungeon vs full health overworld', () => {
    // Full health overworld: typical biome darkness ~0.42, dungeon=0
    const overworld = combineDungeonVignette(0.42, 0.35, 0, 0);
    // Full health dungeon: same biome darkness + dungeon boost
    const dungeon = combineDungeonVignette(
      0.42,
      0.35,
      DUNGEON_DARKNESS_BOOST,
      DUNGEON_OFFSET_REDUCTION,
    );
    expect(dungeon.darkness).toBeGreaterThan(overworld.darkness);
    expect(dungeon.offset).toBeLessThan(overworld.offset);
  });

  it('darkness never exceeds 1.0', () => {
    // Even combining max biome darkness with max dungeon boost stays clamped
    const result = combineDungeonVignette(1.0, 0.35, DUNGEON_DARKNESS_BOOST, DUNGEON_OFFSET_REDUCTION);
    expect(result.darkness).toBeLessThanOrEqual(1.0);
  });

  it('offset never falls below 0.15 minimum', () => {
    // Even with extreme offset reduction the ring cannot fully cover the screen
    const result = combineDungeonVignette(0.42, 0.16, DUNGEON_DARKNESS_BOOST, DUNGEON_OFFSET_REDUCTION);
    expect(result.offset).toBeGreaterThanOrEqual(0.15);
  });
});
