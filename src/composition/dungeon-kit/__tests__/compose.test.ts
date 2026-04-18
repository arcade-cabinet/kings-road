import { describe, expect, it } from 'vitest';

import { DUNGEON_KIT } from '../catalog';
import { composeDungeonRoom } from '../compose';
import type { DungeonKitRoom } from '../types';

const VALID_ASSET_IDS = new Set(Object.keys(DUNGEON_KIT));

const TEST_ROOM: DungeonKitRoom = {
  id: 'room-test-01',
  type: 'chamber',
  center: { x: 0, y: 0, z: 0 },
  width: 8,
  depth: 8,
  exits: ['north', 'south'],
};

const CORRIDOR_ROOM: DungeonKitRoom = {
  id: 'room-corridor-01',
  type: 'corridor',
  center: { x: 10, y: 0, z: 0 },
  width: 4,
  depth: 12,
  exits: ['north'],
};

const BOSS_ROOM: DungeonKitRoom = {
  id: 'room-boss-01',
  type: 'boss',
  center: { x: 0, y: 0, z: 50 },
  width: 16,
  depth: 16,
  exits: ['south'],
};

function posKey(p: { x: number; y: number; z: number }): string {
  return `${p.x},${p.y},${p.z}`;
}

describe('composeDungeonRoom', () => {
  it('returns non-empty placements', () => {
    const result = composeDungeonRoom(TEST_ROOM, 'seed-a');
    expect(result.length).toBeGreaterThan(0);
  });

  it('contains all 5 roles', () => {
    const result = composeDungeonRoom(TEST_ROOM, 'seed-a');
    const roles = new Set(result.map((p) => p.role));
    expect(roles.has('floor')).toBe(true);
    expect(roles.has('ceiling')).toBe(true);
    expect(roles.has('wall')).toBe(true);
    expect(roles.has('doorway')).toBe(true);
    expect(roles.has('scatter')).toBe(true);
  });

  it('doorway count matches exits', () => {
    const result = composeDungeonRoom(TEST_ROOM, 'seed-a');
    const doorways = result.filter((p) => p.role === 'doorway');
    expect(doorways.length).toBe(TEST_ROOM.exits.length);
  });

  it('is deterministic', () => {
    const a = composeDungeonRoom(TEST_ROOM, 'seed-x');
    const b = composeDungeonRoom(TEST_ROOM, 'seed-x');
    expect(a).toEqual(b);
  });

  it('produces different output for different seeds', () => {
    const a = composeDungeonRoom(TEST_ROOM, 'seed-1');
    const b = composeDungeonRoom(TEST_ROOM, 'seed-2');
    const aPositions = a.map((p) => posKey(p.position));
    const bPositions = b.map((p) => posKey(p.position));
    expect(aPositions).not.toEqual(bPositions);
  });

  it('produces different output for different room ids', () => {
    const roomB: DungeonKitRoom = { ...TEST_ROOM, id: 'room-other' };
    const a = composeDungeonRoom(TEST_ROOM, 'seed-x');
    const b = composeDungeonRoom(roomB, 'seed-x');
    const aScatter = a
      .filter((p) => p.role === 'scatter')
      .map((p) => posKey(p.position));
    const bScatter = b
      .filter((p) => p.role === 'scatter')
      .map((p) => posKey(p.position));
    expect(aScatter).not.toEqual(bScatter);
  });

  it('all assetIds are valid catalog keys', () => {
    const result = composeDungeonRoom(TEST_ROOM, 'seed-a');
    for (const p of result) {
      expect(
        VALID_ASSET_IDS.has(p.assetId),
        `Unknown assetId: ${p.assetId}`,
      ).toBe(true);
    }
  });

  it('returns no Three.js objects (position/rotation are plain objects)', () => {
    const result = composeDungeonRoom(TEST_ROOM, 'seed-a');
    for (const p of result) {
      expect(typeof p.position).toBe('object');
      expect('x' in p.position).toBe(true);
      expect('y' in p.position).toBe(true);
      expect('z' in p.position).toBe(true);
      expect(typeof p.scale).toBe('number');
    }
  });

  it('corridor produces placements', () => {
    const result = composeDungeonRoom(CORRIDOR_ROOM, 'seed-c');
    expect(result.length).toBeGreaterThan(0);
    const roles = new Set(result.map((p) => p.role));
    expect(roles.has('floor')).toBe(true);
    expect(roles.has('ceiling')).toBe(true);
  });

  it('boss room has more scatter than corridor', () => {
    const boss = composeDungeonRoom(BOSS_ROOM, 'seed-s');
    const corridor = composeDungeonRoom(CORRIDOR_ROOM, 'seed-s');
    const bossScatter = boss.filter((p) => p.role === 'scatter').length;
    const corridorScatter = corridor.filter((p) => p.role === 'scatter').length;
    expect(bossScatter).toBeGreaterThan(corridorScatter);
  });
});
