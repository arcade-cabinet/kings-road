/**
 * Town config loader — maps chunk coordinates to town configurations.
 *
 * Chunk coordinates are derived from road-spine anchor distances:
 *   cz = Math.floor(anchorDistance / CHUNK_SIZE)
 *
 * Anchor distances (from road-spine.json):
 *   Ashford (home)     →     0 → chunk (0,   0)
 *   Millbrook (01)     →  6000 → chunk (0,  50)
 *   Thornfield (02)    → 12000 → chunk (0, 100)
 *   Ravensgate (03)    → 17000 → chunk (0, 141)
 *   Pilgrim's Rest (04)→ 21000 → chunk (0, 175)
 *   Grailsend (05)     → 28000 → chunk (0, 233)
 */

// --- Building archetype imports ---
import barracksBldg from '../../../content/buildings/barracks.json';
import chapelBldg from '../../../content/buildings/chapel.json';
import cottageBldg from '../../../content/buildings/cottage.json';
import dormitoryBldg from '../../../content/buildings/dormitory.json';
import gateBldg from '../../../content/buildings/gate.json';
import guardPostBldg from '../../../content/buildings/guard_post.json';
import herbGardenBldg from '../../../content/buildings/herb_garden.json';
import houseLargeBldg from '../../../content/buildings/house_large.json';
import libraryBldg from '../../../content/buildings/library.json';
import manorBldg from '../../../content/buildings/manor.json';
import marketStallBldg from '../../../content/buildings/market_stall.json';
import prisonBldg from '../../../content/buildings/prison.json';
import smithyBldg from '../../../content/buildings/smithy.json';
import stableBldg from '../../../content/buildings/stable.json';
import tavernBldg from '../../../content/buildings/tavern.json';
import templeBldg from '../../../content/buildings/temple.json';
import watchtowerBldg from '../../../content/buildings/watchtower.json';
// --- NPC blueprint imports ---
import abbotGregoriusNpc from '../../../content/npcs/abbot-gregorius.json';
import aldricNpc from '../../../content/npcs/aldric.json';
import bardFinchNpc from '../../../content/npcs/bard-finch.json';
import bessNpc from '../../../content/npcs/bess.json';
import brotherAnselmNpc from '../../../content/npcs/brother-anselm.json';
import brotherThomasNpc from '../../../content/npcs/brother-thomas.json';
import campWardenNpc from '../../../content/npcs/camp-warden.json';
import captainHaleNpc from '../../../content/npcs/captain-hale.json';
import captainRoderickNpc from '../../../content/npcs/captain-roderick.json';
import elaraNpc from '../../../content/npcs/elara.json';
import farmerWynnNpc from '../../../content/npcs/farmer-wynn.json';
import fatherCedricNpc from '../../../content/npcs/father-cedric.json';
import geroldNpc from '../../../content/npcs/gerold.json';
import goodwifeMaren from '../../../content/npcs/goodwife-maren.json';
import grailsendHermitNpc from '../../../content/npcs/grailsend-hermit.json';
import gretaNpc from '../../../content/npcs/greta.json';
import guardMarcusNpc from '../../../content/npcs/guard-marcus.json';
import highlandRefugeeNpc from '../../../content/npcs/highland-refugee.json';
import lordAshwickNpc from '../../../content/npcs/lord-ashwick.json';
import lucyNpc from '../../../content/npcs/lucy.json';
import marthaNpc from '../../../content/npcs/martha.json';
import oldTomasNpc from '../../../content/npcs/old-tomas.json';
import prisonerSilasNpc from '../../../content/npcs/prisoner-silas.json';
import ruinKeeperNpc from '../../../content/npcs/ruin-keeper.json';
import sisterMaeveNpc from '../../../content/npcs/sister-maeve.json';
import templePilgrimNpc from '../../../content/npcs/temple-pilgrim.json';
import theGuardianNpc from '../../../content/npcs/the-guardian.json';
import theOracleNpc from '../../../content/npcs/the-oracle.json';
import thornfieldScholarNpc from '../../../content/npcs/thornfield-scholar.json';
import thorntonNpc from '../../../content/npcs/thornton.json';
// --- Town config imports ---
import ashfordTown from '../../../content/towns/ashford.json';
import grailsendTown from '../../../content/towns/grailsend.json';
import millbrookTown from '../../../content/towns/millbrook.json';
import pilgrimsRestTown from '../../../content/towns/pilgrims-rest.json';
import ravensgateTown from '../../../content/towns/ravensgate.json';
import thornfieldTown from '../../../content/towns/thornfield.json';
import type { BuildingArchetype } from '../../schemas/building.schema';
import type { NPCBlueprint } from '../../schemas/npc-blueprint.schema';
import type { TownConfig } from '../../schemas/town.schema';

