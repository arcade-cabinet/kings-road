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

// ── Helpers ───────────────────────────────────────────────────────────────
//
// We intentionally construct a minimal, structurally-loose fixture and cast
// through `unknown` to avoid importing the world-layer types that `ecs/` is
// not allowed to depend on laterally (package-boundaries rule). The dungeon
// actions under test only care that an `ActiveDungeon` shape is present on
// the session entity and that its `spatial.rooms` array has the indexed room
// when `moveToRoom` runs; they do not inspect nested fields like
// `PlacedRoom.exits`.

interface StubRoom {
  room: { id: string; name: string };
  gridX?: number;
}

function stubRoom(id: string, name: string, gridX = 0): StubRoom {
  return { room: { id, name }, gridX };
}

function makeActiveDungeon(rooms: StubRoom[] = []): ActiveDungeon {
  const allRooms = rooms.length
    ? rooms
    : [stubRoom('entrance', 'Entrance Hall')];
  return {
    id: 'dungeon-test-001',
    name: 'Test Dungeon',
    spatial: {
      layout: { id: 'dungeon-test-001', name: 'Test Dungeon' },
      rooms: allRooms,
      bounds: [0, 0, 1, 1],
      worldWidth: 20,
      worldDepth: 20,
      roomById: new Map(allRooms.map((r) => [r.room.id, r])),
    },
    currentRoomIndex: 0,
    overworldPosition: new THREE.Vector3(100, 0, 200),
    overworldYaw: Math.PI / 4,
  } as unknown as ActiveDungeon;
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
    enterDungeon(dungeon);
    scheduleAutoSaveMock.mockClear();

    exitDungeon();

    expect(scheduleAutoSaveMock).toHaveBeenCalledTimes(1);
  });

  it('moveToRoom calls scheduleAutoSave when navigating to a valid room', () => {
    const rooms = [
      stubRoom('entrance', 'Entrance Hall'),
      stubRoom('boss-chamber', 'Boss Chamber', 1),
    ];
    const dungeon = makeActiveDungeon(rooms);
    enterDungeon(dungeon);
    scheduleAutoSaveMock.mockClear();

    moveToRoom(1);

    expect(scheduleAutoSaveMock).toHaveBeenCalledTimes(1);
  });
});
