import { beforeAll, describe, expect, it } from 'vitest';
import { initContentStore } from '../../db/content-queries';
import type { Settlement } from '../../schemas/kingdom.schema';
import { generateBuildingGeometry } from '../factories/building-factory';
import { chunkToWorldOrigin } from '../utils/worldCoords';
import {
  generateProceduralTownConfig,
  getTownConfig,
  getTownConfigBySettlement,
  resolveBuildingArchetype,
  resolveNPCBlueprint,
} from './town-configs';
import { layoutTown } from './town-layout';

// Load all content JSON using Vite/Vitest glob imports
const buildingModules = import.meta.glob<{ default: { id: string } }>(
  '../../../content/buildings/*.json',
  { eager: true },
);
const npcModules = import.meta.glob<{ default: { id: string } }>(
  '../../../content/npcs/*.json',
  { eager: true },
);
const npcPoolModules = import.meta.glob<{ default: { archetype: string } }>(
  '../../../content/npcs/pools/*.json',
  { eager: true },
);
const townModules = import.meta.glob<{ default: { id: string } }>(
  '../../../content/towns/*.json',
  { eager: true },
);

beforeAll(() => {
  const buildings = Object.values(buildingModules).map((m) => ({
    id: m.default.id,
    data: JSON.stringify(m.default),
  }));
  const npcsNamed = Object.values(npcModules).map((m) => ({
    id: m.default.id,
    data: JSON.stringify(m.default),
  }));
  const npcPools = Object.values(npcPoolModules).map((m) => ({
    archetype: m.default.archetype,
    data: JSON.stringify(m.default),
  }));
  const towns = Object.values(townModules).map((m) => ({
    id: m.default.id,
    data: JSON.stringify(m.default),
  }));

  initContentStore({
    monsters: [],
    items: [],
    encounterTables: [],
    lootTables: [],
    npcsNamed,
    npcPools,
    buildings,
    towns,
    features: [],
    quests: [],
    dungeons: [],
    encounters: [],
    roadSpine: null,
    pacingConfig: null,
  });
});

/**
 * Town anchor chunk coordinates (derived from road-spine distances / CHUNK_SIZE=120):
 *   Ashford         → (0,   0)
 *   Millbrook       → (0,  50)
 *   Thornfield      → (0, 100)
 *   Ravensgate      → (0, 141)
 *   Pilgrim's Rest  → (0, 175)
 *   Grailsend       → (0, 233)
 */
const TOWN_CHUNKS = [
  { cx: 0, cz: 0, id: 'ashford', name: 'Ashford', buildings: 6, npcs: 5 },
  { cx: 0, cz: 50, id: 'millbrook', name: 'Millbrook', buildings: 9, npcs: 6 },
  {
    cx: 0,
    cz: 100,
    id: 'thornfield',
    name: 'Thornfield Ruins',
    buildings: 3,
    npcs: 3,
  },
  {
    cx: 0,
    cz: 141,
    id: 'ravensgate',
    name: 'Ravensgate',
    buildings: 14,
    npcs: 8,
  },
  {
    cx: 0,
    cz: 175,
    id: 'pilgrims-rest',
    name: "Pilgrim's Rest",
    buildings: 5,
    npcs: 3,
  },
  {
    cx: 0,
    cz: 233,
    id: 'grailsend',
    name: 'Grailsend',
    buildings: 3,
    npcs: 4,
  },
] as const;

