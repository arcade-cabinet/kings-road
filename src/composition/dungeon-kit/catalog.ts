import type { DungeonPieceRole, PlacedRoomType } from './types';

export type { PlacedRoomType } from './types';

export interface KitPieceDef {
  id: string;
  role: DungeonPieceRole;
  path: string;
  weight: number;
  roomTypes?: PlacedRoomType[];
}

export const DUNGEON_KIT: Record<string, KitPieceDef> = {
  'wall-straight': {
    id: 'wall-straight',
    role: 'wall',
    path: '/assets/dungeon/kit/wall.glb',
    weight: 10,
  },
  'wall-cracked': {
    id: 'wall-cracked',
    role: 'wall',
    path: '/assets/dungeon/kit/wall-cracked.glb',
    weight: 6,
  },
  'wall-broken': {
    id: 'wall-broken',
    role: 'wall',
    path: '/assets/dungeon/kit/wall-broken.glb',
    weight: 4,
  },
  'wall-arched': {
    id: 'wall-arched',
    role: 'wall',
    path: '/assets/dungeon/kit/wall-arched.glb',
    weight: 5,
    roomTypes: ['chamber', 'boss', 'entrance'],
  },
  'wall-half': {
    id: 'wall-half',
    role: 'wall',
    path: '/assets/dungeon/kit/wall-half.glb',
    weight: 3,
  },
  'wall-pillar': {
    id: 'wall-pillar',
    role: 'wall',
    path: '/assets/dungeon/kit/wall-pillar.glb',
    weight: 4,
    roomTypes: ['chamber', 'boss'],
  },
  'wall-endcap': {
    id: 'wall-endcap',
    role: 'wall',
    path: '/assets/dungeon/kit/wall-endcap.glb',
    weight: 2,
  },
  'wall-corner': {
    id: 'wall-corner',
    role: 'wall',
    path: '/assets/dungeon/kit/wall-corner.glb',
    weight: 3,
  },
  'floor-large': {
    id: 'floor-large',
    role: 'floor',
    path: '/assets/dungeon/kit/floor-tile-large.glb',
    weight: 10,
  },
  'floor-dirt': {
    id: 'floor-dirt',
    role: 'floor',
    path: '/assets/dungeon/kit/floor-dirt-large.glb',
    weight: 6,
    roomTypes: ['corridor', 'chamber'],
  },
  'floor-broken-a': {
    id: 'floor-broken-a',
    role: 'floor',
    path: '/assets/dungeon/kit/floor-tile-small-broken-a.glb',
    weight: 4,
  },
  'floor-grate': {
    id: 'floor-grate',
    role: 'floor',
    path: '/assets/dungeon/kit/floor-tile-grate.glb',
    weight: 2,
    roomTypes: ['chamber', 'boss'],
  },
  'ceiling-tile': {
    id: 'ceiling-tile',
    role: 'ceiling',
    path: '/assets/dungeon/kit/ceiling-tile.glb',
    weight: 10,
  },
  'doorway-arch': {
    id: 'doorway-arch',
    role: 'doorway',
    path: '/assets/dungeon/kit/wall-doorway.glb',
    weight: 10,
  },
  'doorway-gated': {
    id: 'doorway-gated',
    role: 'doorway',
    path: '/assets/dungeon/kit/wall-gated.glb',
    weight: 5,
    roomTypes: ['boss', 'entrance'],
  },
  'doorway-arched-window': {
    id: 'doorway-arched-window',
    role: 'doorway',
    path: '/assets/dungeon/kit/wall-arched-window-open.glb',
    weight: 3,
    roomTypes: ['chamber', 'boss'],
  },
  'scatter-torch': {
    id: 'scatter-torch',
    role: 'scatter',
    path: '/assets/dungeon/kit/torch-lit.glb',
    weight: 8,
  },
  'scatter-torch-mounted': {
    id: 'scatter-torch-mounted',
    role: 'scatter',
    path: '/assets/dungeon/kit/torch-mounted.glb',
    weight: 6,
  },
  'scatter-barrel': {
    id: 'scatter-barrel',
    role: 'scatter',
    path: '/assets/dungeon/kit/barrel-large.glb',
    weight: 5,
    roomTypes: ['chamber', 'entrance'],
  },
  'scatter-barrel-small': {
    id: 'scatter-barrel-small',
    role: 'scatter',
    path: '/assets/dungeon/kit/barrel-small.glb',
    weight: 4,
  },
  'scatter-column': {
    id: 'scatter-column',
    role: 'scatter',
    path: '/assets/dungeon/kit/column.glb',
    weight: 3,
    roomTypes: ['chamber', 'boss'],
  },
  'scatter-debris': {
    id: 'scatter-debris',
    role: 'scatter',
    path: '/assets/dungeon/kit/floor-dirt-large-rocky.glb',
    weight: 6,
  },
};

export function getKitPiecesByRole(
  role: DungeonPieceRole,
  roomType?: PlacedRoomType,
): KitPieceDef[] {
  return Object.values(DUNGEON_KIT).filter((p) => {
    if (p.role !== role) return false;
    if (p.roomTypes && roomType && !p.roomTypes.includes(roomType))
      return false;
    return true;
  });
}

export function weightedPickKit(
  pieces: KitPieceDef[],
  rng: () => number,
): KitPieceDef {
  if (pieces.length === 0) {
    throw new Error('weightedPickKit: no pieces provided');
  }
  const total = pieces.reduce((sum, p) => sum + p.weight, 0);
  let r = rng() * total;
  for (const piece of pieces) {
    r -= piece.weight;
    if (r <= 0) return piece;
  }
  return pieces[pieces.length - 1];
}
