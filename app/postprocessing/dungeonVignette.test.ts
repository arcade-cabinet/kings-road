import { describe, expect, it } from 'vitest';
import {
  DUNGEON_DARKNESS_BOOST,
  DUNGEON_OFFSET_REDUCTION,
  type DungeonVignetteState,
  combineDungeonVignette,
  lerpDungeonVignette,
} from './dungeonVignette';

describe('lerpDungeonVignette', () => {
  it('returns zero when not in dungeon', () => {
    const out: DungeonVignetteState = { darkness: 0, offset: 0 };
    lerpDungeonVignette(out, false, 0.016);
    expect(out.darkness).toBeCloseTo(0, 5);
    expect(out.offset).toBeCloseTo(0, 5);
  });

  it('approaches dungeon target values when inDungeon=true', () => {
    // After many frames the lerp should converge to the target values.
    const out: DungeonVignetteState = { darkness: 0, offset: 0 };
    const delta = 0.016; // ~60fps
    for (let i = 0; i < 300; i++) {
      lerpDungeonVignette(out, true, delta);
    }
    expect(out.darkness).toBeCloseTo(DUNGEON_DARKNESS_BOOST, 3);
    expect(out.offset).toBeCloseTo(DUNGEON_OFFSET_REDUCTION, 3);
  });

  it('returns toward zero when exiting dungeon', () => {
    // Start at fully-entered dungeon state then exit
    const out: DungeonVignetteState = {
      darkness: DUNGEON_DARKNESS_BOOST,
      offset: DUNGEON_OFFSET_REDUCTION,
    };
    const delta = 0.016;
    for (let i = 0; i < 300; i++) {
      lerpDungeonVignette(out, false, delta);
    }
    expect(out.darkness).toBeCloseTo(0, 3);
    expect(out.offset).toBeCloseTo(0, 3);
  });

  it('has meaningful progress after one 0.016s frame when entering', () => {
    // Should have moved at least 2% toward target in first frame (k ≈ 0.039)
    const out: DungeonVignetteState = { darkness: 0, offset: 0 };
    lerpDungeonVignette(out, true, 0.016);
    expect(out.darkness).toBeGreaterThan(DUNGEON_DARKNESS_BOOST * 0.02);
  });
});

describe('combineDungeonVignette', () => {
  it('returns biome values unchanged when dungeon contribution is zero', () => {
    const out: DungeonVignetteState = { darkness: 0, offset: 0 };
    combineDungeonVignette(out, 0.42, 0.35, 0, 0);
    expect(out.darkness).toBeCloseTo(0.42);
    expect(out.offset).toBeCloseTo(0.35);
  });

  it('darkness is higher when fully in dungeon vs full health overworld', () => {
    const overworld: DungeonVignetteState = { darkness: 0, offset: 0 };
    combineDungeonVignette(overworld, 0.42, 0.35, 0, 0);

    const dungeon: DungeonVignetteState = { darkness: 0, offset: 0 };
    combineDungeonVignette(
      dungeon,
      0.42,
      0.35,
      DUNGEON_DARKNESS_BOOST,
      DUNGEON_OFFSET_REDUCTION,
    );

    expect(dungeon.darkness).toBeGreaterThan(overworld.darkness);
    expect(dungeon.offset).toBeLessThan(overworld.offset);
  });

  it('darkness never exceeds 1.0', () => {
    const out: DungeonVignetteState = { darkness: 0, offset: 0 };
    combineDungeonVignette(out, 1.0, 0.35, DUNGEON_DARKNESS_BOOST, DUNGEON_OFFSET_REDUCTION);
    expect(out.darkness).toBeLessThanOrEqual(1.0);
  });

  it('offset never falls below 0.15 minimum', () => {
    const out: DungeonVignetteState = { darkness: 0, offset: 0 };
    combineDungeonVignette(out, 0.42, 0.16, DUNGEON_DARKNESS_BOOST, DUNGEON_OFFSET_REDUCTION);
    expect(out.offset).toBeGreaterThanOrEqual(0.15);
  });
});
