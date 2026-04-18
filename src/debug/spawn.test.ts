import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/ecs/actions/game', () => ({
  startGame: vi.fn(),
}));

vi.mock('@/ecs/actions/inventory-ui', () => ({
  syncInventory: vi.fn(),
}));

describe('parseSpawnParam', () => {
  let originalUrl: string;

  beforeEach(() => {
    originalUrl = window.location.href;
  });

  afterEach(() => {
    window.history.replaceState({}, '', originalUrl);
    vi.resetModules();
  });

  it('returns null when no spawn param present', async () => {
    window.history.replaceState({}, '', '/');
    const { parseSpawnParam } = await import('./spawn');
    expect(parseSpawnParam()).toBeNull();
  });

  it('parses ?spawn=thornfield', async () => {
    window.history.replaceState({}, '', '/?spawn=thornfield');
    const { parseSpawnParam } = await import('./spawn');
    expect(parseSpawnParam()).toBe('thornfield');
  });

  it('normalises uppercase and hyphens', async () => {
    window.history.replaceState({}, '', '/?spawn=Thornfield-Ruins');
    const { parseSpawnParam } = await import('./spawn');
    expect(parseSpawnParam()).toBe('thornfield_ruins');
  });
});

describe('applyDebugSpawn', () => {
  let originalUrl: string;

  beforeEach(() => {
    originalUrl = window.location.href;
  });

  afterEach(() => {
    window.history.replaceState({}, '', originalUrl);
    vi.resetModules();
  });

  it('returns false when no spawn param', async () => {
    window.history.replaceState({}, '', '/');
    const { applyDebugSpawn } = await import('./spawn');
    expect(applyDebugSpawn()).toBe(false);
  });

  it('returns false for unknown biome id', async () => {
    window.history.replaceState({}, '', '/?spawn=narnia');
    const { applyDebugSpawn } = await import('./spawn');
    expect(applyDebugSpawn()).toBe(false);
  });

  it('returns true and calls startGame for valid biome', async () => {
    window.history.replaceState({}, '', '/?spawn=thornfield');
    const gameMod = await import('@/ecs/actions/game');
    const { applyDebugSpawn } = await import('./spawn');
    const result = applyDebugSpawn();
    expect(result).toBe(true);
    expect(gameMod.startGame).toHaveBeenCalledWith(
      'debug-thornfield-seed',
      expect.objectContaining({ x: 12000, z: 2 }),
      0,
    );
  });
});
