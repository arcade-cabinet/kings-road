import { describe, expect, it } from 'vitest';
import {
  BLOCK_SIZE,
  CHUNK_SIZE,
  chunkToWorldOrigin,
  facingToYaw,
  getSpawnPoint,
  PLAYER_HEIGHT,
  TILE_SIZE,
  tileToWorld,
  worldToChunk,
} from './worldCoords';

describe('constants re-exports', () => {
  it('CHUNK_SIZE is 120', () => {
    expect(CHUNK_SIZE).toBe(120);
  });

  it('BLOCK_SIZE is 5', () => {
    expect(BLOCK_SIZE).toBe(5);
  });

  it('TILE_SIZE is 4', () => {
    expect(TILE_SIZE).toBe(4);
  });

  it('PLAYER_HEIGHT is 1.6', () => {
    expect(PLAYER_HEIGHT).toBe(1.6);
  });
});

describe('chunkToWorldOrigin', () => {
  it('chunk (0,0) has world origin (0,0)', () => {
    const origin = chunkToWorldOrigin(0, 0);
    expect(origin.x).toBe(0);
    expect(origin.z).toBe(0);
  });

  it('chunk (0,50) has world origin (0, 6000)', () => {
    const origin = chunkToWorldOrigin(0, 50);
    expect(origin.x).toBe(0);
    expect(origin.z).toBe(6000);
  });

  it('chunk (1, 3) has world origin (120, 360)', () => {
    const origin = chunkToWorldOrigin(1, 3);
    expect(origin.x).toBe(120);
    expect(origin.z).toBe(360);
  });
});

describe('tileToWorld', () => {
  it('tile (0,0) at chunk origin (0,0) with center (0,0) returns (0,0)', () => {
    const result = tileToWorld(0, 0, 0, 0);
    expect(result.x).toBe(0);
    expect(result.z).toBe(0);
  });

  it('tile (2,3) at chunk origin (0,0) with center (0,0) matches manual calculation', () => {
    const result = tileToWorld(2, 3, 0, 0);
    expect(result.x).toBe(2 * TILE_SIZE);
    expect(result.z).toBe(3 * TILE_SIZE);
  });

  it('tile (0,4) at chunk origin (0,0) with center (0,0) matches Ashford spawn', () => {
    // Ashford spawn is at tile [0,4], center [0,0], chunk origin (0,0)
    const result = tileToWorld(0, 4, 0, 0, 0, 0);
    expect(result.x).toBe(0);
    expect(result.z).toBe(16); // 4 * TILE_SIZE = 16
  });

  it('accounts for chunk origin offset', () => {
    const result = tileToWorld(1, 1, 120, 6000);
    expect(result.x).toBe(120 + 1 * TILE_SIZE);
    expect(result.z).toBe(6000 + 1 * TILE_SIZE);
  });

  it('accounts for center tile offset', () => {
    const result = tileToWorld(1, 1, 0, 0, 5, 5);
    expect(result.x).toBe((5 + 1) * TILE_SIZE);
    expect(result.z).toBe((5 + 1) * TILE_SIZE);
  });
});

describe('getSpawnPoint', () => {
  it('returns correct position for Ashford "home" spawn', () => {
    const spawn = getSpawnPoint('home');
    expect(spawn).toBeDefined();

    // Ashford: center [0,0], spawn tile [0,4]
    // world x = (0+0)*4 = 0, world z = (0+4)*4 = 16
    expect(spawn!.position.x).toBe(0);
    expect(spawn!.position.y).toBe(PLAYER_HEIGHT);
    expect(spawn!.position.z).toBe(16);
    expect(spawn!.yaw).toBe(Math.PI); // facing south
  });

  it('returns correct spawn when filtered by townId', () => {
    const spawn = getSpawnPoint('home', 'ashford');
    expect(spawn).toBeDefined();
    expect(spawn!.position.x).toBe(0);
  });

  it('returns undefined for non-existent spawn id', () => {
    const spawn = getSpawnPoint('nonexistent');
    expect(spawn).toBeUndefined();
  });

  it('returns undefined when townId does not match', () => {
    const spawn = getSpawnPoint('home', 'millbrook');
    expect(spawn).toBeUndefined();
  });

  it('resolves Millbrook "road-entrance" spawn', () => {
    const spawn = getSpawnPoint('road-entrance', 'millbrook');
    expect(spawn).toBeDefined();
    // center [0,0], tile [0,-3] → z = -3*4 = -12
    expect(spawn!.position.x).toBe(0);
    expect(spawn!.position.z).toBe(-12);
    expect(spawn!.yaw).toBe(0); // facing north
  });

  it('resolves Ravensgate "south-gate" spawn', () => {
    const spawn = getSpawnPoint('south-gate', 'ravensgate');
    expect(spawn).toBeDefined();
    // center [0,0], tile [0,-7] → z = -7*4 = -28
    expect(spawn!.position.x).toBe(0);
    expect(spawn!.position.z).toBe(-28);
    expect(spawn!.yaw).toBe(0); // facing north
  });

  it('resolves Grailsend "road-entrance" spawn', () => {
    const spawn = getSpawnPoint('road-entrance', 'grailsend');
    expect(spawn).toBeDefined();
    // center [0,0], tile [0,-3] → z = -3*4 = -12
    expect(spawn!.position.x).toBe(0);
    expect(spawn!.position.z).toBe(-12);
  });

  it('finds spawn by id across all towns without townId filter', () => {
    // "south-gate" only exists in ravensgate
    const spawn = getSpawnPoint('south-gate');
    expect(spawn).toBeDefined();
    expect(spawn!.position.z).toBe(-28);
  });
});

describe('worldToChunk', () => {
  it('world origin (0,0) maps to chunk (0,0)', () => {
    const result = worldToChunk(0, 0);
    expect(result.cx).toBe(0);
    expect(result.cz).toBe(0);
  });

  it('position inside chunk (0,0) stays in chunk (0,0)', () => {
    const result = worldToChunk(60, 60);
    expect(result.cx).toBe(0);
    expect(result.cz).toBe(0);
  });

  it('position at chunk boundary maps to next chunk', () => {
    const result = worldToChunk(120, 120);
    expect(result.cx).toBe(1);
    expect(result.cz).toBe(1);
  });

  it('negative positions map to negative chunk indices', () => {
    const result = worldToChunk(-1, -1);
    expect(result.cx).toBe(-1);
    expect(result.cz).toBe(-1);
  });

  it('round-trips with chunkToWorldOrigin', () => {
    for (const [cx, cz] of [
      [0, 0],
      [0, 50],
      [1, 3],
      [-1, -2],
    ] as const) {
      const origin = chunkToWorldOrigin(cx, cz);
      const back = worldToChunk(origin.x, origin.z);
      expect(back.cx).toBe(cx);
      expect(back.cz).toBe(cz);
    }
  });
});

describe('facingToYaw', () => {
  it('north is 0', () => {
    expect(facingToYaw('north')).toBe(0);
  });

  it('south is PI', () => {
    expect(facingToYaw('south')).toBe(Math.PI);
  });

  it('east is -PI/2', () => {
    expect(facingToYaw('east')).toBe(-Math.PI / 2);
  });

  it('west is PI/2', () => {
    expect(facingToYaw('west')).toBe(Math.PI / 2);
  });
});
