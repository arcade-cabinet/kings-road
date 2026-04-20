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
  generateWorld: vi.fn(async () => ({
    width: 128,
    height: 256,
    settlements: [
      { id: 'ashford', position: [10, 10] },
      { id: 'thornfield-ruins', position: [50, 100] },
    ],
  })),
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

  it('treats ?benchmark=<biome> as an implicit spawn param (task #22)', async () => {
    window.history.replaceState({}, '', '/?benchmark=thornfield');
    const { parseSpawnParam, isBenchmarkSpawn } = await import('./spawn');
    expect(parseSpawnParam()).toBe('thornfield');
    expect(isBenchmarkSpawn()).toBe(true);
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
    // Thornfield settlement at grid (50, 100) → world centre
    // (50*CHUNK_SIZE + CHUNK_SIZE/2, PLAYER_HEIGHT, 100*CHUNK_SIZE + CHUNK_SIZE/2)
    // With CHUNK_SIZE=120 → (6060, y, 12060)
    // Debug spawn offsets the settlement grid centre by (-8, +18) so
    // the player stands south-east of the settlement core with the
    // ruin-keeper's cottage + warden's watch NPCs in the forward
    // viewport. Previous +25m east offset faced away from the main
    // building cluster.
    expect(gameMod.startGame).toHaveBeenCalledWith(
      'debug-thornfield-seed',
      expect.objectContaining({ x: 6052, z: 12078 }),
      0,
    );
  });

  it('pins the player to (2, 1.6, 24) when ?benchmark=<biome> is active', async () => {
    window.history.replaceState({}, '', '/?benchmark=thornfield');
    const gameMod = await import('@/ecs/actions/game');
    const { applyDebugSpawn, BENCHMARK_SPAWN_POSITION } = await import(
      './spawn'
    );

    expect(applyDebugSpawn()).toBe(true);
    for (let i = 0; i < 5; i++) await Promise.resolve();

    expect(gameMod.startGame).toHaveBeenCalledWith(
      'debug-thornfield-seed',
      expect.objectContaining({
        x: BENCHMARK_SPAWN_POSITION.x,
        y: BENCHMARK_SPAWN_POSITION.y,
        z: BENCHMARK_SPAWN_POSITION.z,
      }),
      0,
    );
  });
});
