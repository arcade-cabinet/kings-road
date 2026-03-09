/**
 * Core game type definitions
 */
import type * as THREE from 'three';

/** Axis-Aligned Bounding Box for collision detection */
export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** NPC types available in the game */
export type NPCType = 'blacksmith' | 'innkeeper' | 'wanderer' | 'merchant';

/** Interactable entity (NPCs, objects) */
export interface Interactable {
  id: string;
  position: THREE.Vector3;
  radius: number;
  type: NPCType;
  name: string;
  dialogueText: string;
  actionVerb: string;
}

/** Chunk terrain types */
export type ChunkType = 'WILD' | 'TOWN' | 'DUNGEON' | 'ROAD';

/** Data for a single world chunk */
export interface ChunkData {
  cx: number;
  cz: number;
  key: string;
  type: ChunkType;
  name: string;
  collidables: AABB[];
  interactables: Interactable[];
  collectedGems: Set<number>;
}

/** Player input state */
export interface InputState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  q: boolean;
  e: boolean;
  space: boolean;
  shift: boolean;
  action: boolean;
}

/** Chunk modification tracking */
export interface ChunkDelta {
  gems: number[];
}
