/**
 * Centralized game tuning values loaded from content/tuning.json.
 *
 * All gameplay constants that designers/developers need to tweak live here
 * instead of scattered across TypeScript source files.
 *
 * Usage: import { TUNING } from '@/utils/tuning';
 *        const speed = TUNING.player.walkSpeed;
 */

import tuningJson from '../../config/tuning.json';

// Re-export the full config as a typed constant
export const TUNING = tuningJson;

// ── Convenience re-exports for the most commonly used values ──────────
// These exist so existing code can migrate incrementally.

export const CHUNK_SIZE = TUNING.world.chunkSize;
export const BLOCK_SIZE = TUNING.world.blockSize;
export const VIEW_DISTANCE = TUNING.world.viewDistance;
export const MAX_TERRAIN_HEIGHT = TUNING.world.maxTerrainHeight;
export const OCEAN_HEIGHT = TUNING.world.oceanHeight;

export const PLAYER_HEIGHT = TUNING.player.height;
export const PLAYER_RADIUS = TUNING.player.radius;
