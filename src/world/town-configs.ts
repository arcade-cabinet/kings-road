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
 *
 * Content is sourced from the content store (game.db) at runtime.
 */

import { cyrb128, mulberry32 } from '@/core';
import {
  getAllBuildings,
  getAllNamedNpcs,
  getAllNpcPools,
  getAllTowns,
  getBuilding as getBuildingFromStore,
  getNamedNpc,
  getNpcPool as getNpcPoolFromStore,
  isContentStoreReady,
} from '@/db/content-queries';
import type { BuildingArchetype } from '@/schemas/building.schema';
import type { Settlement, SettlementType } from '@/schemas/kingdom.schema';
import type { NPCDefinition } from '@/schemas/npc.schema';
import type { NPCBlueprint } from '@/schemas/npc-blueprint.schema';
import type { TownConfig, TownNPCPlacement } from '@/schemas/town.schema';

// ── Lazy-initialized caches (populated on first access from content store) ──

let cacheReady = false;
let BUILDING_ARCHETYPES: Record<string, BuildingArchetype> = {};
let NPC_BLUEPRINTS: Record<string, NPCBlueprint> = {};
let NPC_POOLS: Record<string, NPCDefinition> = {};
let TOWN_ANCHORS: Record<string, TownConfig> = {};
let TOWN_CONFIGS_BY_ID: Record<string, TownConfig> = {};

function ensureCache(): boolean {
  if (cacheReady) return true;
  if (!isContentStoreReady()) return false;

  // Build building archetype registry
  BUILDING_ARCHETYPES = {};
  for (const b of getAllBuildings()) {
    BUILDING_ARCHETYPES[b.id] = b;
  }

  // Build NPC blueprint registry
  NPC_BLUEPRINTS = {};
  for (const npc of getAllNamedNpcs()) {
    NPC_BLUEPRINTS[npc.id] = npc;
  }

  // Build NPC pool registry
  NPC_POOLS = {};
  for (const pool of getAllNpcPools()) {
    NPC_POOLS[pool.archetype] = pool;
  }

  // Build town anchor maps from all town configs
  TOWN_ANCHORS = {};
  TOWN_CONFIGS_BY_ID = {};
  for (const town of getAllTowns()) {
    TOWN_CONFIGS_BY_ID[town.id] = town;
  }

  // Build chunk coordinate mapping from anchor distances
  // Standard anchor positions: 0→(0,0), 6000→(0,50), 12000→(0,100), etc.
  const ANCHOR_CHUNKS: Record<string, string> = {
    ashford: '0,0',
    millbrook: '0,50',
    thornfield: '0,100',
    ravensgate: '0,141',
    'pilgrims-rest': '0,175',
    grailsend: '0,233',
  };
  for (const [townId, chunkKey] of Object.entries(ANCHOR_CHUNKS)) {
    const town = TOWN_CONFIGS_BY_ID[townId];
    if (town) {
      TOWN_ANCHORS[chunkKey] = town;
    }
  }

  // Alias: kingdom-config uses "thornfield-ruins", town config uses "thornfield"
  if (TOWN_CONFIGS_BY_ID.thornfield) {
    TOWN_CONFIGS_BY_ID['thornfield-ruins'] = TOWN_CONFIGS_BY_ID.thornfield;
  }

  cacheReady = true;
  return true;
}

/**
 * Generate a concrete NPCBlueprint from an NPC pool definition using seeded RNG.
 * The seed ensures deterministic NPC generation for the same settlement + building.
 */
