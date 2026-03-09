/**
 * Town config loader — maps chunk coordinates to town configurations.
 *
 * Ashford is anchored at chunk (0,0), the player's starting town.
 * Future towns can be added here by mapping their anchor coordinates.
 */

import chapelBldg from '../../../content/buildings/chapel.json';
import cottageBldg from '../../../content/buildings/cottage.json';
import houseLargeBldg from '../../../content/buildings/house_large.json';
import smithyBldg from '../../../content/buildings/smithy.json';
import tavernBldg from '../../../content/buildings/tavern.json';
import aldricNpc from '../../../content/npcs/aldric.json';
import bessNpc from '../../../content/npcs/bess.json';
import fatherCedricNpc from '../../../content/npcs/father-cedric.json';
import goodwifeMaren from '../../../content/npcs/goodwife-maren.json';
import oldTomasNpc from '../../../content/npcs/old-tomas.json';
// Static imports — bundled by Vite, no runtime fs access needed
import ashfordTown from '../../../content/towns/ashford.json';
import type { BuildingArchetype } from '../../schemas/building.schema';
import type { NPCBlueprint } from '../../schemas/npc-blueprint.schema';
import type { TownConfig } from '../../schemas/town.schema';

// Building archetype registry (keyed by archetype id)
const BUILDING_ARCHETYPES: Record<string, BuildingArchetype> = {
  cottage: cottageBldg as unknown as BuildingArchetype,
  tavern: tavernBldg as unknown as BuildingArchetype,
  smithy: smithyBldg as unknown as BuildingArchetype,
  chapel: chapelBldg as unknown as BuildingArchetype,
  house_large: houseLargeBldg as unknown as BuildingArchetype,
};

// NPC blueprint registry (keyed by NPC id)
const NPC_BLUEPRINTS: Record<string, NPCBlueprint> = {
  aldric: aldricNpc as unknown as NPCBlueprint,
  bess: bessNpc as unknown as NPCBlueprint,
  'father-cedric': fatherCedricNpc as unknown as NPCBlueprint,
  'old-tomas': oldTomasNpc as unknown as NPCBlueprint,
  'goodwife-maren': goodwifeMaren as unknown as NPCBlueprint,
};

/** Town anchor: maps "cx,cz" chunk key to a TownConfig */
const TOWN_ANCHORS: Record<string, TownConfig> = {
  '0,0': ashfordTown as unknown as TownConfig,
};

/** Look up a town config by chunk coordinates. Returns undefined for non-town chunks. */
export function getTownConfig(cx: number, cz: number): TownConfig | undefined {
  return TOWN_ANCHORS[`${cx},${cz}`];
}

/** Resolve a building archetype id to its full config, applying placement overrides. */
export function resolveBuildingArchetype(
  archetypeId: string,
  overrides?: Record<string, unknown>,
): BuildingArchetype | undefined {
  const base = BUILDING_ARCHETYPES[archetypeId];
  if (!base) return undefined;
  if (!overrides) return base;
  return { ...base, ...overrides } as BuildingArchetype;
}

/** Resolve an NPC id to its full blueprint. */
export function resolveNPCBlueprint(npcId: string): NPCBlueprint | undefined {
  return NPC_BLUEPRINTS[npcId];
}
