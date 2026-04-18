/**
 * NPC Pool Integration Tests
 *
 * Loads all 21 real NPC archetype pool files from content/npcs/pools/,
 * validates them against NPCDefinitionSchema, and runs each through
 * generateNPCFromArchetype() to ensure the full pipeline works with
 * real content — not just mocks.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { NPCDefinition } from '@/schemas/npc.schema';
import { NPCDefinitionSchema } from '@/schemas/npc.schema';
import { NPCBlueprintSchema } from '@/schemas/npc-blueprint.schema';
import { buildNPCRenderData, generateNPCFromArchetype } from './npc-factory';

const POOLS_DIR = path.resolve(__dirname, '../../content/npcs/pools');

function loadPoolFiles(): Array<{ filename: string; data: NPCDefinition }> {
  const files = fs.readdirSync(POOLS_DIR).filter((f) => f.endsWith('.json'));
  return files.map((filename) => {
    const raw = fs.readFileSync(path.join(POOLS_DIR, filename), 'utf-8');
    const data = NPCDefinitionSchema.parse(JSON.parse(raw));
    return { filename, data };
  });
}

describe('NPC pool files: schema validation', () => {
  const pools = loadPoolFiles();

  it('finds all 21 archetype pool files', () => {
    expect(pools.length).toBe(21);
  });

  it('every pool file passes NPCDefinitionSchema', () => {
    // If any file failed to parse, loadPoolFiles() would throw.
    // This test documents the expectation explicitly.
    for (const { filename, data } of pools) {
      expect(data.id, `${filename} missing id`).toBeTruthy();
      expect(data.archetype, `${filename} missing archetype`).toBeTruthy();
      expect(
        data.namePool.length,
        `${filename} needs >=3 names`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        data.greetingPool.length,
        `${filename} needs >=2 greetings`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('every pool has visualIdentity (rich caricature format)', () => {
    for (const { filename, data } of pools) {
      expect(
        data.visualIdentity,
        `${filename} missing visualIdentity — not migrated to caricature format`,
      ).toBeDefined();
      expect(
        data.visualIdentity!.signatureAccessories.length,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it('every pool has faceSlots', () => {
    for (const { filename, data } of pools) {
      expect(data.faceSlots, `${filename} missing faceSlots`).toBeDefined();
      expect(data.faceSlots!.eyeColors.length).toBeGreaterThanOrEqual(1);
      expect(data.faceSlots!.hairStyles.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every pool has behavior', () => {
    for (const { filename, data } of pools) {
      expect(data.behavior, `${filename} missing behavior`).toBeDefined();
    }
  });

  it('every pool has idlePool', () => {
    for (const { filename, data } of pools) {
      expect(data.idlePool, `${filename} missing idlePool`).toBeDefined();
      expect(data.idlePool!.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('all archetype IDs are unique', () => {
    const archetypes = pools.map((p) => p.data.archetype);
    expect(new Set(archetypes).size).toBe(archetypes.length);
  });
});

describe('NPC pool files: procedural generation pipeline', () => {
  const pools = loadPoolFiles();

  for (const { filename, data: archetype } of pools) {
    describe(`${archetype.archetype} (${filename})`, () => {
      it('generates valid NPCs from multiple seeds', () => {
        for (let seed = 0; seed < 10; seed++) {
          const npc = generateNPCFromArchetype(archetype, seed);

          // Verify GeneratedNPC fields
          expect(npc.id).toContain(archetype.archetype);
          expect(archetype.namePool).toContain(npc.name);
          expect(npc.archetype).toBe(archetype.archetype);
          expect(npc.greeting).toBeTruthy();
        }
      });

      it('always includes signature accessories', () => {
        const sig = archetype.visualIdentity!.signatureAccessories;
        for (let seed = 0; seed < 10; seed++) {
          const npc = generateNPCFromArchetype(archetype, seed);
          for (const acc of sig) {
            expect(
              npc.blueprint.accessories,
              `seed=${seed}: missing signature accessory "${acc}"`,
            ).toContain(acc);
          }
        }
      });

      it('body build stays within archetype ranges', () => {
        const vis = archetype.visualIdentity!;
        const [minH, maxH] = vis.bodyBuild.heightRange;
        const [minW, maxW] = vis.bodyBuild.widthRange;

        for (let seed = 0; seed < 20; seed++) {
          const npc = generateNPCFromArchetype(archetype, seed);
          const { height, width } = npc.blueprint.bodyBuild;
          expect(height).toBeGreaterThanOrEqual(minH);
          expect(height).toBeLessThanOrEqual(maxH);
          expect(width).toBeGreaterThanOrEqual(minW);
          expect(width).toBeLessThanOrEqual(maxW);
        }
      });

      it('face values stay within slot constraints', () => {
        const slots = archetype.faceSlots!;
        for (let seed = 0; seed < 10; seed++) {
          const npc = generateNPCFromArchetype(archetype, seed);
          const face = npc.blueprint.face;
          expect(face.skinTone).toBeGreaterThanOrEqual(slots.skinToneRange[0]);
          expect(face.skinTone).toBeLessThanOrEqual(slots.skinToneRange[1]);
          expect(slots.eyeColors).toContain(face.eyeColor);
          expect(slots.hairStyles).toContain(face.hairStyle);
          expect(slots.hairColors).toContain(face.hairColor);
          expect(slots.facialHairOptions).toContain(face.facialHair);
        }
      });

      it('blueprint passes NPCBlueprintSchema', () => {
        const npc = generateNPCFromArchetype(archetype, 42);
        expect(() => NPCBlueprintSchema.parse(npc.blueprint)).not.toThrow();
      });

      it('blueprint feeds into render pipeline', () => {
        const npc = generateNPCFromArchetype(archetype, 42);
        const renderData = buildNPCRenderData(npc.blueprint);
        expect(renderData.torsoHeight).toBeGreaterThan(0);
        expect(renderData.faceTexture).toBeDefined();
        expect(renderData.clothPrimary).toBeTruthy();
      });
    });
  }
});
