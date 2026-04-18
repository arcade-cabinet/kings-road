import type { Vec3 } from '@/core';

export type DungeonPieceRole =
  | 'wall'
  | 'floor'
  | 'ceiling'
  | 'doorway'
  | 'scatter';

export type PlacedRoomType = 'corridor' | 'chamber' | 'entrance' | 'boss';

export interface DungeonKitPlacement {
  assetId: string;
  position: Vec3;
  rotation: Vec3;
  scale: number;
  role: DungeonPieceRole;
}

/** Input descriptor for composeDungeonRoom. Distinct from src/world/dungeon-generator PlacedRoom. */
export interface DungeonKitRoom {
  id: string;
  type: PlacedRoomType;
  center: Vec3;
  width: number;
  depth: number;
  exits: ('north' | 'south' | 'east' | 'west')[];
}
