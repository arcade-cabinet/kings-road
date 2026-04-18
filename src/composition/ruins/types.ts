import type { Vec3 } from '@/core';

export interface RuinsPlacement {
  assetId: string;
  position: Vec3;
  rotation: Vec3;
  scale: number;
  /** Optional variant tag for the scene renderer (e.g. 'overgrown', 'cracked') */
  variant?: string;
}

/** Input shape for composeRuins — a town-level footprint */
export interface TownConfig {
  /** Unique identifier for determinism */
  id: string;
  /** World-space center of the town area */
  center: Vec3;
  /** Approximate radius in world units */
  radius: number;
}
