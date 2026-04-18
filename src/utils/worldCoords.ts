import * as THREE from 'three';
import { TILE_SIZE } from '@/factories/building-factory';
import type { FacingDirection } from '@/schemas/town.schema';
import { getAllTownConfigs, getTownConfigById } from '@/world/town-configs';
import { CHUNK_SIZE, PLAYER_HEIGHT } from './worldGen';

export { TILE_SIZE } from '@/factories/building-factory';
// Re-export constants so consumers have a single import
export {
  BLOCK_SIZE,
  CHUNK_SIZE,
  PLAYER_HEIGHT,
  VIEW_DISTANCE,
} from './worldGen';

/**
 * Convert chunk grid coordinates to the world-space origin (bottom-left corner) of that chunk.
 */
export function chunkToWorldOrigin(
  cx: number,
  cz: number,
): { x: number; z: number } {
  return { x: cx * CHUNK_SIZE, z: cz * CHUNK_SIZE };
}

/**
 * Convert tile coordinates (relative to a chunk's center tile) to world position.
 */
export function tileToWorld(
  tileX: number,
  tileZ: number,
  chunkOriginX: number,
  chunkOriginZ: number,
  centerTileX = 0,
  centerTileZ = 0,
): { x: number; z: number } {
  return {
    x: chunkOriginX + (centerTileX + tileX) * TILE_SIZE,
    z: chunkOriginZ + (centerTileZ + tileZ) * TILE_SIZE,
  };
}

/**
 * Determine which chunk grid cell a world position falls in.
 */
export function worldToChunk(
  worldX: number,
  worldZ: number,
): { cx: number; cz: number } {
  return {
    cx: Math.floor(worldX / CHUNK_SIZE),
    cz: Math.floor(worldZ / CHUNK_SIZE),
  };
}

/** Map a facing direction to a yaw in radians. */
export function facingToYaw(facing: FacingDirection): number {
  switch (facing) {
    case 'north':
      return 0;
    case 'south':
      return Math.PI;
    case 'east':
      return -Math.PI / 2;
    case 'west':
      return Math.PI / 2;
  }
}

/**
 * Look up a named spawn point from town configs.
 * Searches all authored town configs for a matching spawn id.
 * Returns the world-space position and yaw, or undefined if not found.
 *
 * Note: Spawn positions are relative to chunk (0,0) origin since authored
 * town configs define tile-space coordinates. At runtime, the kingdom map
 * determines the actual world position of each settlement.
 */
export function getSpawnPoint(
  spawnId: string,
  townId?: string,
): { position: THREE.Vector3; yaw: number } | undefined {
  // If a specific town is requested, look it up directly
  if (townId) {
    const config = getTownConfigById(townId);
    if (!config) return undefined;

    const spawn = config.spawns?.find((s) => s.id === spawnId);
    if (!spawn) return undefined;

    const [centerX, centerZ] = config.center;
    const world = tileToWorld(
      spawn.tile[0],
      spawn.tile[1],
      0,
      0,
      centerX,
      centerZ,
    );

    return {
      position: new THREE.Vector3(world.x, PLAYER_HEIGHT, world.z),
      yaw: facingToYaw(spawn.facing),
    };
  }

  // Search all authored configs
  for (const config of getAllTownConfigs()) {
    const spawn = config.spawns?.find((s) => s.id === spawnId);
    if (!spawn) continue;

    const [centerX, centerZ] = config.center;
    const world = tileToWorld(
      spawn.tile[0],
      spawn.tile[1],
      0,
      0,
      centerX,
      centerZ,
    );

    return {
      position: new THREE.Vector3(world.x, PLAYER_HEIGHT, world.z),
      yaw: facingToYaw(spawn.facing),
    };
  }

  return undefined;
}
