import type {
  QuestDefinition,
  QuestReward,
  QuestStep,
} from '../../schemas/quest.schema';
import type { ActiveQuest } from '../stores/questStore';
import { getQuestDefinition, useQuestStore } from '../stores/questStore';

/**
 * The action the game should perform for the current quest step.
 * The rendering layer reads this to know what to show the player.
 */
export type StepAction =
  | { type: 'dialogue'; npcArchetype: string; dialogue: string; stepId: string }
  | { type: 'investigate'; description: string; stepId: string }
  | { type: 'travel'; destination: string; description: string; stepId: string }
  | {
      type: 'encounter';
      encounterId: string;
      description: string;
      stepId: string;
    }
  | { type: 'fetch'; itemId: string; description: string; stepId: string }
  | { type: 'escort'; description: string; stepId: string }
  | { type: 'puzzle'; description: string; stepId: string }
  | { type: 'quest_complete'; questId: string; rewards: QuestReward[] }
  | { type: 'needs_branch'; questId: string; labelA: string; labelB: string }
  | { type: 'error'; reason: string };

/**
 * Resolve the steps array for a quest, handling branching vs linear.
 * Returns null if quest needs a branch choice first.
 */
export function resolveSteps(
  quest: QuestDefinition,
  activeQuest: ActiveQuest,
): QuestStep[] | null {
  if (quest.steps) {
    return quest.steps;
  }
  if (quest.branches) {
    if (!activeQuest.branch) return null;
    const branch = quest.branches[activeQuest.branch];
    return branch?.steps ?? null;
  }
  return null;
}

/**
 * Get the current step action for a quest.
 * This is the main entry point — call it to find out what the player
 * should be doing right now for a given active quest.
 */
export function getCurrentStepAction(questId: string): StepAction {
  const { activeQuests } = useQuestStore.getState();
  const activeQuest = activeQuests.find((q) => q.questId === questId);
  if (!activeQuest) {
    return { type: 'error', reason: `Quest ${questId} is not active` };
  }

  const quest = getQuestDefinition(questId);
  if (!quest) {
    return { type: 'error', reason: `Quest definition ${questId} not found` };
  }

  const steps = resolveSteps(quest, activeQuest);
  if (!steps) {
    // Branching quest without a branch chosen yet
    if (quest.branches) {
      return {
        type: 'needs_branch',
        questId,
        labelA: quest.branches.A.label,
        labelB: quest.branches.B.label,
      };
    }
    return { type: 'error', reason: `No steps found for quest ${questId}` };
  }

  // Check if all steps are done
  if (activeQuest.currentStep >= steps.length) {
    const rewards = collectRewards(quest, activeQuest);
    return { type: 'quest_complete', questId, rewards };
  }

  const step = steps[activeQuest.currentStep];
  return stepToAction(step);
}

/**
 * Attempt to advance the current step of a quest.
 * Returns the new step action after advancing, or an error.
 */
export function advanceQuestStep(questId: string): StepAction {
  const { activeQuests, advanceStep, completeQuest } = useQuestStore.getState();
  const activeQuest = activeQuests.find((q) => q.questId === questId);
  if (!activeQuest) {
    return { type: 'error', reason: `Quest ${questId} is not active` };
  }

  const quest = getQuestDefinition(questId);
  if (!quest) {
    return { type: 'error', reason: `Quest definition ${questId} not found` };
  }

  const steps = resolveSteps(quest, activeQuest);
  if (!steps) {
    return { type: 'error', reason: `No steps resolved for quest ${questId}` };
  }

  const nextStep = activeQuest.currentStep + 1;

  if (nextStep >= steps.length) {
    // Quest is complete
    const rewards = collectRewards(quest, activeQuest);
    completeQuest(questId);
    return { type: 'quest_complete', questId, rewards };
  }

  advanceStep(questId);
  return stepToAction(steps[nextStep]);
}

/**
 * Choose a branch for a branching quest and return the first step action.
 */
export function chooseBranchAndStart(
  questId: string,
  branch: 'A' | 'B',
): StepAction {
  const { chooseBranch } = useQuestStore.getState();
  chooseBranch(questId, branch);

  // Re-read state after mutation
  const { activeQuests } = useQuestStore.getState();
  const activeQuest = activeQuests.find((q) => q.questId === questId);
  if (!activeQuest) {
    return { type: 'error', reason: `Quest ${questId} not found after branch` };
  }

  const quest = getQuestDefinition(questId);
  if (!quest) {
    return { type: 'error', reason: `Quest definition ${questId} not found` };
  }

  const steps = resolveSteps(quest, activeQuest);
  if (!steps || steps.length === 0) {
    return {
      type: 'error',
      reason: `No steps for branch ${branch} of ${questId}`,
    };
  }

  return stepToAction(steps[0]);
}

/**
 * Get a summary of the current quest state for UI display.
 */
export function getQuestProgress(questId: string): {
  currentStep: number;
  totalSteps: number;
  stepDescription: string;
} | null {
  const { activeQuests } = useQuestStore.getState();
  const activeQuest = activeQuests.find((q) => q.questId === questId);
  if (!activeQuest) return null;

  const quest = getQuestDefinition(questId);
  if (!quest) return null;

  const steps = resolveSteps(quest, activeQuest);
  if (!steps) return null;

  const currentStep = Math.min(activeQuest.currentStep, steps.length - 1);
  const step = steps[currentStep];

  return {
    currentStep: activeQuest.currentStep,
    totalSteps: steps.length,
    stepDescription:
      step.description ?? step.dialogue?.slice(0, 80) ?? step.type,
  };
}

// --- Internal helpers ---

function stepToAction(step: QuestStep): StepAction {
  switch (step.type) {
    case 'dialogue':
      return {
        type: 'dialogue',
        npcArchetype: step.npcArchetype ?? 'unknown',
        dialogue: step.dialogue ?? '',
        stepId: step.id,
      };
    case 'investigate':
      return {
        type: 'investigate',
        description: step.description ?? 'Investigate the area.',
        stepId: step.id,
      };
    case 'travel':
      return {
        type: 'travel',
        destination: step.destination ?? '',
        description: step.description ?? 'Travel to the destination.',
        stepId: step.id,
      };
    case 'encounter':
      return {
        type: 'encounter',
        encounterId: step.encounterId ?? '',
        description: step.description ?? 'Defeat the enemies.',
        stepId: step.id,
      };
    case 'fetch':
      return {
        type: 'fetch',
        itemId: step.itemId ?? '',
        description: step.description ?? 'Find the required item.',
        stepId: step.id,
      };
    case 'escort':
      return {
        type: 'escort',
        description: step.description ?? 'Escort the NPC safely.',
        stepId: step.id,
      };
    case 'puzzle':
      return {
        type: 'puzzle',
        description: step.description ?? 'Solve the puzzle.',
        stepId: step.id,
      };
    default:
      return { type: 'error', reason: `Unknown step type: ${step.type}` };
  }
}

function collectRewards(
  quest: QuestDefinition,
  activeQuest: ActiveQuest,
): QuestReward[] {
  const rewards: QuestReward[] = [];

  // Main quest reward
  if (quest.reward) {
    rewards.push(quest.reward);
  }

  // Branch-specific reward
  if (quest.branches && activeQuest.branch) {
    const branchReward = quest.branches[activeQuest.branch]?.reward;
    if (branchReward) {
      rewards.push(branchReward);
    }
  }

  return rewards;
}
