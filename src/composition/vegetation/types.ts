import type { Vec3 } from '@/core';

export interface VegetationPlacement {
  assetId: string;
  position: Vec3;
  rotation: number;
  scale: number;
}

export type HeightSampler = (worldX: number, worldZ: number) => number;

export const CHUNK_SIZE = 64;
