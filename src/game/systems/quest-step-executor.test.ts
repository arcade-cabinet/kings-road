import { afterEach, describe, expect, it } from 'vitest';
import { useQuestStore } from '../stores/questStore';
import {
  advanceQuestStep,
  chooseBranchAndStart,
  getCurrentStepAction,
  getQuestProgress,
} from './quest-step-executor';

describe('quest-step-executor', () => {
  afterEach(() => {
    useQuestStore.getState().resetQuests();
  });

  describe('getCurrentStepAction', () => {
    it('returns error for inactive quest', () => {
      const action = getCurrentStepAction('main-chapter-00');
      expect(action.type).toBe('error');
    });

    it('returns needs_branch for branching quest without branch chosen', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      const action = getCurrentStepAction('main-chapter-00');
      expect(action.type).toBe('needs_branch');
      if (action.type === 'needs_branch') {
        expect(action.questId).toBe('main-chapter-00');
        expect(action.labelA).toBeDefined();
        expect(action.labelB).toBeDefined();
      }
    });

    it('returns first step for branching quest with branch A', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().chooseBranch('main-chapter-00', 'A');
      const action = getCurrentStepAction('main-chapter-00');
      expect(action.type).toBe('dialogue');
      if (action.type === 'dialogue') {
        expect(action.npcArchetype).toBe('pilgrim');
        expect(action.dialogue.length).toBeGreaterThan(0);
        expect(action.stepId).toBe('a-01');
      }
    });

    it('returns first step for branching quest with branch B', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().chooseBranch('main-chapter-00', 'B');
      const action = getCurrentStepAction('main-chapter-00');
      expect(action.type).toBe('dialogue');
      if (action.type === 'dialogue') {
        expect(action.stepId).toBe('b-01');
      }
    });

    it('returns first step for linear micro quest', () => {
      useQuestStore.getState().activateQuest('side-wounded-soldier');
      const action = getCurrentStepAction('side-wounded-soldier');
      expect(action.type).toBe('dialogue');
      if (action.type === 'dialogue') {
        expect(action.npcArchetype).toBe('knight');
        expect(action.stepId).toBe('s-01');
      }
    });

    it('returns quest_complete when all steps are done', () => {
      useQuestStore.getState().activateQuest('side-wounded-soldier');
      // Advance through all 3 steps
      useQuestStore.getState().advanceStep('side-wounded-soldier');
      useQuestStore.getState().advanceStep('side-wounded-soldier');
      useQuestStore.getState().advanceStep('side-wounded-soldier');

      const action = getCurrentStepAction('side-wounded-soldier');
      expect(action.type).toBe('quest_complete');
      if (action.type === 'quest_complete') {
        expect(action.questId).toBe('side-wounded-soldier');
        expect(action.rewards.length).toBeGreaterThan(0);
        expect(action.rewards[0].type).toBe('item');
        expect(action.rewards[0].itemId).toBe('iron_sword');
      }
    });

    it('returns error for unknown quest definition', () => {
      // Directly inject a bad quest into the store
      useQuestStore.setState({
        activeQuests: [{ questId: 'nonexistent-quest', currentStep: 0 }],
      });
      const action = getCurrentStepAction('nonexistent-quest');
      expect(action.type).toBe('error');
    });
  });

  describe('advanceQuestStep', () => {
    it('advances to the next step', () => {
      useQuestStore.getState().activateQuest('side-wounded-soldier');
      const action = advanceQuestStep('side-wounded-soldier');

      expect(action.type).toBe('investigate');
      if (action.type === 'investigate') {
        expect(action.stepId).toBe('s-02');
      }

      // Verify store updated
      const quest = useQuestStore
        .getState()
        .activeQuests.find((q) => q.questId === 'side-wounded-soldier');
      expect(quest?.currentStep).toBe(1);
    });

    it('advances through a dialogue step sequence', () => {
      useQuestStore.getState().activateQuest('side-wounded-soldier');

      // Step 0 -> 1 (dialogue -> investigate)
      const step1 = advanceQuestStep('side-wounded-soldier');
      expect(step1.type).toBe('investigate');

      // Step 1 -> 2 (investigate -> dialogue)
      const step2 = advanceQuestStep('side-wounded-soldier');
      expect(step2.type).toBe('dialogue');
      if (step2.type === 'dialogue') {
        expect(step2.stepId).toBe('s-03');
      }
    });

    it('completes quest when last step is advanced', () => {
      useQuestStore.getState().activateQuest('side-wounded-soldier');

      // Advance through all 3 steps
      advanceQuestStep('side-wounded-soldier');
      advanceQuestStep('side-wounded-soldier');
      const final = advanceQuestStep('side-wounded-soldier');

      expect(final.type).toBe('quest_complete');
      if (final.type === 'quest_complete') {
        expect(final.rewards).toHaveLength(1);
        expect(final.rewards[0].itemId).toBe('iron_sword');
      }

      // Quest should be in completed list
      expect(useQuestStore.getState().completedQuests).toContain(
        'side-wounded-soldier',
      );
      expect(useQuestStore.getState().activeQuests).toHaveLength(0);
    });

    it('returns error for inactive quest', () => {
      const action = advanceQuestStep('side-wounded-soldier');
      expect(action.type).toBe('error');
    });

    it('advances branching quest steps', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().chooseBranch('main-chapter-00', 'A');

      // Step a-01 -> a-02 (dialogue -> investigate)
      const step = advanceQuestStep('main-chapter-00');
      expect(step.type).toBe('investigate');
      if (step.type === 'investigate') {
        expect(step.stepId).toBe('a-02');
      }
    });
  });

  describe('chooseBranchAndStart', () => {
    it('selects branch A and returns first step', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      const action = chooseBranchAndStart('main-chapter-00', 'A');

      expect(action.type).toBe('dialogue');
      if (action.type === 'dialogue') {
        expect(action.stepId).toBe('a-01');
        expect(action.npcArchetype).toBe('pilgrim');
      }

      // Verify branch was set
      const quest = useQuestStore
        .getState()
        .activeQuests.find((q) => q.questId === 'main-chapter-00');
      expect(quest?.branch).toBe('A');
      expect(quest?.currentStep).toBe(0);
    });

    it('selects branch B and returns first step', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      const action = chooseBranchAndStart('main-chapter-00', 'B');

      expect(action.type).toBe('dialogue');
      if (action.type === 'dialogue') {
        expect(action.stepId).toBe('b-01');
      }
    });

    it('returns error for non-active quest', () => {
      const action = chooseBranchAndStart('main-chapter-00', 'A');
      expect(action.type).toBe('error');
    });
  });

  describe('getQuestProgress', () => {
    it('returns progress for active linear quest', () => {
      useQuestStore.getState().activateQuest('side-wounded-soldier');
      const progress = getQuestProgress('side-wounded-soldier');

      expect(progress).not.toBeNull();
      expect(progress?.currentStep).toBe(0);
      expect(progress?.totalSteps).toBe(3);
      expect(progress?.stepDescription.length).toBeGreaterThan(0);
    });

    it('updates progress after advancing', () => {
      useQuestStore.getState().activateQuest('side-wounded-soldier');
      advanceQuestStep('side-wounded-soldier');

      const progress = getQuestProgress('side-wounded-soldier');
      expect(progress?.currentStep).toBe(1);
    });

    it('returns null for inactive quest', () => {
      expect(getQuestProgress('side-wounded-soldier')).toBeNull();
    });

    it('returns null for unknown quest', () => {
      useQuestStore.setState({
        activeQuests: [{ questId: 'nonexistent', currentStep: 0 }],
      });
      expect(getQuestProgress('nonexistent')).toBeNull();
    });

    it('returns progress for branching quest with branch', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().chooseBranch('main-chapter-00', 'A');

      const progress = getQuestProgress('main-chapter-00');
      expect(progress).not.toBeNull();
      expect(progress?.totalSteps).toBe(5); // branch A has 5 steps
    });

    it('returns null for branching quest without branch', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      const progress = getQuestProgress('main-chapter-00');
      expect(progress).toBeNull();
    });
  });

  describe('reward collection', () => {
    it('collects main reward for linear quest', () => {
      useQuestStore.getState().activateQuest('side-wounded-soldier');
      // Complete all steps
      advanceQuestStep('side-wounded-soldier');
      advanceQuestStep('side-wounded-soldier');
      const result = advanceQuestStep('side-wounded-soldier');

      expect(result.type).toBe('quest_complete');
      if (result.type === 'quest_complete') {
        expect(result.rewards).toHaveLength(1);
        expect(result.rewards[0]).toEqual({
          type: 'item',
          itemId: 'iron_sword',
        });
      }
    });

    it('collects both main and branch rewards for branching quest', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().chooseBranch('main-chapter-00', 'A');

      // Advance through all 5 branch-A steps
      advanceQuestStep('main-chapter-00'); // a-02
      advanceQuestStep('main-chapter-00'); // a-03
      advanceQuestStep('main-chapter-00'); // a-04
      advanceQuestStep('main-chapter-00'); // a-05
      const result = advanceQuestStep('main-chapter-00'); // complete

      expect(result.type).toBe('quest_complete');
      if (result.type === 'quest_complete') {
        // Main reward + branch reward
        expect(result.rewards).toHaveLength(2);
        const types = result.rewards.map((r) => r.type);
        expect(types).toContain('item'); // main reward
        expect(types).toContain('modifier'); // branch A reward
      }
    });
  });

  describe('step type coverage', () => {
    it('handles dialogue steps', () => {
      useQuestStore.getState().activateQuest('side-wounded-soldier');
      const action = getCurrentStepAction('side-wounded-soldier');
      expect(action.type).toBe('dialogue');
    });

    it('handles investigate steps', () => {
      useQuestStore.getState().activateQuest('side-wounded-soldier');
      advanceQuestStep('side-wounded-soldier');
      const action = getCurrentStepAction('side-wounded-soldier');
      expect(action.type).toBe('investigate');
    });

    it('handles travel steps', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().chooseBranch('main-chapter-00', 'A');
      // Advance to step a-05 (travel)
      advanceQuestStep('main-chapter-00'); // a-02
      advanceQuestStep('main-chapter-00'); // a-03
      advanceQuestStep('main-chapter-00'); // a-04
      advanceQuestStep('main-chapter-00'); // a-05

      const action = getCurrentStepAction('main-chapter-00');
      expect(action.type).toBe('travel');
      if (action.type === 'travel') {
        expect(action.destination).toBe('anchor-01');
        expect(action.stepId).toBe('a-05');
      }
    });

    it('handles encounter steps', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().chooseBranch('main-chapter-00', 'B');
      // Advance to step b-04 (encounter)
      advanceQuestStep('main-chapter-00'); // b-02
      advanceQuestStep('main-chapter-00'); // b-03
      advanceQuestStep('main-chapter-00'); // b-04

      const action = getCurrentStepAction('main-chapter-00');
      expect(action.type).toBe('encounter');
      if (action.type === 'encounter') {
        expect(action.encounterId).toBe('ashford-wolves-at-the-gate');
        expect(action.stepId).toBe('b-04');
      }
    });
  });

  describe('full quest lifecycle', () => {
    it('runs a micro quest from start to finish', () => {
      // Activate
      useQuestStore.getState().activateQuest('side-wounded-soldier');
      expect(useQuestStore.getState().activeQuests).toHaveLength(1);

      // Step 0: dialogue
      const s0 = getCurrentStepAction('side-wounded-soldier');
      expect(s0.type).toBe('dialogue');

      // Advance -> Step 1: investigate
      const s1 = advanceQuestStep('side-wounded-soldier');
      expect(s1.type).toBe('investigate');

      // Advance -> Step 2: dialogue
      const s2 = advanceQuestStep('side-wounded-soldier');
      expect(s2.type).toBe('dialogue');

      // Advance -> Complete
      const complete = advanceQuestStep('side-wounded-soldier');
      expect(complete.type).toBe('quest_complete');

      // Verify final state
      expect(useQuestStore.getState().activeQuests).toHaveLength(0);
      expect(useQuestStore.getState().completedQuests).toContain(
        'side-wounded-soldier',
      );
    });

    it('runs a branching macro quest from start to finish', () => {
      // Activate
      useQuestStore.getState().activateQuest('main-chapter-00');

      // Needs branch
      const needsBranch = getCurrentStepAction('main-chapter-00');
      expect(needsBranch.type).toBe('needs_branch');

      // Choose branch A
      const first = chooseBranchAndStart('main-chapter-00', 'A');
      expect(first.type).toBe('dialogue');

      // Walk through all steps
      const s2 = advanceQuestStep('main-chapter-00'); // investigate
      expect(s2.type).toBe('investigate');
      const s3 = advanceQuestStep('main-chapter-00'); // dialogue
      expect(s3.type).toBe('dialogue');
      const s4 = advanceQuestStep('main-chapter-00'); // dialogue
      expect(s4.type).toBe('dialogue');
      const s5 = advanceQuestStep('main-chapter-00'); // travel
      expect(s5.type).toBe('travel');

      // Complete
      const complete = advanceQuestStep('main-chapter-00');
      expect(complete.type).toBe('quest_complete');
      if (complete.type === 'quest_complete') {
        expect(complete.rewards.length).toBe(2);
      }

      expect(useQuestStore.getState().completedQuests).toContain(
        'main-chapter-00',
      );
    });
  });
});
