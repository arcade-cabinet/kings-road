import { afterEach, describe, expect, it } from 'vitest';
import { getAllQuests, getQuestDefinition, useQuestStore } from './questStore';

describe('questStore', () => {
  afterEach(() => {
    useQuestStore.getState().resetQuests();
  });

  describe('quest registry', () => {
    it('loads all quest definitions', () => {
      const quests = getAllQuests();
      expect(quests.length).toBeGreaterThan(0);
      // Should have both main chapters and side quests
      const mainQuests = quests.filter((q) => q.id.startsWith('main-'));
      const sideQuests = quests.filter((q) => q.id.startsWith('side-'));
      expect(mainQuests.length).toBeGreaterThanOrEqual(6);
      expect(sideQuests.length).toBeGreaterThan(0);
    });

    it('looks up quest by id', () => {
      const quest = getQuestDefinition('main-chapter-00');
      expect(quest).toBeDefined();
      expect(quest?.title).toBe('The Call');
    });

    it('returns undefined for unknown quest id', () => {
      expect(getQuestDefinition('nonexistent-quest')).toBeUndefined();
    });
  });

  describe('activateQuest', () => {
    it('adds a quest to activeQuests', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      const { activeQuests } = useQuestStore.getState();
      expect(activeQuests).toHaveLength(1);
      expect(activeQuests[0].questId).toBe('main-chapter-00');
      expect(activeQuests[0].currentStep).toBe(0);
      expect(activeQuests[0].branch).toBeUndefined();
    });

    it('does not double-activate the same quest', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().activateQuest('main-chapter-00');
      expect(useQuestStore.getState().activeQuests).toHaveLength(1);
    });

    it('does not activate a completed quest', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().completeQuest('main-chapter-00');
      useQuestStore.getState().activateQuest('main-chapter-00');
      expect(useQuestStore.getState().activeQuests).toHaveLength(0);
    });

    it('marks the quest as triggered', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      expect(useQuestStore.getState().triggeredQuests).toContain(
        'main-chapter-00',
      );
    });

    it('activates with a branch', () => {
      useQuestStore.getState().activateQuest('main-chapter-00', 'A');
      const { activeQuests } = useQuestStore.getState();
      expect(activeQuests[0].branch).toBe('A');
    });
  });

  describe('advanceStep', () => {
    it('increments the step counter', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().advanceStep('main-chapter-00');
      expect(useQuestStore.getState().activeQuests[0].currentStep).toBe(1);
    });

    it('does not affect other quests', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().activateQuest('side-lost-pilgrim');
      useQuestStore.getState().advanceStep('main-chapter-00');
      const side = useQuestStore
        .getState()
        .activeQuests.find((q) => q.questId === 'side-lost-pilgrim');
      expect(side?.currentStep).toBe(0);
    });
  });

  describe('chooseBranch', () => {
    it('sets the branch and resets step to 0', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().advanceStep('main-chapter-00');
      useQuestStore.getState().chooseBranch('main-chapter-00', 'B');
      const quest = useQuestStore.getState().activeQuests[0];
      expect(quest.branch).toBe('B');
      expect(quest.currentStep).toBe(0);
    });
  });

  describe('completeQuest', () => {
    it('removes from active and adds to completed', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().completeQuest('main-chapter-00');
      expect(useQuestStore.getState().activeQuests).toHaveLength(0);
      expect(useQuestStore.getState().completedQuests).toContain(
        'main-chapter-00',
      );
    });

    it('does not duplicate in completedQuests', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().completeQuest('main-chapter-00');
      // Force a second complete call (edge case)
      useQuestStore.getState().completeQuest('main-chapter-00');
      expect(
        useQuestStore
          .getState()
          .completedQuests.filter((id) => id === 'main-chapter-00'),
      ).toHaveLength(1);
    });
  });

  describe('failQuest', () => {
    it('removes from active without adding to completed', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().failQuest('main-chapter-00');
      expect(useQuestStore.getState().activeQuests).toHaveLength(0);
      expect(useQuestStore.getState().completedQuests).not.toContain(
        'main-chapter-00',
      );
    });
  });

  describe('markTriggered', () => {
    it('adds quest to triggered list', () => {
      useQuestStore.getState().markTriggered('side-lost-pilgrim');
      expect(useQuestStore.getState().triggeredQuests).toContain(
        'side-lost-pilgrim',
      );
    });

    it('does not duplicate triggered entries', () => {
      useQuestStore.getState().markTriggered('side-lost-pilgrim');
      useQuestStore.getState().markTriggered('side-lost-pilgrim');
      expect(
        useQuestStore
          .getState()
          .triggeredQuests.filter((id) => id === 'side-lost-pilgrim'),
      ).toHaveLength(1);
    });
  });

  describe('resetQuests', () => {
    it('clears all quest state', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().completeQuest('main-chapter-00');
      useQuestStore.getState().activateQuest('side-lost-pilgrim');
      useQuestStore.getState().resetQuests();
      const state = useQuestStore.getState();
      expect(state.activeQuests).toHaveLength(0);
      expect(state.completedQuests).toHaveLength(0);
      expect(state.triggeredQuests).toHaveLength(0);
    });
  });

  describe('quest state persists across simulated chunk loads', () => {
    it('state remains after multiple activations and advances', () => {
      // Simulate: activate quest, advance, activate another
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().advanceStep('main-chapter-00');
      useQuestStore.getState().advanceStep('main-chapter-00');
      useQuestStore.getState().activateQuest('side-lost-pilgrim');

      // Read state (simulating a "new chunk" reading state)
      const state = useQuestStore.getState();
      expect(state.activeQuests).toHaveLength(2);
      expect(
        state.activeQuests.find((q) => q.questId === 'main-chapter-00')
          ?.currentStep,
      ).toBe(2);
      expect(
        state.activeQuests.find((q) => q.questId === 'side-lost-pilgrim')
          ?.currentStep,
      ).toBe(0);
    });
  });
});
