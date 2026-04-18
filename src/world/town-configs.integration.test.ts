/**
 * Town Configs Integration Tests
 *
 * Loads all real town JSON files from content/towns/ and verifies that
 * every referenced NPC, building archetype, and anchor ID actually exists.
 * Unlike town-configs.test.ts (which hardcodes expected counts), these
 * tests dynamically validate the content.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { NPCBlueprintSchema } from '@/schemas/npc-blueprint.schema';
import type { TownConfig } from '@/schemas/town.schema';
import { TownConfigSchema } from '@/schemas/town.schema';
import { loadRoadSpine } from './road-spine';
import { resolveBuildingArchetype, resolveNPCBlueprint } from './town-configs';

const TOWNS_DIR = path.resolve(__dirname, '../../content/towns');

function loadTownFiles(): Array<{ filename: string; config: TownConfig }> {
  const files = fs.readdirSync(TOWNS_DIR).filter((f) => f.endsWith('.json'));
  return files.map((filename) => {
    const raw = fs.readFileSync(path.join(TOWNS_DIR, filename), 'utf-8');
    const config = TownConfigSchema.parse(JSON.parse(raw));
    return { filename, config };
  });
}

describe('town configs: real content validation', () => {
  const towns = loadTownFiles();
  const spine = loadRoadSpine();
  const anchorIds = new Set(spine.anchors.map((a) => a.id));

  it('loads all 6 town config files', () => {
    expect(towns.length).toBe(6);
  });

  it('all town IDs are unique', () => {
    const ids = towns.map((t) => t.config.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const { filename, config } of loadTownFiles()) {
    describe(`${config.name} (${filename})`, () => {
      it('has a valid anchor ID that exists in road spine', () => {
        expect(
          anchorIds.has(config.anchorId),
          `${config.name} references anchor "${config.anchorId}" which doesn't exist in road-spine.json`,
        ).toBe(true);
      });

      it('has at least one building', () => {
        expect(config.buildings.length).toBeGreaterThanOrEqual(1);
      });

      it('every building archetype resolves', () => {
        for (const building of config.buildings) {
          const archetype = resolveBuildingArchetype(building.archetype);
          expect(
            archetype,
            `${config.name}: building archetype "${building.archetype}" not registered in town-configs.ts`,
          ).toBeDefined();
        }
      });

      it('every NPC blueprint resolves and passes schema', () => {
        for (const npc of config.npcs) {
          const blueprint = resolveNPCBlueprint(npc.id);
          expect(
            blueprint,
            `${config.name}: NPC "${npc.id}" not registered in NPC_BLUEPRINTS`,
          ).toBeDefined();

          // Verify the resolved blueprint passes its schema
          expect(
            () => NPCBlueprintSchema.parse(blueprint),
            `${config.name}: NPC "${npc.id}" fails NPCBlueprintSchema`,
          ).not.toThrow();
        }
      });

      it('no duplicate NPC IDs within town', () => {
        const npcIds = config.npcs.map((n) => n.id);
        const dupes = npcIds.filter((id, i) => npcIds.indexOf(id) !== i);
        expect(dupes, `Duplicate NPCs in ${config.name}`).toHaveLength(0);
      });

      it('no duplicate building placements at same position', () => {
        const positions = config.buildings.map(
          (b) => `${b.position[0]},${b.position[1]}`,
        );
        const dupes = positions.filter((p, i) => positions.indexOf(p) !== i);
        expect(dupes, `Overlapping buildings in ${config.name}`).toHaveLength(
          0,
        );
      });
    });
  }
});