describe('town-configs', () => {
  for (const town of TOWN_CHUNKS) {
    it(`returns ${town.name} config for chunk (${town.cx},${town.cz})`, () => {
      const config = getTownConfig(town.cx, town.cz);
      expect(config).toBeDefined();
      expect(config!.id).toBe(town.id);
      expect(config!.name).toBe(town.name);
      expect(config!.buildings).toHaveLength(town.buildings);
      expect(config!.npcs).toHaveLength(town.npcs);
    });
  }

  it('returns undefined for non-town chunks', () => {
    expect(getTownConfig(1, 0)).toBeUndefined();
    expect(getTownConfig(0, 1)).toBeUndefined();
    expect(getTownConfig(-1, -1)).toBeUndefined();
    expect(getTownConfig(0, 99)).toBeUndefined();
  });

  for (const town of TOWN_CHUNKS) {
    it(`resolves all building archetypes referenced by ${town.name}`, () => {
      const config = getTownConfig(town.cx, town.cz)!;
      for (const placement of config.buildings) {
        const archetype = resolveBuildingArchetype(
          placement.archetype,
          placement.overrides as Record<string, unknown> | undefined,
        );
        expect(
          archetype,
          `missing archetype: ${placement.archetype}`,
        ).toBeDefined();
        expect(archetype!.id).toBe(placement.archetype);
        expect(archetype!.stories).toBeGreaterThanOrEqual(1);
        expect(archetype!.footprint.width).toBeGreaterThanOrEqual(1);
      }
    });
  }

  it('applies overrides when resolving archetypes', () => {
    const base = resolveBuildingArchetype('tavern');
    const overridden = resolveBuildingArchetype('tavern', { stories: 2 });
    expect(base).toBeDefined();
    expect(overridden).toBeDefined();
    expect(overridden!.stories).toBe(2);
  });

  for (const town of TOWN_CHUNKS) {
    it(`resolves all NPC blueprints referenced by ${town.name}`, () => {
      const config = getTownConfig(town.cx, town.cz)!;
      for (const npc of config.npcs) {
        const blueprint = resolveNPCBlueprint(npc.id);
        expect(blueprint, `missing NPC: ${npc.id}`).toBeDefined();
        expect(blueprint!.id).toBe(npc.id);
        expect(blueprint!.face).toBeDefined();
        expect(blueprint!.bodyBuild).toBeDefined();
      }
    });
  }

  it('returns undefined for unknown archetype/blueprint ids', () => {
    expect(resolveBuildingArchetype('nonexistent')).toBeUndefined();
    expect(resolveNPCBlueprint('nonexistent')).toBeUndefined();
  });
});

// Helper to create a minimal Settlement
function makeSettlement(
  overrides: Partial<Settlement> & { id: string; name: string },
): Settlement {
  return {
    type: 'village',
    position: [10, 10],
    connectedTo: [],
    features: [],
    population: 'small',
    ...overrides,
  };
}

describe('getTownConfigBySettlement', () => {
  it('returns authored config for known settlements', () => {
    const settlement = makeSettlement({ id: 'ashford', name: 'Ashford' });
    const config = getTownConfigBySettlement(settlement);
    expect(config.id).toBe('ashford');
    expect(config.name).toBe('Ashford');
    expect(config.buildings.length).toBeGreaterThan(0);
    expect(config.npcs.length).toBeGreaterThan(0);
  });

  it('returns authored config for all six anchor towns', () => {
    const anchors = [
      'ashford',
      'millbrook',
      'thornfield',
      'ravensgate',
      'pilgrims-rest',
      'grailsend',
    ];
    for (const id of anchors) {
      const settlement = makeSettlement({ id, name: id });
      const config = getTownConfigBySettlement(settlement);
      expect(config.id).toBe(id);
    }
  });

  it('resolves thornfield-ruins alias to thornfield town config', () => {
    const settlement = makeSettlement({
      id: 'thornfield-ruins',
      name: 'Thornfield Ruins',
      type: 'ruin',
    });
    const config = getTownConfigBySettlement(settlement);
    expect(config.id).toBe('thornfield');
    expect(config.name).toBe('Thornfield Ruins');
    expect(config.buildings.length).toBe(3);
    expect(config.npcs.length).toBe(3);
  });

  it('generates procedural config for unknown settlements', () => {
    const settlement = makeSettlement({
      id: 'woodhaven',
      name: 'Woodhaven',
      type: 'village',
      features: ['inn', 'market'],
    });
    const config = getTownConfigBySettlement(settlement);
    expect(config.id).toBe('woodhaven');
    expect(config.name).toBe('Woodhaven');
    expect(config.buildings.length).toBeGreaterThan(0);
    expect(config.layout).toBe('organic');
  });
});

