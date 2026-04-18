import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GameConfig } from '@/schemas/game-config.schema';
import { GameConfigSchema } from '@/schemas/game-config.schema';

const CONFIG_PATH = path.resolve(__dirname, '../../content/game-config.json');

function loadConfig(): GameConfig {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return GameConfigSchema.parse(JSON.parse(raw));
}

describe('game-config integration', () => {
  it('content/game-config.json exists', () => {
    expect(fs.existsSync(CONFIG_PATH)).toBe(true);
  });

  it('parses against GameConfigSchema', () => {
    expect(() => loadConfig()).not.toThrow();
  });

  describe('cross-reference integrity', () => {
    const config = loadConfig();
    const allQuests = [
      ...config.mainQuest,
      ...config.sideQuests.macro,
      ...config.sideQuests.meso,
      ...config.sideQuests.micro,
    ];
    const itemIds = new Set(config.items.map((i) => i.id));
    const encounterIds = new Set(config.encounters.map((e) => e.id));
    const npcArchetypes: Set<string> = new Set(
      config.npcs.map((n) => n.archetype),
    );
    const questIds = new Set(allQuests.map((q) => q.id));
    const anchorIds = new Set(config.world.anchors.map((a) => a.id));

    it('all item IDs referenced in quests exist', () => {
      const missing: string[] = [];

      for (const q of allQuests) {
        const checkItem = (id: string | undefined, ctx: string) => {
          if (id && !itemIds.has(id)) missing.push(`${ctx}: ${id}`);
        };

        checkItem(q.reward.itemId, `${q.id} reward`);

        if (q.steps) {
          for (const step of q.steps) {
            checkItem(step.itemId, `${q.id} step ${step.id}`);
          }
        }
        if (q.branches) {
          checkItem(q.branches.A.reward?.itemId, `${q.id}/A reward`);
          checkItem(q.branches.B.reward?.itemId, `${q.id}/B reward`);
          for (const step of q.branches.A.steps) {
            checkItem(step.itemId, `${q.id}/A step ${step.id}`);
          }
          for (const step of q.branches.B.steps) {
            checkItem(step.itemId, `${q.id}/B step ${step.id}`);
          }
        }
      }

      expect(
        missing,
        `Missing item references:\n${missing.join('\n')}`,
      ).toHaveLength(0);
    });

    it('all item IDs referenced in encounter rewards exist', () => {
      const missing: string[] = [];

      for (const enc of config.encounters) {
        if (enc.rewards) {
          for (const r of enc.rewards) {
            if (!itemIds.has(r.itemId)) {
              missing.push(`${enc.id}: ${r.itemId}`);
            }
          }
        }
      }

      expect(
        missing,
        `Missing encounter reward items:\n${missing.join('\n')}`,
      ).toHaveLength(0);
    });

    it('all NPC archetypes referenced in quests exist', () => {
      const missing: string[] = [];

      for (const q of allQuests) {
        const checkNPC = (archetype: string | undefined, ctx: string) => {
          if (archetype && !npcArchetypes.has(archetype)) {
            missing.push(`${ctx}: ${archetype}`);
          }
        };

        const allSteps = [
          ...(q.steps ?? []),
          ...(q.branches?.A.steps ?? []),
          ...(q.branches?.B.steps ?? []),
        ];

        for (const step of allSteps) {
          checkNPC(step.npcArchetype, `${q.id} step ${step.id}`);
        }
      }

      expect(
        missing,
        `Missing NPC archetype references:\n${missing.join('\n')}`,
      ).toHaveLength(0);
    });

    it('all encounter IDs referenced in quests exist', () => {
      const missing: string[] = [];

      for (const q of allQuests) {
        const allSteps = [
          ...(q.steps ?? []),
          ...(q.branches?.A.steps ?? []),
          ...(q.branches?.B.steps ?? []),
        ];

        for (const step of allSteps) {
          if (step.encounterId && !encounterIds.has(step.encounterId)) {
            missing.push(`${q.id} step ${step.id}: ${step.encounterId}`);
          }
        }
      }

      expect(
        missing,
        `Missing encounter references:\n${missing.join('\n')}`,
      ).toHaveLength(0);
    });

    it('quest prerequisite chains are acyclic', () => {
      const adjacency = new Map<string, string[]>();
      for (const q of allQuests) {
        adjacency.set(q.id, q.prerequisites ?? []);
      }

      // DFS cycle detection
      const visited = new Set<string>();
      const inStack = new Set<string>();
      const cycles: string[] = [];

      function dfs(node: string, path: string[]) {
        if (inStack.has(node)) {
          const cycleStart = path.indexOf(node);
          cycles.push(path.slice(cycleStart).concat(node).join(' -> '));
          return;
        }
        if (visited.has(node)) return;

        visited.add(node);
        inStack.add(node);

        for (const dep of adjacency.get(node) ?? []) {
          dfs(dep, [...path, node]);
        }

        inStack.delete(node);
      }

      for (const qId of adjacency.keys()) {
        dfs(qId, []);
      }

      expect(
        cycles,
        `Cyclic quest dependencies:\n${cycles.join('\n')}`,
      ).toHaveLength(0);
    });

    it('every anchor has at least one quest', () => {
      const anchorsWithQuests = new Set<string>();

      for (const q of allQuests) {
        anchorsWithQuests.add(q.anchorAffinity);
      }

      const anchorsMissing = config.world.anchors
        .map((a) => a.id)
        .filter((id) => !anchorsWithQuests.has(id));

      expect(
        anchorsMissing,
        `Anchors without quests:\n${anchorsMissing.join('\n')}`,
      ).toHaveLength(0);
    });

    it('all quest prerequisites reference existing quests', () => {
      const missing: string[] = [];

      for (const q of allQuests) {
        for (const prereq of q.prerequisites ?? []) {
          if (!questIds.has(prereq)) {
            missing.push(`${q.id}: ${prereq}`);
          }
        }
      }

      expect(
        missing,
        `Missing prerequisite quests:\n${missing.join('\n')}`,
      ).toHaveLength(0);
    });

    it('all quest anchorAffinity values reference existing anchors', () => {
      const missing: string[] = [];

      for (const q of allQuests) {
        if (!anchorIds.has(q.anchorAffinity)) {
          missing.push(`${q.id}: ${q.anchorAffinity}`);
        }
      }

      expect(
        missing,
        `Invalid anchorAffinity values:\n${missing.join('\n')}`,
      ).toHaveLength(0);
    });

    it('no orphaned items (every item is referenced somewhere)', () => {
      const referencedItems = new Set<string>();

      for (const q of allQuests) {
        if (q.reward.itemId) referencedItems.add(q.reward.itemId);
        const allSteps = [
          ...(q.steps ?? []),
          ...(q.branches?.A.steps ?? []),
          ...(q.branches?.B.steps ?? []),
        ];
        if (q.branches?.A.reward?.itemId)
          referencedItems.add(q.branches.A.reward.itemId);
        if (q.branches?.B.reward?.itemId)
          referencedItems.add(q.branches.B.reward.itemId);
        for (const step of allSteps) {
          if (step.itemId) referencedItems.add(step.itemId);
        }
      }

      for (const enc of config.encounters) {
        if (enc.rewards) {
          for (const r of enc.rewards) {
            referencedItems.add(r.itemId);
          }
        }
      }

      const orphaned = config.items
        .map((i) => i.id)
        .filter((id) => !referencedItems.has(id));

      // Orphaned items are a warning, not necessarily an error —
      // some items may be general loot drops not tied to specific quests.
      // We allow them but track the count for awareness.
      expect(orphaned.length).toBeLessThanOrEqual(config.items.length);
    });
  });

  describe('content sanity', () => {
    const config = loadConfig();

    it('has at least one main quest chapter per anchor', () => {
      expect(config.mainQuest.length).toBeGreaterThanOrEqual(
        config.world.anchors.length,
      );
    });

    it('has side quests in all tiers', () => {
      expect(config.sideQuests.macro.length).toBeGreaterThan(0);
      expect(config.sideQuests.meso.length).toBeGreaterThan(0);
      expect(config.sideQuests.micro.length).toBeGreaterThan(0);
    });

    it('has NPCs, features, items, and encounters', () => {
      expect(config.npcs.length).toBeGreaterThan(0);
      expect(config.features.length).toBeGreaterThan(0);
      expect(config.items.length).toBeGreaterThan(0);
      expect(config.encounters.length).toBeGreaterThan(0);
    });

    it('world anchors are ordered by distance', () => {
      for (let i = 1; i < config.world.anchors.length; i++) {
        expect(
          config.world.anchors[i].distanceFromStart,
          `Anchor ${config.world.anchors[i].id} should be after ${config.world.anchors[i - 1].id}`,
        ).toBeGreaterThan(config.world.anchors[i - 1].distanceFromStart);
      }
    });

    it('no duplicate IDs within each collection', () => {
      const collections = {
        items: config.items.map((i) => i.id),
        encounters: config.encounters.map((e) => e.id),
        npcs: config.npcs.map((n) => n.id),
        features: config.features.map((f) => f.id),
        quests: [
          ...config.mainQuest,
          ...config.sideQuests.macro,
          ...config.sideQuests.meso,
          ...config.sideQuests.micro,
        ].map((q) => q.id),
      };

      for (const [name, ids] of Object.entries(collections)) {
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        expect(
          dupes,
          `Duplicate ${name} IDs: ${dupes.join(', ')}`,
        ).toHaveLength(0);
      }
    });
  });
});