export function generateNPCFromPool(
  pool: NPCDefinition,
  seed: string,
): NPCBlueprint {
  const rng = mulberry32(cyrb128(seed));

  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const range = (min: number, max: number) => min + rng() * (max - min);

  const name = pick(pool.namePool);
  const vi = pool.visualIdentity;
  const fs = pool.faceSlots;

  const bodyBuild = vi
    ? {
        height: +range(
          vi.bodyBuild.heightRange[0],
          vi.bodyBuild.heightRange[1],
        ).toFixed(2),
        width: +range(
          vi.bodyBuild.widthRange[0],
          vi.bodyBuild.widthRange[1],
        ).toFixed(2),
      }
    : { height: 1.0, width: 1.0 };

  const face = fs
    ? {
        skinTone: Math.floor(
          range(fs.skinToneRange[0], fs.skinToneRange[1] + 1),
        ),
        eyeColor: pick(fs.eyeColors) as 'brown' | 'blue' | 'green' | 'gray',
        hairStyle: pick(fs.hairStyles) as 'bald' | 'short' | 'long' | 'hooded',
        hairColor: pick(fs.hairColors),
        facialHair: pick(fs.facialHairOptions) as
          | 'none'
          | 'stubble'
          | 'full_beard'
          | 'mustache',
      }
    : {
        skinTone: 1,
        eyeColor: 'brown' as const,
        hairStyle: 'short' as const,
        hairColor: '#4a3020',
        facialHair: 'none' as const,
      };

  const clothPalette = vi
    ? {
        primary: vi.clothPalette.variations
          ? pick([vi.clothPalette.primary, ...vi.clothPalette.variations])
          : vi.clothPalette.primary,
        secondary: vi.clothPalette.secondary,
      }
    : { primary: '#6b5a40' };

  const accessories: string[] = [];
  if (vi) {
    accessories.push(...vi.signatureAccessories);
    for (const opt of vi.optionalAccessories) {
      if (rng() < 0.4) accessories.push(opt);
    }
  }

  return {
    id: `${pool.id}-${seed}`,
    name,
    archetype: pool.archetype,
    fixed: false,
    bodyBuild,
    face,
    accessories,
    clothPalette,
    behavior: pool.behavior ?? {
      idleStyle: 'idle',
      interactionVerb: 'TALK',
      walkNodes: false,
    },
    dialogue: {
      greeting: pool.greetingPool.map((g) => g.text),
      idle: pool.idlePool?.map((g) => g.text),
    },
  };
}

/**
 * Mapping from building archetype to NPC archetype that should staff it.
 */
const BUILDING_TO_NPC_ARCHETYPE: Record<string, string> = {
  tavern: 'innkeeper',
  smithy: 'blacksmith',
  market_stall: 'merchant',
  chapel: 'priest',
  temple: 'priest',
  guard_post: 'guard',
  barracks: 'guard',
  stable: 'stablehand',
  herb_garden: 'herbalist',
  manor: 'merchant',
};

/** Look up a town config by chunk coordinates. Returns undefined for non-town chunks. */
export function getTownConfig(cx: number, cz: number): TownConfig | undefined {
  if (!ensureCache()) return undefined;
  return TOWN_ANCHORS[`${cx},${cz}`];
}

/** Look up a town config by settlement/town ID. Returns undefined if not found. */
export function getTownConfigById(id: string): TownConfig | undefined {
  if (!ensureCache()) return undefined;
  return TOWN_CONFIGS_BY_ID[id];
}

/** Get all authored town configs (for spawn point lookup, etc.). */
export function getAllTownConfigs(): TownConfig[] {
  if (!ensureCache()) return [];
  return Object.values(TOWN_CONFIGS_BY_ID);
}

/**
 * Look up a town config by settlement ID (from the kingdom map).
 * If a hand-authored config exists, returns it.
 * If not, generates a procedural config based on the settlement type and features.
 */
export function getTownConfigBySettlement(settlement: Settlement): TownConfig {
  ensureCache();
  const authored = TOWN_CONFIGS_BY_ID[settlement.id];
  if (authored) return authored;
  return generateProceduralTownConfig(settlement);
}

/**
 * Building templates for procedural town generation, keyed by settlement type.
 * Each entry lists the archetype ids and labels to place.
 */
const PROCEDURAL_BUILDINGS: Record<
  SettlementType,
  { archetype: string; label: string }[]
