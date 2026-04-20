import type { Vec3 } from '@/core';
import type { VillageFootprint } from './parts/schema';

/**
 * Output of composeBuilding — a single GLB instance within a composed building.
 * position is in building-local space; callers translate to world space.
 * Compatible with CompositionLayer.AnyPlacement (rotation as rotY radians).
 */
export interface BuildingPlacement {
  /** GLB path with /assets/ prefix stripped — ready for GlbInstancer. */
  assetId: string;
  /** Position in building-local space (origin = building footprint center at y=0). */
  position: Vec3;
  /** Y-axis rotation in radians. */
  rotation: number;
  scale: number;
  /** Structural role for debug + future biome-driven tint selection. */
  role: string;
}

/**
 * One building slot produced by composeTownLayout.
 * Chunk.tsx iterates these, calling composeBuilding per slot, then translates
 * each BuildingPlacement by slot.position and adds slot.rotationY to rotation.
 */
export interface TownBuildingSlot {
  footprint: VillageFootprint;
  /** World-space origin for this building (y=0 ground level). */
  position: Vec3;
  /** Rotation so the building faces the town center (radians, Y axis). */
  rotationY: number;
}

/** Input config for composeTownLayout. */
export interface VillageTownConfig {
  /** Unique identifier — used in RNG seed for determinism. */
  id: string;
  /** World-space center of the town layout area. */
  center: { x: number; z: number };
  /** Radius of the town layout area in metres. */
  radius: number;
  /**
   * Building role labels — one slot per entry, capped at 20.
   * 'landmark' → 5×5 footprint; everything else → randomly 3×3 or 4×4.
   */
  roles: string[];
}
