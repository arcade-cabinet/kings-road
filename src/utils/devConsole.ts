/**
 * Developer playtesting console — exposes window.__DEV__ in dev mode.
 *
 * Usage: open browser console and call e.g.
 *   __DEV__.getPlayerInfo()
 *   __DEV__.moveToSettlement('ravensgate')
 *   __DEV__.setTimeOfDay(18)
 */

import * as THREE from 'three';
import {
  activateQuest as activateQuestAction,
  completeQuest as completeQuestAction,
  getQuestState,
} from '@/ecs/actions/quest';
import {
  clearWorld,
  generateWorld,
  getFeaturesAt,
  getTileAtGrid,
  getTileAtWorld,
  getWorldState,
  setWorldState,
} from '@/ecs/actions/world';
import { useWorldSession } from '@/ecs/hooks/useWorldSession';
import {
  getChunkState,
  getEnvironment,
  getPlayer,
  getCamera,
  setPlayerPosition,
  setTimeOfDay,
  setHealth,
  setStamina,
  setPlayerVelocityY,
} from '@/ecs/actions/game';
import { gridToWorldOrigin, worldToGrid } from '@/utils/worldCoords';
import { getRegionAt } from '@/world/kingdom-gen';
import { CHUNK_SIZE, PLAYER_HEIGHT } from './worldGen';

// Speed multiplier readable by PlayerController (default 1)
let _speedMultiplier = 1;
export function getDevSpeedMultiplier(): number {
  return _speedMultiplier;
}

// Fly mode flag readable by PlayerController
let _flyMode = false;
export function getDevFlyMode(): boolean {
  return _flyMode;
}

function fmt(label: string, data: unknown): void {
  console.log(`%c[DEV] ${label}`, 'color: #d4a017; font-weight: bold;', data);
}

