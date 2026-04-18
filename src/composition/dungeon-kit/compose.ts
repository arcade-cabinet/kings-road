import { createRng } from '@/core';

import { getKitPiecesByRole, weightedPickKit } from './catalog';
import type { DungeonKitPlacement, PlacedRoom } from './types';

const TILE = 2;
const CEILING_HEIGHT = 4;

const SCATTER_COUNT: Record<string, number> = {
  corridor: 2,
  chamber: 4,
  entrance: 4,
  boss: 6,
};

function placeWallLine(
  placements: DungeonKitPlacement[],
  room: PlacedRoom,
  side: 'north' | 'south' | 'east' | 'west',
  rng: () => number,
): void {
  const isNS = side === 'north' || side === 'south';
  const length = isNS ? room.width : room.depth;
  const slots = Math.round(length / TILE);
  const midSlot = (slots - 1) / 2;
  const isExit = room.exits.includes(side);

  const rotY =
    side === 'north'
      ? 0
      : side === 'south'
        ? Math.PI
        : side === 'east'
          ? -Math.PI / 2
          : Math.PI / 2;

  const wallPieces = getKitPiecesByRole('wall', room.type);
  const doorPieces = getKitPiecesByRole('doorway', room.type);

  for (let i = 0; i < slots; i++) {
    const offset = (i - midSlot) * TILE;
    let px = room.center.x;
    let pz = room.center.z;

    if (side === 'north') {
      px += offset;
      pz -= room.depth / 2;
    } else if (side === 'south') {
      px += offset;
      pz += room.depth / 2;
    } else if (side === 'east') {
      px += room.width / 2;
      pz += offset;
    } else {
      px -= room.width / 2;
      pz += offset;
    }

    const isDoorSlot = isExit && i === Math.round(midSlot);
    const role = isDoorSlot ? 'doorway' : 'wall';
    const pieces = isDoorSlot ? doorPieces : wallPieces;
    if (pieces.length === 0) continue;
    const piece = weightedPickKit(pieces, rng);

    placements.push({
      assetId: piece.id,
      position: { x: px, y: 0, z: pz },
      rotation: { x: 0, y: rotY, z: 0 },
      scale: 1,
      role,
    });
  }
}

export function composeDungeonRoom(
  room: PlacedRoom,
  seed: string,
): DungeonKitPlacement[] {
  const rng = createRng(`dungeon-room:${room.id}:${seed}`);
  const placements: DungeonKitPlacement[] = [];

  const floorsX = Math.max(1, Math.round(room.width / TILE));
  const floorsZ = Math.max(1, Math.round(room.depth / TILE));

  for (let ix = 0; ix < floorsX; ix++) {
    for (let iz = 0; iz < floorsZ; iz++) {
      const x = room.center.x + (ix - floorsX / 2 + 0.5) * TILE;
      const z = room.center.z + (iz - floorsZ / 2 + 0.5) * TILE;
      const floorPieces = getKitPiecesByRole('floor', room.type);
      const piece = weightedPickKit(floorPieces, rng);
      placements.push({
        assetId: piece.id,
        position: { x, y: 0, z },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        role: 'floor',
      });
    }
  }

  for (let ix = 0; ix < floorsX; ix++) {
    for (let iz = 0; iz < floorsZ; iz++) {
      const x = room.center.x + (ix - floorsX / 2 + 0.5) * TILE;
      const z = room.center.z + (iz - floorsZ / 2 + 0.5) * TILE;
      const ceilPieces = getKitPiecesByRole('ceiling');
      const piece = weightedPickKit(ceilPieces, rng);
      placements.push({
        assetId: piece.id,
        position: { x, y: CEILING_HEIGHT, z },
        rotation: { x: Math.PI, y: 0, z: 0 },
        scale: 1,
        role: 'ceiling',
      });
    }
  }

  for (const side of ['north', 'south', 'east', 'west'] as const) {
    placeWallLine(placements, room, side, rng);
  }

  const scatterCount = SCATTER_COUNT[room.type] ?? 2;
  const scatterPieces = getKitPiecesByRole('scatter', room.type);
  for (let i = 0; i < scatterCount; i++) {
    const piece = weightedPickKit(scatterPieces, rng);
    const x = room.center.x + (rng() - 0.5) * (room.width - TILE);
    const z = room.center.z + (rng() - 0.5) * (room.depth - TILE);
    placements.push({
      assetId: piece.id,
      position: { x, y: 0, z },
      rotation: { x: 0, y: rng() * Math.PI * 2, z: 0 },
      scale: 0.8 + rng() * 0.4,
      role: 'scatter',
    });
  }

  return placements;
}
