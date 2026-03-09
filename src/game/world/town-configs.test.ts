import { describe, expect, it } from 'vitest';
import { generateBuildingGeometry } from '../factories/building-factory';
import {
  getTownConfig,
  resolveBuildingArchetype,
  resolveNPCBlueprint,
} from './town-configs';
import { layoutTown } from './town-layout';

describe('town-configs', () => {
  it('returns Ashford config for chunk (0,0)', () => {
    const config = getTownConfig(0, 0);
    expect(config).toBeDefined();
    expect(config!.id).toBe('ashford');
    expect(config!.name).toBe('Ashford');
    expect(config!.buildings).toHaveLength(6);
    expect(config!.npcs).toHaveLength(5);
  });

  it('returns undefined for non-town chunks', () => {
    expect(getTownConfig(1, 0)).toBeUndefined();
    expect(getTownConfig(0, 1)).toBeUndefined();
    expect(getTownConfig(-1, -1)).toBeUndefined();
  });

  it('resolves all building archetypes referenced by Ashford', () => {
    const config = getTownConfig(0, 0)!;
    for (const placement of config.buildings) {
      const archetype = resolveBuildingArchetype(
        placement.archetype,
        placement.overrides as Record<string, unknown> | undefined,
      );
      expect(archetype).toBeDefined();
      expect(archetype!.id).toBe(placement.archetype);
      expect(archetype!.stories).toBeGreaterThanOrEqual(1);
      expect(archetype!.footprint.width).toBeGreaterThanOrEqual(1);
    }
  });

  it('applies overrides when resolving archetypes', () => {
    const base = resolveBuildingArchetype('tavern');
    const overridden = resolveBuildingArchetype('tavern', { stories: 2 });
    expect(base).toBeDefined();
    expect(overridden).toBeDefined();
    expect(overridden!.stories).toBe(2);
  });

  it('resolves all NPC blueprints referenced by Ashford', () => {
    const config = getTownConfig(0, 0)!;
    for (const npc of config.npcs) {
      const blueprint = resolveNPCBlueprint(npc.id);
      expect(blueprint).toBeDefined();
      expect(blueprint!.id).toBe(npc.id);
      expect(blueprint!.face).toBeDefined();
      expect(blueprint!.bodyBuild).toBeDefined();
    }
  });

  it('returns undefined for unknown archetype/blueprint ids', () => {
    expect(resolveBuildingArchetype('nonexistent')).toBeUndefined();
    expect(resolveNPCBlueprint('nonexistent')).toBeUndefined();
  });
});

describe('integration: Ashford config → layout → geometry', () => {
  it('layouts all Ashford buildings with valid world positions', () => {
    const config = getTownConfig(0, 0)!;
    const placed = layoutTown(config, 0, 0);

    expect(placed).toHaveLength(6);
    for (const p of placed) {
      expect(typeof p.worldX).toBe('number');
      expect(typeof p.worldZ).toBe('number');
      expect(Number.isFinite(p.worldX)).toBe(true);
      expect(Number.isFinite(p.worldZ)).toBe(true);
    }
  });

  it('generates valid geometry for every Ashford building archetype', () => {
    const config = getTownConfig(0, 0)!;
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
});