// Building archetype registry (keyed by archetype id)
const BUILDING_ARCHETYPES: Record<string, BuildingArchetype> = {
  barracks: barracksBldg as unknown as BuildingArchetype,
  chapel: chapelBldg as unknown as BuildingArchetype,
  cottage: cottageBldg as unknown as BuildingArchetype,
  dormitory: dormitoryBldg as unknown as BuildingArchetype,
  gate: gateBldg as unknown as BuildingArchetype,
  guard_post: guardPostBldg as unknown as BuildingArchetype,
  herb_garden: herbGardenBldg as unknown as BuildingArchetype,
  house_large: houseLargeBldg as unknown as BuildingArchetype,
  library: libraryBldg as unknown as BuildingArchetype,
  manor: manorBldg as unknown as BuildingArchetype,
  market_stall: marketStallBldg as unknown as BuildingArchetype,
  prison: prisonBldg as unknown as BuildingArchetype,
  smithy: smithyBldg as unknown as BuildingArchetype,
  stable: stableBldg as unknown as BuildingArchetype,
  tavern: tavernBldg as unknown as BuildingArchetype,
  temple: templeBldg as unknown as BuildingArchetype,
  watchtower: watchtowerBldg as unknown as BuildingArchetype,
};

// NPC blueprint registry (keyed by NPC id)
const NPC_BLUEPRINTS: Record<string, NPCBlueprint> = {
  'abbot-gregorius': abbotGregoriusNpc as unknown as NPCBlueprint,
  aldric: aldricNpc as unknown as NPCBlueprint,
  'bard-finch': bardFinchNpc as unknown as NPCBlueprint,
  bess: bessNpc as unknown as NPCBlueprint,
  'camp-warden': campWardenNpc as unknown as NPCBlueprint,
  'brother-anselm': brotherAnselmNpc as unknown as NPCBlueprint,
  'brother-thomas': brotherThomasNpc as unknown as NPCBlueprint,
  'captain-hale': captainHaleNpc as unknown as NPCBlueprint,
  'captain-roderick': captainRoderickNpc as unknown as NPCBlueprint,
  elara: elaraNpc as unknown as NPCBlueprint,
  'farmer-wynn': farmerWynnNpc as unknown as NPCBlueprint,
  'father-cedric': fatherCedricNpc as unknown as NPCBlueprint,
  gerold: geroldNpc as unknown as NPCBlueprint,
  'grailsend-hermit': grailsendHermitNpc as unknown as NPCBlueprint,
  'goodwife-maren': goodwifeMaren as unknown as NPCBlueprint,
  greta: gretaNpc as unknown as NPCBlueprint,
  'highland-refugee': highlandRefugeeNpc as unknown as NPCBlueprint,
  'guard-marcus': guardMarcusNpc as unknown as NPCBlueprint,
  'lord-ashwick': lordAshwickNpc as unknown as NPCBlueprint,
  lucy: lucyNpc as unknown as NPCBlueprint,
  martha: marthaNpc as unknown as NPCBlueprint,
  'old-tomas': oldTomasNpc as unknown as NPCBlueprint,
  'prisoner-silas': prisonerSilasNpc as unknown as NPCBlueprint,
  'ruin-keeper': ruinKeeperNpc as unknown as NPCBlueprint,
  'sister-maeve': sisterMaeveNpc as unknown as NPCBlueprint,
  'temple-pilgrim': templePilgrimNpc as unknown as NPCBlueprint,
  'the-guardian': theGuardianNpc as unknown as NPCBlueprint,
  'thornfield-scholar': thornfieldScholarNpc as unknown as NPCBlueprint,
  'the-oracle': theOracleNpc as unknown as NPCBlueprint,
  thornton: thorntonNpc as unknown as NPCBlueprint,
};

/** Town anchor: maps "cx,cz" chunk key to a TownConfig */
const TOWN_ANCHORS: Record<string, TownConfig> = {
  '0,0': ashfordTown as unknown as TownConfig,
  '0,50': millbrookTown as unknown as TownConfig,
  '0,100': thornfieldTown as unknown as TownConfig,
  '0,141': ravensgateTown as unknown as TownConfig,
  '0,175': pilgrimsRestTown as unknown as TownConfig,
  '0,233': grailsendTown as unknown as TownConfig,
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