describe('generateProceduralTownConfig', () => {
  it('generates buildings based on settlement type', () => {
    const hamlet = generateProceduralTownConfig(
      makeSettlement({ id: 'h1', name: 'Hamlet', type: 'hamlet' }),
    );
    const city = generateProceduralTownConfig(
      makeSettlement({ id: 'c1', name: 'City', type: 'city' }),
    );
    expect(hamlet.buildings.length).toBeLessThan(city.buildings.length);
  });

  it('assigns boundary based on settlement type', () => {
    const city = generateProceduralTownConfig(
      makeSettlement({ id: 'c1', name: 'City', type: 'city' }),
    );
    const hamlet = generateProceduralTownConfig(
      makeSettlement({ id: 'h1', name: 'Hamlet', type: 'hamlet' }),
    );
    expect(city.boundary).toBe('stone_wall');
    expect(hamlet.boundary).toBe('none');
  });

  it('adds extra buildings from settlement features', () => {
    const base = generateProceduralTownConfig(
      makeSettlement({
        id: 'v1',
        name: 'Village',
        type: 'hamlet',
        features: [],
      }),
    );
    const withFeatures = generateProceduralTownConfig(
      makeSettlement({
        id: 'v2',
        name: 'Village+',
        type: 'hamlet',
        features: ['inn', 'blacksmith', 'stable'],
      }),
    );
    expect(withFeatures.buildings.length).toBeGreaterThan(
      base.buildings.length,
    );
  });

  it('all generated building archetypes are resolvable', () => {
    const types = [
      'hamlet',
      'village',
      'town',
      'city',
      'outpost',
      'monastery',
      'ruin',
      'port',
    ] as const;
    for (const type of types) {
      const config = generateProceduralTownConfig(
        makeSettlement({ id: `t-${type}`, name: type, type }),
      );
      for (const building of config.buildings) {
        const archetype = resolveBuildingArchetype(building.archetype);
        expect(
          archetype,
          `archetype '${building.archetype}' for ${type} should resolve`,
        ).toBeDefined();
      }
    }
  });

  it('procedural configs layout correctly', () => {
    const config = generateProceduralTownConfig(
      makeSettlement({
        id: 'layout-test',
        name: 'Layout Test',
        type: 'town',
      }),
    );
    const placed = layoutTown(config, 0, 0);
    expect(placed).toHaveLength(config.buildings.length);
    for (const p of placed) {
      expect(Number.isFinite(p.worldX)).toBe(true);
      expect(Number.isFinite(p.worldZ)).toBe(true);
    }
  });
});

describe('integration: all towns config → layout → geometry', () => {
  for (const town of TOWN_CHUNKS) {
    it(`layouts all ${town.name} buildings with valid world positions`, () => {
      const config = getTownConfig(town.cx, town.cz)!;
      const origin = chunkToWorldOrigin(town.cx, town.cz);
      const placed = layoutTown(config, origin.x, origin.z);

      expect(placed).toHaveLength(town.buildings);
      for (const p of placed) {
        expect(typeof p.worldX).toBe('number');
        expect(typeof p.worldZ).toBe('number');
        expect(Number.isFinite(p.worldX)).toBe(true);
        expect(Number.isFinite(p.worldZ)).toBe(true);
      }
    });

    it(`generates valid geometry for every ${town.name} building archetype`, () => {
      const config = getTownConfig(town.cx, town.cz)!;
      for (const placement of config.buildings) {
        const archetype = resolveBuildingArchetype(
          placement.archetype,
          placement.overrides as Record<string, unknown> | undefined,
        )!;
        const geo = generateBuildingGeometry(archetype);

        expect(geo.walls.length).toBeGreaterThan(0);
        expect(geo.floors.length).toBeGreaterThan(0);
        expect(geo.roofCenter).toBeDefined();
        expect(geo.roofSize).toBeDefined();
        expect(geo.collisionBoxes).toBeDefined();
        expect(geo.collisionBoxes.length).toBeGreaterThan(0);
      }
    });
  }
});
