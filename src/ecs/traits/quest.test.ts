import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWorld } from 'koota';
import { QuestLog, IsQuestGiver } from './quest';

describe('Quest Traits', () => {
  let world: ReturnType<typeof createWorld>;

  beforeEach(() => {
    world = createWorld();
  });

  afterEach(() => {
    world.destroy();
  });

  describe('QuestLog', () => {
    it('starts with empty quest log', () => {
      const entity = world.spawn(QuestLog);
      const log = entity.get(QuestLog);
      expect(log?.activeQuests).toEqual([]);
      expect(log?.completedQuests).toEqual([]);
      expect(log?.mainQuestChapter).toBe(0);
    });

    it('each entity gets its own quest log instance (callback trait)', () => {
      const e1 = world.spawn(QuestLog);
      const e2 = world.spawn(QuestLog);

      e1.set(QuestLog, {
        activeQuests: [{ questId: 'q1', currentStep: 0 }],
        completedQuests: [],
        mainQuestChapter: 1,
      });

      // e2 should still have empty log
      expect(e2.get(QuestLog)?.activeQuests).toEqual([]);
      expect(e1.get(QuestLog)?.activeQuests).toHaveLength(1);
    });

    it('tracks quest branches', () => {
      const entity = world.spawn(QuestLog);
      entity.set(QuestLog, {
        activeQuests: [{ questId: 'meso-poisoned-well', currentStep: 1, branch: 'A' }],
        completedQuests: ['micro-lost-merchant'],
        mainQuestChapter: 1,
      });
      const log = entity.get(QuestLog);
      expect(log?.activeQuests[0].branch).toBe('A');
      expect(log?.completedQuests).toContain('micro-lost-merchant');
    });
  });

  describe('IsQuestGiver', () => {
    it('defaults to empty questId', () => {
      const entity = world.spawn(IsQuestGiver);
      expect(entity.get(IsQuestGiver)?.questId).toBe('');
    });

    it('stores a quest reference', () => {
      const entity = world.spawn(IsQuestGiver({ questId: 'meso-poisoned-well' }));
      expect(entity.get(IsQuestGiver)?.questId).toBe('meso-poisoned-well');
    });
  });
});
