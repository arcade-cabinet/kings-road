/**
 * Core game type definitions
 */
import type * as THREE from 'three';
import type { BuildingArchetype } from '@/schemas/building.schema';
import type { FeatureDefinition } from '@/schemas/feature.schema';
import type { KingdomBiome, MapTile } from '@/schemas/kingdom.schema';
import type { MonsterArchetype } from '@/schemas/monster.schema';
import type { NPCArchetype } from '@/schemas/npc.schema';
import type { NPCBlueprint } from '@/schemas/npc-blueprint.schema';

/** Axis-Aligned Bounding Box for collision detection */
export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** NPC types available in the game */
export type NPCType = NPCArchetype;

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

/** A building placed in the world via the town layout system */
export interface PlacedBuildingData {
  archetype: BuildingArchetype;
  label: string;
  worldX: number;
  worldZ: number;
  rotation: number;
}

/** An NPC with a blueprint placed in the world */
export interface PlacedNPCData {
  interactable: Interactable;
  blueprint: NPCBlueprint;
}

/** A feature placed in the world from the kingdom map feature placement */
export interface PlacedFeatureData {
  /** Feature definition from content JSON */
  definition: FeatureDefinition;
  /** World-space position [x, y, z] */
  worldPosition: [number, number, number];
  /** Y rotation in radians */
  rotation: number;
  /** Feature instance id */
  id: string;
}

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
  /** Buildings placed by the config-driven town layout system */
  placedBuildings?: PlacedBuildingData[];
  /** NPCs with blueprint data for config-driven rendering */
  npcBlueprints?: PlacedNPCData[];
  /** Kingdom map tile for this chunk (present when kingdom map is active) */
  kingdomTile?: MapTile;
  /** Biome for this chunk (from kingdom map or fallback) */
  biome?: KingdomBiome;
  /** Features placed by the kingdom map feature placement system */
  placedFeatures?: PlacedFeatureData[];
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

/** A monster spawned from an encounter */
export interface SpawnedMonster {
  id: string;
  archetype: MonsterArchetype;
  position: [number, number, number];
}

/** An active encounter with spawned monsters */
export interface ActiveEncounter {
  tier: number;
  monsters: SpawnedMonster[];
}

/** Chunk modification tracking */
export interface ChunkDelta {
  gems: number[];
}
