import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/ecs/actions/game', () => ({
  startGame: vi.fn(),
}));

vi.mock('@/ecs/actions/inventory-ui', () => ({
  syncInventory: vi.fn(),
}));

vi.mock('@/db/load-content-db', () => ({
  loadContentDb: vi.fn(async () => undefined),
}));

vi.mock('@/ecs/actions/quest', () => ({
  resolveNarrative: vi.fn(),
}));

vi.mock('@/ecs/actions/world', () => ({
  generateWorld: vi.fn(async () => ({ width: 1, height: 1, settlements: [] })),
  setWorldState: vi.fn(),
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

  it('returns true and runs the boot sequence for valid biome', async () => {
    window.history.replaceState({}, '', '/?spawn=thornfield');
    const gameMod = await import('@/ecs/actions/game');
    const worldMod = await import('@/ecs/actions/world');
    const dbMod = await import('@/db/load-content-db');
    const questMod = await import('@/ecs/actions/quest');
    const { applyDebugSpawn } = await import('./spawn');

    const result = applyDebugSpawn();
    expect(result).toBe(true);

    // The boot sequence runs in a detached microtask chain. Flushing a
    // handful of microtasks lets the async work complete deterministically.
    for (let i = 0; i < 5; i++) await Promise.resolve();

    expect(dbMod.loadContentDb).toHaveBeenCalled();
    expect(worldMod.generateWorld).toHaveBeenCalledWith(
      'debug-thornfield-seed',
    );
    expect(questMod.resolveNarrative).toHaveBeenCalledWith(
      'debug-thornfield-seed',
    );
    expect(gameMod.startGame).toHaveBeenCalledWith(
      'debug-thornfield-seed',
      expect.objectContaining({ x: 12000, z: 2 }),
      0,
    );
  });
});
