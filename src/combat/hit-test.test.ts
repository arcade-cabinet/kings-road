import { describe, expect, it } from 'vitest';
import { type HitTarget, pickMeleeTarget } from './hit-test';

const player = { x: 0, y: 1.6, z: 0 };

function target(id: string, x: number, z: number, radius = 0.8): HitTarget {
  return { id, position: [x, 0, z], radius };
}

describe('pickMeleeTarget', () => {
  it('returns null when no candidates are provided', () => {
    expect(pickMeleeTarget(player, { x: 0, y: 0, z: 1 }, [])).toBeNull();
  });

  it('hits the monster directly in front within range', () => {
    const forward = { x: 0, y: 0, z: 1 };
    const id = pickMeleeTarget(player, forward, [target('wraith-1', 0, 2)]);
    expect(id).toBe('wraith-1');
  });

  it('misses the monster directly behind the player', () => {
    const forward = { x: 0, y: 0, z: 1 };
    const id = pickMeleeTarget(player, forward, [target('wraith-1', 0, -2)]);
    expect(id).toBeNull();
  });

  it('misses a monster beyond effective range', () => {
    const forward = { x: 0, y: 0, z: 1 };
    // 5m away, radius 0.4 → effective range 2.5 + 0.4 = 2.9 → miss.
    const id = pickMeleeTarget(player, forward, [target('far', 0, 5, 0.4)]);
    expect(id).toBeNull();
  });

  it('includes the body radius in the effective range', () => {
    const forward = { x: 0, y: 0, z: 1 };
    // 3m away but radius 1.0 → effective range 2.5 + 1.0 = 3.5 → hit.
    const id = pickMeleeTarget(player, forward, [target('big', 0, 3, 1)]);
    expect(id).toBe('big');
  });

  it('misses monsters outside the forward cone', () => {
    const forward = { x: 0, y: 0, z: 1 };
    // 90° to the side — outside the default 45° half-cone.
    const id = pickMeleeTarget(player, forward, [target('side', 2, 0)]);
    expect(id).toBeNull();
  });

  it('picks the nearest qualifying monster when several are in the cone', () => {
    const forward = { x: 0, y: 0, z: 1 };
    const id = pickMeleeTarget(player, forward, [
      target('far', 0, 2.4),
      target('near', 0, 1.2),
    ]);
    expect(id).toBe('near');
  });

  it('ignores the vertical component of the forward vector', () => {
    // Looking down at 45° but aiming at a monster on the ground in front.
    const forward = { x: 0, y: -Math.SQRT1_2, z: Math.SQRT1_2 };
    const id = pickMeleeTarget(player, forward, [target('ground', 0, 2)]);
    expect(id).toBe('ground');
  });

  it('honours a narrower custom cone', () => {
    const forward = { x: 0, y: 0, z: 1 };
    // 30° off-axis — would hit at default 45° half-cone but not at 15°.
    const offAxis = target(
      'offset',
      Math.sin(Math.PI / 6) * 2,
      Math.cos(Math.PI / 6) * 2,
    );
    expect(pickMeleeTarget(player, forward, [offAxis])).toBe('offset');
    expect(
      pickMeleeTarget(player, forward, [offAxis], {
        coneHalfAngleRad: Math.PI / 12,
      }),
    ).toBeNull();
  });
});
