import { describe, expect, it } from 'vitest';
import { generateBuildingGeometry } from '../factories/building-factory';
import {
  getTownConfig,
  resolveBuildingArchetype,
  resolveNPCBlueprint,
} from './town-configs';
import { layoutTown } from './town-layout';

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

describe('integration: all towns config → layout → geometry', () => {
  for (const town of TOWN_CHUNKS) {
    it(`layouts all ${town.name} buildings with valid world positions`, () => {
      const config = getTownConfig(town.cx, town.cz)!;
      const placed = layoutTown(config, town.cx * 120, town.cz * 120);

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
