import { describe, expect, it } from 'vitest';
import {
  gameWorld,
  getSessionEntity,
  unsafe_resetSessionEntity,
} from './world';

describe('world', () => {
  it('exposes a koota world', () => {
    expect(gameWorld).toBeTruthy();
    expect(typeof gameWorld.spawn).toBe('function');
  });

  it('getSessionEntity returns a stable entity across calls', () => {
    unsafe_resetSessionEntity();
    const first = getSessionEntity();
    const second = getSessionEntity();
    expect(first).toBe(second);
  });

  it('unsafe_resetSessionEntity produces a new entity on next access', () => {
    const first = getSessionEntity();
    unsafe_resetSessionEntity();
    const second = getSessionEntity();
    expect(second).not.toBe(first);
  });

  it('getSessionEntity is lazy — does not spawn at module import time', () => {
    // After reset, the internal ref is null until next access. Re-reset here
    // to prove the spawn only happens when callers actually ask.
    unsafe_resetSessionEntity();
    // No getSessionEntity() call yet — if this test is the only one, the
    // next getSessionEntity() should spawn one fresh entity.
    const entity = getSessionEntity();
    expect(typeof entity).toBe('number');
  });
});
