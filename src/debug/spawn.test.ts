import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isDebugSpawnActive,
  parseSpawnParam,
  resolveSpawnConfig,
} from './spawn';

// In test (non-prod) environment import.meta.env.DEV is true by default via
// vitest. We mock window.location.search to control URL param behaviour.

function withSearch(search: string, fn: () => void): void {
  const original = window.location.search;
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search },
    writable: true,
    configurable: true,
  });
  try {
    fn();
  } finally {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: original },
      writable: true,
      configurable: true,
    });
  }
}

describe('parseSpawnParam', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DEBUG_SPAWN', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null when no param or env var is set', () => {
    withSearch('', () => {
      expect(parseSpawnParam()).toBeNull();
    });
  });

  it('parses ?spawn= from URL search string', () => {
    withSearch('?spawn=thornfield', () => {
      expect(parseSpawnParam()).toBe('thornfield');
    });
  });

  it('normalises the param to lowercase', () => {
    withSearch('?spawn=Thornfield', () => {
      expect(parseSpawnParam()).toBe('thornfield');
    });
  });

  it('prefers VITE_DEBUG_SPAWN env var over URL param', () => {
    vi.stubEnv('VITE_DEBUG_SPAWN', 'meadow');
    withSearch('?spawn=thornfield', () => {
      expect(parseSpawnParam()).toBe('meadow');
    });
  });
});

describe('resolveSpawnConfig', () => {
  it('returns null for unknown biome tag', () => {
    expect(resolveSpawnConfig('unknown')).toBeNull();
  });

  it('resolves thornfield to anchor-02 at distance 12000', () => {
    const cfg = resolveSpawnConfig('thornfield');
    expect(cfg).not.toBeNull();
    expect(cfg!.anchor.distanceFromStart).toBe(12000);
    expect(cfg!.questChapter).toBe('chapter-02');
  });

  it('resolves meadow (home) to distance 0', () => {
    const cfg = resolveSpawnConfig('meadow');
    expect(cfg).not.toBeNull();
    expect(cfg!.anchor.distanceFromStart).toBe(0);
    expect(cfg!.questChapter).toBe('chapter-00');
  });

  it('includes starter inventory in the config', () => {
    const cfg = resolveSpawnConfig('thornfield');
    expect(cfg!.starterItems).toContainEqual({
      itemId: 'iron_sword',
      quantity: 1,
    });
    expect(cfg!.starterItems).toContainEqual({
      itemId: 'health_potion',
      quantity: 3,
    });
    expect(cfg!.starterItems).toContainEqual({ itemId: 'torch', quantity: 1 });
  });

  it('sets position.x to distanceFromStart', () => {
    const cfg = resolveSpawnConfig('thornfield');
    expect(cfg!.position.x).toBe(12000);
  });
});

describe('isDebugSpawnActive', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns false when no param is set', () => {
    withSearch('', () => {
      expect(isDebugSpawnActive()).toBe(false);
    });
  });

  it('returns true when ?spawn= is present', () => {
    withSearch('?spawn=meadow', () => {
      expect(isDebugSpawnActive()).toBe(true);
    });
  });
});
