/**
 * Dungeon spatial layout generator.
 *
 * Converts a DungeonLayout (room graph with named direction connections) into
 * a spatial grid of placed rooms suitable for 3D rendering. Uses BFS from the
 * entrance room to assign grid positions based on connection directions.
 *
 * Each room occupies one cell on the grid. The ROOM_SIZE constant defines the
 * world-space size of each cell. The entire dungeon is offset underground at
 * DUNGEON_DEPTH below the surface.
 */
import type {
  DungeonLayout,
  DungeonRoom,
  RoomType,
} from '@/schemas/dungeon.schema';

/** World-space size of a single dungeon room */
export const ROOM_SIZE = 20;

/** Y depth of dungeon below ground level (negative = underground) */
export const DUNGEON_DEPTH = -30;

/** Direction offsets on the 2D grid */
const DIRECTION_OFFSET: Record<string, [number, number]> = {
  north: [0, -1],
  south: [0, 1],
  east: [1, 0],
  west: [-1, 0],
  up: [0, -1],
  down: [0, 1],
};

/** A room placed on the spatial grid */
export interface PlacedRoom {
  room: DungeonRoom;
  /** Grid column */
  gridX: number;
  /** Grid row */
  gridZ: number;
  /** World-space center X (relative to dungeon origin) */
  worldX: number;
  /** World-space center Z (relative to dungeon origin) */
  worldZ: number;
  /** Room connections with resolved target grid positions */
  exits: PlacedExit[];
}

/** A resolved exit from a placed room */
export interface PlacedExit {
  direction: string;
  targetRoomId: string;
  locked: boolean;
  secret: boolean;
}

/** The full spatial dungeon layout ready for rendering */
export interface SpatialDungeon {
  layout: DungeonLayout;
  rooms: PlacedRoom[];
  /** Grid bounds: [minX, minZ, maxX, maxZ] */
  bounds: [number, number, number, number];
  /** World-space width and depth of the dungeon */
  worldWidth: number;
  worldDepth: number;
  /** Map from room ID to placed room for quick lookup */
  roomById: Map<string, PlacedRoom>;
}

/**
 * Generate a spatial layout from a dungeon definition.
 *
 * BFS-walks from the entrance room, placing each room on the grid based on
 * the connection direction from its parent. If a cell is already occupied,
 * the room is offset to the nearest free cell.
 */
