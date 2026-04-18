import { describe, expect, it, vi } from 'vitest';
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
    // Koota recycles entity IDs via a free list — consume the recycled slot so
    // the next getSessionEntity() gets a genuinely fresh ID.
    const recycledSlotConsumer = gameWorld.spawn();
    try {
      const second = getSessionEntity();
      expect(second).not.toBe(first);
    } finally {
      (recycledSlotConsumer as unknown as { destroy(): void }).destroy();
      unsafe_resetSessionEntity();
    }
  });

  it('getSessionEntity is lazy — does not spawn at module import time', () => {
    // After reset the internal ref is null. Spy on gameWorld.spawn to confirm
    // no spawn happens before the first getSessionEntity() call.
    unsafe_resetSessionEntity();
    const spawnSpy = vi.spyOn(gameWorld, 'spawn');
    try {
      expect(spawnSpy).not.toHaveBeenCalled();
      const entity = getSessionEntity();
      expect(spawnSpy).toHaveBeenCalledOnce();
      expect(typeof entity).toBe('number');
    } finally {
      spawnSpy.mockRestore();
    }
  });
});
