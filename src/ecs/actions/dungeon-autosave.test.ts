/**
 * Verify that enterDungeon / exitDungeon / moveToRoom each call
 * scheduleAutoSave() — locking down the behaviour added by PR #214.
 */

import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted() runs before vi.mock() factory evaluation, so the mock fn
// reference is available when Vitest hoists the vi.mock call to the top of
// the module (see https://vitest.dev/api/vi.html#vi-hoisted).
const { scheduleAutoSaveMock } = vi.hoisted(() => ({
  scheduleAutoSaveMock: vi.fn(),
}));

vi.mock('@/db/autosave', async () => {
  const actual =
    await vi.importActual<typeof import('@/db/autosave')>('@/db/autosave');
  return {
    ...actual,
    scheduleAutoSave: scheduleAutoSaveMock,
  };
});

import { enterDungeon, exitDungeon, moveToRoom } from '@/ecs/actions/game';
import type { ActiveDungeon } from '@/ecs/traits/session-game';
import { unsafe_resetSessionEntity } from '@/ecs/world';
import type { DungeonRoom } from '@/schemas/dungeon.schema';
import type { PlacedExit, PlacedRoom } from '@/world/dungeon-generator';

// ── Helpers ───────────────────────────────────────────────────────────────

function makePlacedRoom(
  id: string,
  name: string,
  overrides: Partial<PlacedRoom> = {},
): PlacedRoom {
  const room: DungeonRoom = {
    id,
    name,
    // 'entrance' is a valid RoomType; other values are added as needed.
    type: 'entrance',
    description: `A sturdy ${name} hewn from grey limestone.`,
    // DungeonRoomSchema requires at least one connection. A stub self-loop
    // satisfies the schema minimum without coupling tests to real room graphs.
    connections: [{ to: id, direction: 'north', locked: false, secret: false }],
  };
  return {
    room,
    gridX: 0,
    gridZ: 0,
    worldX: 0,
    worldZ: 0,
    exits: [] as PlacedExit[],
    ...overrides,
  };
}

function makeActiveDungeon(rooms: PlacedRoom[] = []): ActiveDungeon {
  const allRooms = rooms.length
    ? rooms
    : [makePlacedRoom('entrance', 'Entrance Hall')];

  return {
    id: 'dungeon-test-001',
    name: 'Test Dungeon',
    spatial: {
      layout: {
        id: 'dungeon-test-001',
        name: 'Test Dungeon',
        anchorId: 'anchor-test',
        description: 'A test dungeon beneath the hills of Ashford.',
        recommendedLevel: 1,
        entranceRoomId: allRooms[0].room.id,
        bossRoomId: allRooms[allRooms.length - 1].room.id,
        rooms: allRooms.map((pr) => pr.room),
      },
      rooms: allRooms,
      bounds: [0, 0, 1, 1],
      worldWidth: 20,
      worldDepth: 20,
      roomById: new Map(allRooms.map((pr) => [pr.room.id, pr])),
    },
    currentRoomIndex: 0,
    overworldPosition: new THREE.Vector3(100, 0, 200),
    overworldYaw: Math.PI / 4,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('dungeon autosave triggers (PR #214)', () => {
  beforeEach(() => {
    scheduleAutoSaveMock.mockClear();
    unsafe_resetSessionEntity();
  });

  afterEach(() => {
    unsafe_resetSessionEntity();
  });

  it('enterDungeon calls scheduleAutoSave', () => {
    const dungeon = makeActiveDungeon();
    enterDungeon(dungeon);
    expect(scheduleAutoSaveMock).toHaveBeenCalledTimes(1);
  });

  it('exitDungeon calls scheduleAutoSave when an active dungeon exists', () => {
    const dungeon = makeActiveDungeon();
    // Enter first so there is an activeDungeon to exit from.
    scheduleAutoSaveMock.mockClear();
    enterDungeon(dungeon);
    scheduleAutoSaveMock.mockClear();

    exitDungeon();

    expect(scheduleAutoSaveMock).toHaveBeenCalledTimes(1);
  });

  it('moveToRoom calls scheduleAutoSave when navigating to a valid room', () => {
    const rooms = [
      makePlacedRoom('entrance', 'Entrance Hall'),
      makePlacedRoom('boss-chamber', 'Boss Chamber', { gridX: 1 }),
    ];
    const dungeon = makeActiveDungeon(rooms);
    enterDungeon(dungeon);
    scheduleAutoSaveMock.mockClear();

    moveToRoom(1);

    expect(scheduleAutoSaveMock).toHaveBeenCalledTimes(1);
  });
});