> = {
  hamlet: [
    { archetype: 'cottage', label: 'Cottage' },
    { archetype: 'cottage', label: 'Cottage' },
  ],
  village: [
    { archetype: 'tavern', label: 'Tavern' },
    { archetype: 'cottage', label: 'Cottage' },
    { archetype: 'cottage', label: 'Cottage' },
    { archetype: 'market_stall', label: 'Market Stall' },
  ],
  town: [
    { archetype: 'tavern', label: 'Tavern' },
    { archetype: 'smithy', label: 'Smithy' },
    { archetype: 'market_stall', label: 'Market Stall' },
    { archetype: 'cottage', label: 'Cottage' },
    { archetype: 'cottage', label: 'Cottage' },
    { archetype: 'house_large', label: 'House' },
    { archetype: 'chapel', label: 'Chapel' },
  ],
  city: [
    { archetype: 'manor', label: 'Manor' },
    { archetype: 'tavern', label: 'Tavern' },
    { archetype: 'smithy', label: 'Smithy' },
    { archetype: 'market_stall', label: 'Market' },
    { archetype: 'market_stall', label: 'Market Stall' },
    { archetype: 'chapel', label: 'Chapel' },
    { archetype: 'barracks', label: 'Barracks' },
    { archetype: 'stable', label: 'Stable' },
    { archetype: 'house_large', label: 'House' },
    { archetype: 'house_large', label: 'House' },
    { archetype: 'cottage', label: 'Cottage' },
    { archetype: 'cottage', label: 'Cottage' },
  ],
  outpost: [
    { archetype: 'guard_post', label: 'Guard Post' },
    { archetype: 'cottage', label: 'Cottage' },
    { archetype: 'stable', label: 'Stable' },
  ],
  monastery: [
    { archetype: 'temple', label: 'Temple' },
    { archetype: 'dormitory', label: 'Dormitory' },
    { archetype: 'herb_garden', label: 'Herb Garden' },
    { archetype: 'library', label: 'Library' },
  ],
  ruin: [
    { archetype: 'watchtower', label: 'Ruined Tower' },
    { archetype: 'cottage', label: 'Ruined Cottage' },
  ],
  port: [
    { archetype: 'tavern', label: 'Dockside Tavern' },
    { archetype: 'market_stall', label: 'Fish Market' },
    { archetype: 'cottage', label: 'Cottage' },
    { archetype: 'cottage', label: 'Cottage' },
    { archetype: 'stable', label: 'Warehouse' },
  ],
};

/**
 * Boundary type based on settlement type.
 */
function boundaryForType(type: SettlementType): TownConfig['boundary'] {
  switch (type) {
    case 'city':
      return 'stone_wall';
    case 'town':
    case 'outpost':
      return 'palisade';
    case 'village':
    case 'monastery':
      return 'hedge';
    default:
      return 'none';
  }
}

/**
 * Generate a procedural TownConfig for settlements without a hand-authored config.
 * Places buildings in a simple ring layout based on the settlement type.
 */