export function generateDungeonLayout(layout: DungeonLayout): SpatialDungeon {
  const roomMap = new Map<string, DungeonRoom>();
  for (const room of layout.rooms) {
    roomMap.set(room.id, room);
  }

  const placed = new Map<string, { gridX: number; gridZ: number }>();
  const occupied = new Set<string>();
  const cellKey = (x: number, z: number) => `${x},${z}`;

  // BFS from entrance
  const queue: { roomId: string; gridX: number; gridZ: number }[] = [];

  // Place entrance at origin
  const entranceId = layout.entranceRoomId;
  placed.set(entranceId, { gridX: 0, gridZ: 0 });
  occupied.add(cellKey(0, 0));
  queue.push({ roomId: entranceId, gridX: 0, gridZ: 0 });

  // Build reverse adjacency: for each room, also discover it from rooms that
  // reference it (handles secret/one-way connections like reliquary-of-saints)
  const reverseAdj = new Map<string, { from: string; direction: string }[]>();
  for (const room of layout.rooms) {
    for (const conn of room.connections) {
      if (!reverseAdj.has(conn.to)) reverseAdj.set(conn.to, []);
      reverseAdj.get(conn.to)!.push({
        from: room.id,
        direction: conn.direction,
      });
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const room = roomMap.get(current.roomId);
    if (!room) continue;

    // Walk forward connections
    for (const conn of room.connections) {
      if (placed.has(conn.to)) continue;

      const offset = DIRECTION_OFFSET[conn.direction] ?? [1, 0];
      let targetX = current.gridX + offset[0];
      let targetZ = current.gridZ + offset[1];

      if (occupied.has(cellKey(targetX, targetZ))) {
        const free = findFreeCell(targetX, targetZ, occupied);
        targetX = free[0];
        targetZ = free[1];
      }

      placed.set(conn.to, { gridX: targetX, gridZ: targetZ });
      occupied.add(cellKey(targetX, targetZ));
      queue.push({ roomId: conn.to, gridX: targetX, gridZ: targetZ });
    }

    // Walk reverse connections (rooms that connect TO this room)
    const reverseConns = reverseAdj.get(current.roomId) ?? [];
    for (const rev of reverseConns) {
      if (placed.has(rev.from)) continue;

      // Place the source room in the opposite direction
      const opposites: Record<string, string> = {
        north: 'south',
        south: 'north',
        east: 'west',
        west: 'east',
        up: 'down',
        down: 'up',
      };
      const revDir = opposites[rev.direction] ?? 'east';
      const offset = DIRECTION_OFFSET[revDir] ?? [1, 0];
      let targetX = current.gridX + offset[0];
      let targetZ = current.gridZ + offset[1];

      if (occupied.has(cellKey(targetX, targetZ))) {
        const free = findFreeCell(targetX, targetZ, occupied);
        targetX = free[0];
        targetZ = free[1];
      }

      placed.set(rev.from, { gridX: targetX, gridZ: targetZ });
      occupied.add(cellKey(targetX, targetZ));
      queue.push({ roomId: rev.from, gridX: targetX, gridZ: targetZ });
    }
  }

  // Build PlacedRoom array
  let minX = 0;
  let maxX = 0;
  let minZ = 0;
  let maxZ = 0;
  const roomById = new Map<string, PlacedRoom>();

  const rooms: PlacedRoom[] = [];
  for (const [roomId, pos] of placed) {
    const room = roomMap.get(roomId);
    if (!room) continue;

    minX = Math.min(minX, pos.gridX);
    maxX = Math.max(maxX, pos.gridX);
    minZ = Math.min(minZ, pos.gridZ);
    maxZ = Math.max(maxZ, pos.gridZ);

    const exits: PlacedExit[] = room.connections.map((conn) => ({
      direction: conn.direction,
      targetRoomId: conn.to,
      locked: conn.locked ?? false,
      secret: conn.secret ?? false,
    }));

    const placedRoom: PlacedRoom = {
      room,
      gridX: pos.gridX,
      gridZ: pos.gridZ,
      worldX: pos.gridX * ROOM_SIZE,
      worldZ: pos.gridZ * ROOM_SIZE,
      exits,
    };
    rooms.push(placedRoom);
    roomById.set(roomId, placedRoom);
  }

  const gridWidth = maxX - minX + 1;
  const gridDepth = maxZ - minZ + 1;

  return {
    layout,
    rooms,
    bounds: [minX, minZ, maxX, maxZ],
    worldWidth: gridWidth * ROOM_SIZE,
    worldDepth: gridDepth * ROOM_SIZE,
    roomById,
  };
}

/** Get the color associated with a room type for rendering */
export function getRoomColor(type: RoomType): number {
  switch (type) {
    case 'entrance':
      return 0x8b8b6a;
    case 'corridor':
      return 0x6a6a6a;
    case 'chamber':
      return 0x7a7a5a;
    case 'puzzle':
      return 0x5a6a8a;
    case 'boss':
      return 0x8a4a4a;
    case 'treasure':
      return 0x8a7a3a;
    case 'shrine':
      return 0xaa9a5a;
    default:
      return 0x6a6a6a;
  }
}

/**
 * Find the nearest free cell to a desired position using a spiral search.
 */
function findFreeCell(
  startX: number,
  startZ: number,
  occupied: Set<string>,
): [number, number] {
  const key = (x: number, z: number) => `${x},${z}`;

  // Spiral outward
  for (let radius = 1; radius <= 10; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;
        const x = startX + dx;
        const z = startZ + dz;
        if (!occupied.has(key(x, z))) {
          return [x, z];
        }
      }
    }
  }

  // Fallback — should never happen with reasonable dungeon sizes
  return [startX + 11, startZ];
}
