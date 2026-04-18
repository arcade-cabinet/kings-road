import { describe, expect, it } from 'vitest';
import type { DungeonLayout } from '@/schemas/dungeon.schema';
import {
  DUNGEON_DEPTH,
  generateDungeonLayout,
  getRoomColor,
  ROOM_SIZE,
  type SpatialDungeon,
} from './dungeon-generator';
import {
  getAllDungeons,
  getDungeonByAnchor,
  getDungeonById,
} from './dungeon-registry';

// ── Registry tests ───────────────────────────────────────────────────

describe('dungeon-registry', () => {
  it('loads all bundled dungeons', () => {
    const all = getAllDungeons();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('looks up thornfield by id', () => {
    const d = getDungeonById('thornfield-ruins');
    expect(d).toBeDefined();
    expect(d!.name).toBe('Thornfield Ruins');
  });

  it('looks up grailsend by id', () => {
    const d = getDungeonById('grailsend-temple');
    expect(d).toBeDefined();
    expect(d!.name).toBe('Grailsend Temple');
  });

  it('looks up dungeon by anchor id', () => {
    const d = getDungeonByAnchor('anchor-02');
    expect(d).toBeDefined();
    expect(d!.id).toBe('thornfield-ruins');
  });

  it('returns undefined for unknown id', () => {
    expect(getDungeonById('nonexistent')).toBeUndefined();
    expect(getDungeonByAnchor('anchor-99')).toBeUndefined();
  });
});

// ── Generator tests ──────────────────────────────────────────────────

const SIMPLE_DUNGEON: DungeonLayout = {
  id: 'test-dungeon',
  name: 'Test Dungeon',
  anchorId: 'test-anchor',
  description: 'A test dungeon for unit tests.',
  recommendedLevel: 1,
  entranceRoomId: 'entrance',
  bossRoomId: 'boss',
  rooms: [
    {
      id: 'entrance',
      name: 'Entrance',
      type: 'entrance',
      description: 'The entrance to the test dungeon.',
      connections: [
        { to: 'corridor', direction: 'north', locked: false, secret: false },
        { to: 'side-room', direction: 'east', locked: false, secret: false },
      ],
    },
    {
      id: 'corridor',
      name: 'Corridor',
      type: 'corridor',
      description: 'A narrow corridor leading to the boss room.',
      connections: [
        { to: 'entrance', direction: 'south', locked: false, secret: false },
        { to: 'boss', direction: 'north', locked: false, secret: false },
      ],
    },
    {
      id: 'side-room',
      name: 'Side Room',
      type: 'treasure',
      description: 'A treasure room off the main path.',
      lootTableId: 'loot-tier-1',
      connections: [
        { to: 'entrance', direction: 'west', locked: false, secret: false },
      ],
    },
    {
      id: 'boss',
      name: 'Boss Room',
      type: 'boss',
      description: 'The final boss chamber.',
      encounterId: 'test-boss',
      connections: [
        { to: 'corridor', direction: 'south', locked: false, secret: false },
      ],
    },
  ],
};

describe('generateDungeonLayout', () => {
  let spatial: SpatialDungeon;

  it('generates a spatial layout from a dungeon definition', () => {
    spatial = generateDungeonLayout(SIMPLE_DUNGEON);
    expect(spatial).toBeDefined();
    expect(spatial.rooms.length).toBe(4);
  });

  it('places entrance at grid origin (0,0)', () => {
    spatial = generateDungeonLayout(SIMPLE_DUNGEON);
    const entrance = spatial.roomById.get('entrance');
    expect(entrance).toBeDefined();
    expect(entrance!.gridX).toBe(0);
    expect(entrance!.gridZ).toBe(0);
  });

  it('places corridor north of entrance', () => {
    spatial = generateDungeonLayout(SIMPLE_DUNGEON);
    const corridor = spatial.roomById.get('corridor');
    expect(corridor).toBeDefined();
    expect(corridor!.gridX).toBe(0);
    expect(corridor!.gridZ).toBe(-1); // north = -z
  });

  it('places side-room east of entrance', () => {
    spatial = generateDungeonLayout(SIMPLE_DUNGEON);
    const sideRoom = spatial.roomById.get('side-room');
    expect(sideRoom).toBeDefined();
    expect(sideRoom!.gridX).toBe(1);
    expect(sideRoom!.gridZ).toBe(0);
  });

  it('places boss north of corridor', () => {
    spatial = generateDungeonLayout(SIMPLE_DUNGEON);
    const boss = spatial.roomById.get('boss');
    expect(boss).toBeDefined();
    expect(boss!.gridX).toBe(0);
    expect(boss!.gridZ).toBe(-2);
  });

  it('computes world positions from grid positions', () => {
    spatial = generateDungeonLayout(SIMPLE_DUNGEON);
    const corridor = spatial.roomById.get('corridor')!;
    expect(corridor.worldX).toBe(corridor.gridX * ROOM_SIZE);
    expect(corridor.worldZ).toBe(corridor.gridZ * ROOM_SIZE);
  });

  it('computes correct bounds', () => {
    spatial = generateDungeonLayout(SIMPLE_DUNGEON);
    const [minX, minZ, maxX, maxZ] = spatial.bounds;
    expect(minX).toBe(0);
    expect(maxX).toBe(1); // side-room at x=1
    expect(minZ).toBe(-2); // boss at z=-2
    expect(maxZ).toBe(0); // entrance at z=0
  });

  it('computes world dimensions', () => {
    spatial = generateDungeonLayout(SIMPLE_DUNGEON);
    expect(spatial.worldWidth).toBe(2 * ROOM_SIZE); // 2 columns
    expect(spatial.worldDepth).toBe(3 * ROOM_SIZE); // 3 rows
  });

  it('resolves exits for each room', () => {
    spatial = generateDungeonLayout(SIMPLE_DUNGEON);
    const entrance = spatial.roomById.get('entrance')!;
    expect(entrance.exits.length).toBe(2);
    expect(entrance.exits.map((e) => e.targetRoomId).sort()).toEqual([
      'corridor',
      'side-room',
    ]);
  });

  it('no two rooms occupy the same grid cell', () => {
    spatial = generateDungeonLayout(SIMPLE_DUNGEON);
    const cells = new Set<string>();
    for (const room of spatial.rooms) {
      const key = `${room.gridX},${room.gridZ}`;
      expect(cells.has(key)).toBe(false);
      cells.add(key);
    }
  });

  it('all rooms in the layout are placed', () => {
    spatial = generateDungeonLayout(SIMPLE_DUNGEON);
    for (const room of SIMPLE_DUNGEON.rooms) {
      expect(spatial.roomById.has(room.id)).toBe(true);
    }
  });
});

describe('generateDungeonLayout with content dungeons', () => {
  it('generates layout for Thornfield Ruins', () => {
    const layout = getDungeonById('thornfield-ruins')!;
    const spatial = generateDungeonLayout(layout);
    expect(spatial.rooms.length).toBe(layout.rooms.length);
    expect(spatial.roomById.has(layout.entranceRoomId)).toBe(true);
    expect(spatial.roomById.has(layout.bossRoomId)).toBe(true);

    // No cell collisions
    const cells = new Set<string>();
    for (const room of spatial.rooms) {
      const key = `${room.gridX},${room.gridZ}`;
      expect(cells.has(key), `cell collision at ${key}`).toBe(false);
      cells.add(key);
    }
  });

  it('generates layout for Grailsend Temple', () => {
    const layout = getDungeonById('grailsend-temple')!;
    const spatial = generateDungeonLayout(layout);
    expect(spatial.rooms.length).toBe(layout.rooms.length);
    expect(spatial.roomById.has(layout.entranceRoomId)).toBe(true);
    expect(spatial.roomById.has(layout.bossRoomId)).toBe(true);

    // No cell collisions
    const cells = new Set<string>();
    for (const room of spatial.rooms) {
      const key = `${room.gridX},${room.gridZ}`;
      expect(cells.has(key), `cell collision at ${key}`).toBe(false);
      cells.add(key);
    }
  });
});

describe('getRoomColor', () => {
  it('returns distinct colors for different room types', () => {
    const types = [
      'entrance',
      'corridor',
      'chamber',
      'puzzle',
      'boss',
      'treasure',
      'shrine',
    ] as const;
    const colors = new Set(types.map((t) => getRoomColor(t)));
    expect(colors.size).toBe(types.length);
  });

  it('returns a number for each room type', () => {
    expect(typeof getRoomColor('boss')).toBe('number');
    expect(getRoomColor('boss')).toBeGreaterThan(0);
  });
});

describe('constants', () => {
  it('ROOM_SIZE is positive', () => {
    expect(ROOM_SIZE).toBeGreaterThan(0);
  });

  it('DUNGEON_DEPTH is negative (underground)', () => {
    expect(DUNGEON_DEPTH).toBeLessThan(0);
  });
});