const devConsole = {
  // ── Movement & teleportation ─────────────────────────────────────────

  moveToSettlement(settlementId: string) {
    const map = getWorldState().kingdomMap;
    if (!map) {
      console.warn('[DEV] No kingdom map — start a game first.');
      return;
    }
    const settlement = map.settlements.find((s) => s.id === settlementId);
    if (!settlement) {
      console.warn(
        `[DEV] Settlement "${settlementId}" not found. Use listSettlements() to see available IDs.`,
      );
      return;
    }
    const [gx, gy] = settlement.position;
    const [wx, wz] = gridToWorldOrigin(gx, gy);
    // Place player at center of the settlement chunk
    const pos = new THREE.Vector3(
      wx + CHUNK_SIZE / 2,
      PLAYER_HEIGHT,
      wz + CHUNK_SIZE / 2,
    );
    setPlayerPosition(pos);
    fmt(`Teleported to ${settlement.name}`, {
      gx,
      gy,
      worldX: pos.x,
      worldZ: pos.z,
    });
  },

  moveToGrid(gx: number, gy: number) {
    const [wx, wz] = gridToWorldOrigin(gx, gy);
    const pos = new THREE.Vector3(
      wx + CHUNK_SIZE / 2,
      PLAYER_HEIGHT,
      wz + CHUNK_SIZE / 2,
    );
    setPlayerPosition(pos);
    fmt(`Teleported to grid (${gx}, ${gy})`, {
      worldX: pos.x,
      worldZ: pos.z,
    });
  },

  moveForward(distance: number) {
    const player = getPlayer();
    const camera = getCamera();
    const yaw = camera.cameraYaw;
    const pos = player.playerPosition.clone();
    // Camera yaw 0 = looking along -Z, consistent with Three.js convention
    pos.x -= Math.sin(yaw) * distance;
    pos.z -= Math.cos(yaw) * distance;
    setPlayerPosition(pos);
    fmt(`Moved forward ${distance} units`, { x: pos.x, z: pos.z });
  },

  // ── Observation ──────────────────────────────────────────────────────

  getPlayerInfo() {
    const player = getPlayer();
    const camera = getCamera();
    const chunks = getChunkState();
    const env = getEnvironment();
    const ws = getWorldState();
    const pos = player.playerPosition;
    const [gx, gy] = worldToGrid(pos.x, pos.z);
    const map = ws.kingdomMap;
    const tile = getTileAtGrid(gx, gy);
    const region = map ? getRegionAt(map, gx, gy) : undefined;
    const info = {
      position: {
        x: pos.x.toFixed(1),
        y: pos.y.toFixed(1),
        z: pos.z.toFixed(1),
      },
      grid: { gx, gy },
      chunk: chunks.currentChunkKey,
      chunkName: chunks.currentChunkName,
      chunkType: chunks.currentChunkType,
      biome: tile?.biome ?? 'unknown',
      region: region?.name ?? 'none',
      health: player.health,
      stamina: player.stamina,
      facing: `${((camera.cameraYaw * 180) / Math.PI).toFixed(1)} deg`,
      timeOfDay: `${(env.timeOfDay * 24).toFixed(1)}h`,
    };
    fmt('Player Info', info);
    return info;
  },

  getKingdomInfo() {
    const map = getWorldState().kingdomMap;
    if (!map) {
      console.warn('[DEV] No kingdom map — start a game first.');
      return null;
    }
    const info = {
      seed: map.seed,
      width: map.width,
      height: map.height,
      settlementCount: map.settlements.length,
      roadCount: map.roads.length,
      regionCount: map.regions.length,
    };
    fmt('Kingdom Info', info);
    return info;
  },

  listSettlements() {
    const map = getWorldState().kingdomMap;
    if (!map) {
      console.warn('[DEV] No kingdom map — start a game first.');
      return [];
    }
    const list = map.settlements.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      position: s.position,
    }));
    console.table(list);
    return list;
  },

  listNearbyNPCs(radius = 30) {
    const player = getPlayer();
    const chunks = getChunkState();
    const pos = player.playerPosition;
    const nearby = chunks.globalInteractables
      .filter((i) => {
        const dx = i.position.x - pos.x;
        const dz = i.position.z - pos.z;
        return Math.sqrt(dx * dx + dz * dz) <= radius;
      })
      .map((i) => ({
        id: i.id,
        name: i.name,
        type: i.type,
        distance: Math.sqrt(
          (i.position.x - pos.x) ** 2 + (i.position.z - pos.z) ** 2,
        ).toFixed(1),
      }));
    if (nearby.length === 0) {
      fmt(`No NPCs within ${radius} units`, null);
    } else {
      console.table(nearby);
    }
    return nearby;
  },

  getCurrentChunkData() {
    const chunks = getChunkState();
    const chunk = chunks.activeChunks.get(chunks.currentChunkKey);
    if (!chunk) {
      console.warn('[DEV] No active chunk at current position.');
      return null;
    }
    const info = {
      key: chunk.key,
      cx: chunk.cx,
      cz: chunk.cz,
      type: chunk.type,
      name: chunk.name,
      biome: chunk.biome ?? 'unknown',
      buildingCount: chunk.placedBuildings?.length ?? 0,
      npcCount: chunk.npcBlueprints?.length ?? 0,
      featureCount: chunk.placedFeatures?.length ?? 0,
      collidableCount: chunk.collidables.length,
      interactableCount: chunk.interactables.length,
    };
    fmt('Current Chunk', info);
    return info;
  },

  // ── Game control ─────────────────────────────────────────────────────

  setTimeOfDay(hour: number) {
    const normalized = (hour % 24) / 24;
    setTimeOfDay(normalized);
    fmt(`Time set to ${hour % 24}:00`, { normalized });
  },

  setHealth(value: number) {
    setHealth(value);
    fmt('Health set', value);
  },

  setStamina(value: number) {
    setStamina(value);
    fmt('Stamina set', value);
  },

  toggleFlyMode() {
    _flyMode = !_flyMode;
    if (_flyMode) {
      setPlayerVelocityY(0);
    }
    fmt('Fly mode', _flyMode ? 'ON' : 'OFF');
    return _flyMode;
  },

  speedMultiplier(mult: number) {
    _speedMultiplier = Math.max(0.1, mult);
    fmt('Speed multiplier set', _speedMultiplier);
    return _speedMultiplier;
  },

  // ── World inspection ─────────────────────────────────────────────────

  inspectTile(gx: number, gy: number) {
    const tile = getTileAtGrid(gx, gy);
    if (!tile) {
      console.warn(`[DEV] No tile at grid (${gx}, ${gy}).`);
      return null;
    }
    fmt(`Tile (${gx}, ${gy})`, tile);
    return tile;
  },

  inspectRegion(gx: number, gy: number) {
    const map = getWorldState().kingdomMap;
    if (!map) {
      console.warn('[DEV] No kingdom map — start a game first.');
      return null;
    }
    const region = getRegionAt(map, gx, gy);
    if (!region) {
      console.warn(`[DEV] No region at grid (${gx}, ${gy}).`);
      return null;
    }
    fmt(`Region at (${gx}, ${gy})`, region);
    return region;
  },

  // ── Quest helpers ────────────────────────────────────────────────────

  listQuests() {
    const qs = getQuestState();
    const info = {
      active: qs.activeQuests,
      completed: qs.completedQuests,
      triggered: qs.triggeredQuests,
    };
    fmt('Quests', info);
    return info;
  },

  activateQuest(questId: string, branch?: 'A' | 'B') {
    activateQuestAction(questId, branch);
    fmt('Quest activated', { questId, branch });
  },

  completeQuest(questId: string) {
    completeQuestAction(questId);
    fmt('Quest completed', questId);
  },
};

// ── Type augmentation for window.__DEV__ ─────────────────────────────

type DevConsole = typeof devConsole;

declare global {
  interface Window {
    __DEV__: DevConsole;
  }
}

/** Call once at app startup (guarded by import.meta.env.DEV at the call site). */
export function initDevConsole(): void {
  window.__DEV__ = devConsole;
  console.log(
    '%c[DEV] Playtesting console ready — type __DEV__ to see available commands.',
    'color: #d4a017; font-weight: bold; font-size: 14px;',
  );
}