export function generateProceduralTownConfig(
  settlement: Settlement,
): TownConfig {
  const templates =
    PROCEDURAL_BUILDINGS[settlement.type] ?? PROCEDURAL_BUILDINGS.hamlet;

  // Extra buildings from settlement features
  const featureBuildings: { archetype: string; label: string }[] = [];
  for (const feature of settlement.features) {
    if (feature === 'inn' || feature === 'tavern') {
      if (!templates.some((t) => t.archetype === 'tavern')) {
        featureBuildings.push({ archetype: 'tavern', label: 'Tavern' });
      }
    } else if (feature === 'blacksmith' || feature === 'smithy') {
      if (!templates.some((t) => t.archetype === 'smithy')) {
        featureBuildings.push({ archetype: 'smithy', label: 'Smithy' });
      }
    } else if (feature === 'market') {
      if (!templates.some((t) => t.archetype === 'market_stall')) {
        featureBuildings.push({ archetype: 'market_stall', label: 'Market' });
      }
    } else if (feature === 'temple' || feature === 'chapel') {
      if (
        !templates.some(
          (t) => t.archetype === 'chapel' || t.archetype === 'temple',
        )
      ) {
        featureBuildings.push({ archetype: 'chapel', label: 'Chapel' });
      }
    } else if (feature === 'stable') {
      if (!templates.some((t) => t.archetype === 'stable')) {
        featureBuildings.push({ archetype: 'stable', label: 'Stable' });
      }
    }
  }

  const allTemplates = [...templates, ...featureBuildings];

  // Layout buildings in a ring around center (0,0)
  const buildings: TownConfig['buildings'] = allTemplates.map((t, i) => {
    const angle = (i / allTemplates.length) * Math.PI * 2;
    const radius = 3 + allTemplates.length * 0.5;
    const bx = Math.round(Math.cos(angle) * radius);
    const bz = Math.round(Math.sin(angle) * radius);
    const rotation = Math.round(((angle + Math.PI) * 180) / Math.PI) % 360;

    return {
      archetype: t.archetype,
      label: `${t.label}${allTemplates.filter((tt, j) => j < i && tt.label === t.label).length > 0 ? ` ${i + 1}` : ''}`,
      position: [bx, bz] as [number, number],
      rotation,
    };
  });

  // Generate NPCs for buildings that have a mapping
  const npcs: TownNPCPlacement[] = [];
  const usedArchetypes = new Set<string>();

  for (const building of buildings) {
    const npcArchetype = BUILDING_TO_NPC_ARCHETYPE[building.archetype];
    if (!npcArchetype) continue;

    const pool = NPC_POOLS[npcArchetype];
    if (!pool) continue;

    // Generate a unique seed per building for determinism
    const npcSeed = `${settlement.id}:${building.label}`;
    const blueprint = generateNPCFromPool(pool, npcSeed);

    // Register the generated blueprint so resolveNPCBlueprint can find it
    NPC_BLUEPRINTS[blueprint.id] = blueprint;

    npcs.push({
      id: blueprint.id,
      archetype: npcArchetype,
      fixed: false,
      building: building.label,
      name: blueprint.name,
    });
    usedArchetypes.add(npcArchetype);
  }

  // Add a farmer NPC for hamlets/villages with cottages (if no other NPCs fill the role)
  if (
    (settlement.type === 'hamlet' || settlement.type === 'village') &&
    !usedArchetypes.has('farmer')
  ) {
    const farmerDef = NPC_POOLS.farmer;
    if (farmerDef) {
      const npcSeed = `${settlement.id}:farmer`;
      const blueprint = generateNPCFromPool(farmerDef, npcSeed);
      NPC_BLUEPRINTS[blueprint.id] = blueprint;
      npcs.push({
        id: blueprint.id,
        archetype: 'farmer',
        fixed: false,
        name: blueprint.name,
        position: [0, 0],
      });
    }
  }

  return {
    id: settlement.id,
    name: settlement.name,
    layout: 'organic',
    boundary: boundaryForType(settlement.type),
    approach: 'open',
    center: [0, 0],
    buildings,
    npcs,
  };
}

/** Resolve a building archetype id to its full config, applying placement overrides. */
export function resolveBuildingArchetype(
  archetypeId: string,
  overrides?: Record<string, unknown>,
): BuildingArchetype | undefined {
  ensureCache();
  const base =
    BUILDING_ARCHETYPES[archetypeId] ?? getBuildingFromStore(archetypeId);
  if (!base) return undefined;
  if (!overrides) return base;
  return { ...base, ...overrides } as BuildingArchetype;
}

/** Resolve an NPC id to its full blueprint. */
export function resolveNPCBlueprint(npcId: string): NPCBlueprint | undefined {
  ensureCache();
  // Check local cache first (includes procedurally generated NPCs)
  const local = NPC_BLUEPRINTS[npcId];
  if (local) return local;
  // Fall back to content store
  return getNamedNpc(npcId);
}

/** Get an NPC pool definition by archetype name. */
export function getNPCPool(archetype: string): NPCDefinition | undefined {
  ensureCache();
  return NPC_POOLS[archetype] ?? getNpcPoolFromStore(archetype);
}
