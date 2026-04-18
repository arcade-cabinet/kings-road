import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/ecs/actions/game', () => ({
  startGame: vi.fn(),
  setGameActive: vi.fn(),
  setPlayerPosition: vi.fn(),
  setSeedPhrase: vi.fn(),
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
  });

  it('returns null when no spawn param present', async () => {
    window.history.replaceState({}, '', '/');
    const { parseSpawnParam } = await import('./spawn');
    expect(parseSpawnParam()).toBeNull();
  });

  it('parses ?spawn=thornfield', async () => {
    window.history.replaceState({}, '', '/?spawn=thornfield');
    vi.resetModules();
    const { parseSpawnParam } = await import('./spawn');
    expect(parseSpawnParam()).toBe('thornfield');
  });

  it('normalises uppercase and hyphens', async () => {
    window.history.replaceState({}, '', '/?spawn=Thornfield-Ruins');
    vi.resetModules();
    const { parseSpawnParam } = await import('./spawn');
    expect(parseSpawnParam()).toBe('thornfield_ruins');
  });

  it('returns null in production', async () => {
    window.history.replaceState({}, '', '/?spawn=thornfield');
    vi.stubEnv('DEV', false as unknown as string);
    vi.resetModules();
    const { parseSpawnParam } = await import('./spawn');
    expect(parseSpawnParam()).toBeNull();
    vi.unstubAllEnvs();
  });
});

describe('applyDebugSpawn', () => {
  it('returns false when no spawn param', async () => {
    window.history.replaceState({}, '', '/');
    vi.resetModules();
    const { applyDebugSpawn } = await import('./spawn');
    expect(applyDebugSpawn()).toBe(false);
  });

  it('returns false for unknown biome id', async () => {
    window.history.replaceState({}, '', '/?spawn=narnia');
    vi.resetModules();
    const { applyDebugSpawn } = await import('./spawn');
    expect(applyDebugSpawn()).toBe(false);
  });

  it('returns true and calls startGame for valid biome', async () => {
    window.history.replaceState({}, '', '/?spawn=thornfield');
    vi.resetModules();
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
