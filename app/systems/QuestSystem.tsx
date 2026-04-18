import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type {
  QuestDefinition,
  QuestReward,
  QuestStep,
} from '@/schemas/quest.schema';
import {
  activateQuest,
  addQuestXp,
  advanceQuestStep,
  completeQuest,
  consumeQuestEvents,
  getAllQuests,
  getQuestDefinition,
  getQuestState,
  getResolvedQuest,
  markQuestTriggered,
  recordCombatVictory,
  recordDialogue,
} from '@/ecs/actions/quest';
import type { ActiveQuest, QuestEvents } from '@/ecs/traits/session-quest';
import { useGameStore } from '@/stores/gameStore';
import { CHUNK_SIZE } from '@/utils/worldGen';
import { getAnchorById } from '@/world/road-spine';

/** How often (in seconds) to re-evaluate quest triggers. */
const TRIGGER_CHECK_INTERVAL = 1;

/** How often (in seconds) to evaluate active quest step conditions. */
const STEP_CHECK_INTERVAL = 0.5;

/** Distance threshold (road units) for anchor proximity triggers. */
const ANCHOR_PROXIMITY = 500;

/** Distance threshold (world units) for travel step proximity. */
const TRAVEL_PROXIMITY = 600;

/**
 * XP reward per quest tier when no explicit XP reward is set.
 * Quests grant XP on completion based on their tier.
 */
const TIER_XP: Record<string, number> = {
  micro: 25,
  meso: 75,
  macro: 200,
};

/**
 * QuestSystem — runs inside the R3F Canvas as a renderless component.
 *
 * Responsibilities:
 * 1. Evaluate triggers to activate new quests
 * 2. Track dialogue and combat events for step conditions
 * 3. Advance quest steps when conditions are met
 * 4. Complete quests and grant rewards
 *
 * All state reads are imperative (getState()) to avoid subscription overhead.
 */
export function QuestSystem() {
  const triggerTimerRef = useRef(0);
  const stepTimerRef = useRef(0);
  /** Track inDialogue from the previous frame to detect close transitions. */
  const prevInDialogueRef = useRef(false);
  /** Track inCombat from the previous frame to detect combat end. */
  const prevInCombatRef = useRef(false);

  useFrame((_, delta) => {
    const gameState = useGameStore.getState();
    const { gameActive, playerPosition } = gameState;
    if (!gameActive) return;

    const dt = Math.min(delta, 0.1);

    // ── Detect dialogue close events ──────────────────────────────────
    // When inDialogue transitions from true to false, record the NPC
    // interaction so step conditions can match against it.
    const wasInDialogue = prevInDialogueRef.current;
    prevInDialogueRef.current = gameState.inDialogue;

    if (wasInDialogue && !gameState.inDialogue) {
      // currentInteractable may still be set on the close frame
      const interactable = gameState.currentInteractable;
      if (interactable) {
        recordDialogue(interactable.type, interactable.name);
      }
    }

    // ── Detect combat end events ──────────────────────────────────────
    const wasInCombat = prevInCombatRef.current;
    prevInCombatRef.current = gameState.inCombat;

    if (wasInCombat && !gameState.inCombat && !gameState.isDead) {
      // Combat ended with player alive = victory
      // The encounter system already resolved loot; we just track the event.
      const encounter = gameState.activeEncounter;
      const monstersKilled = encounter?.monsters.length ?? 0;
      recordCombatVictory(null, monstersKilled);
    }

    // Don't evaluate triggers or steps while in dialogue or combat
    if (gameState.inDialogue || gameState.inCombat) return;

    // ── Trigger evaluation (throttled) ────────────────────────────────
    triggerTimerRef.current += dt;
    if (triggerTimerRef.current >= TRIGGER_CHECK_INTERVAL) {
      triggerTimerRef.current = 0;
      evaluateTriggers(playerPosition, gameState.currentChunkType);
    }

    // ── Step condition evaluation (throttled) ─────────────────────────
    stepTimerRef.current += dt;
    if (stepTimerRef.current >= STEP_CHECK_INTERVAL) {
      stepTimerRef.current = 0;
      evaluateActiveQuests(playerPosition);
    }
  });

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Trigger evaluation — activate new quests
// ═══════════════════════════════════════════════════════════════════════════

function evaluateTriggers(
  playerPosition: { x: number; y: number; z: number },
  currentChunkType: string,
): void {
  const { activeQuests, completedQuests, triggeredQuests } = getQuestState();

  // Player road distance: chunk Z maps to 1D road distance
  const cz = Math.floor(playerPosition.z / CHUNK_SIZE);
  const playerRoadDistance = cz * CHUNK_SIZE;

  const allQuests = getAllQuests();

  for (const quest of allQuests) {
    // Skip if already active, completed, or previously triggered
    if (triggeredQuests.includes(quest.id)) continue;
    if (completedQuests.includes(quest.id)) continue;
    if (activeQuests.some((q) => q.questId === quest.id)) continue;

    // Check prerequisites
    if (
      quest.prerequisites &&
      quest.prerequisites.length > 0 &&
      !quest.prerequisites.every((p) => completedQuests.includes(p))
    ) {
      continue;
    }

    // Evaluate trigger
    if (
      checkTrigger(quest, playerRoadDistance, currentChunkType, completedQuests)
    ) {
      const resolved = getResolvedQuest(quest.id);
      activateQuest(quest.id, resolved?.branch);
    }
  }
}

function checkTrigger(
  quest: QuestDefinition,
  playerRoadDistance: number,
  _currentChunkType: string,
  completedQuests: string[],
): boolean {
  const trigger = quest.trigger;

  switch (trigger.type) {
    case 'anchor': {
      const anchor = getAnchorById(trigger.anchorId);
      if (!anchor) return false;
      return (
        Math.abs(playerRoadDistance - anchor.distanceFromStart) <
        ANCHOR_PROXIMITY
      );
    }

    case 'roadside': {
      const [min, max] = trigger.distanceRange;
      return playerRoadDistance >= min && playerRoadDistance <= max;
    }

    case 'prerequisite': {
      // Prerequisite-only triggers fire as soon as the required quest is done
      return completedQuests.includes(trigger.questId);
    }

    default:
      return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Step condition evaluation — advance active quests
// ═══════════════════════════════════════════════════════════════════════════

function evaluateActiveQuests(playerPosition: {
  x: number;
  y: number;
  z: number;
}): void {
  const questState = getQuestState();
  const { activeQuests, events } = questState;
  if (activeQuests.length === 0) return;

  // Player road distance for travel checks
  const cz = Math.floor(playerPosition.z / CHUNK_SIZE);
  const playerRoadDistance = cz * CHUNK_SIZE;

  for (const activeQuest of activeQuests) {
    const quest = getQuestDefinition(activeQuest.questId);
    if (!quest) continue;

    const steps = resolveSteps(quest, activeQuest);
    if (!steps) continue;

    // Check if past the last step (should already be completed)
    if (activeQuest.currentStep >= steps.length) {
      completeQuestWithRewards(quest, activeQuest);
      continue;
    }

    const step = steps[activeQuest.currentStep];
    if (isStepConditionMet(step, events, playerRoadDistance)) {
      const nextStep = activeQuest.currentStep + 1;

      if (nextStep >= steps.length) {
        // All steps done — complete the quest
        completeQuestWithRewards(quest, activeQuest);
      } else {
        // Advance to next step
        advanceQuestStep(activeQuest.questId);
      }
    }
  }

  // Consume transient events after evaluating all quests
  if (events.lastDialogueArchetype !== null || events.combatVictory) {
    consumeQuestEvents();
  }
}

/**
 * Resolve the steps array for a quest, handling branching vs linear.
 */
function resolveSteps(
  quest: QuestDefinition,
  activeQuest: ActiveQuest,
): QuestStep[] | null {
  if (quest.steps) {
    return quest.steps;
  }
  if (quest.branches && activeQuest.branch) {
    const branch = quest.branches[activeQuest.branch];
    return branch?.steps ?? null;
  }
  return null;
}

/**
 * Check whether a step's completion condition is satisfied.
 *
 * Step type conditions:
 * - dialogue:    Player completed a dialogue with the matching NPC archetype
 * - encounter:   Player won a combat encounter
 * - travel:      Player reached the destination anchor or road distance
 * - investigate: Player completed a dialogue (interaction proxy) or is near the area
 * - fetch:       Player completed a dialogue (turn-in proxy) or is near the area
 * - escort:      Player completed a dialogue (escort-complete proxy) or is near destination
 * - puzzle:      Player completed a dialogue (puzzle-solve proxy) or is near the area
 */
function isStepConditionMet(
  step: QuestStep,
  events: QuestEvents,
  playerRoadDistance: number,
): boolean {
  switch (step.type) {
    case 'dialogue': {
      // Dialogue step: completed when player finishes talking to the right NPC
      if (!events.lastDialogueArchetype) return false;
      const requiredArchetype = step.npcArchetype;
      if (!requiredArchetype) return true; // No archetype specified = any dialogue
      return events.lastDialogueArchetype === requiredArchetype;
    }

    case 'encounter': {
      // Encounter step: completed when player wins any combat
      // In the future, could match specific encounterId
      return events.combatVictory;
    }

    case 'travel': {
      // Travel step: completed when player reaches the destination
      // Destination can be an anchor id or a general area
      if (step.destination) {
        const anchor = getAnchorById(step.destination);
        if (anchor) {
          return (
            Math.abs(playerRoadDistance - anchor.distanceFromStart) <
            TRAVEL_PROXIMITY
          );
        }
      }
      // No specific destination — any forward movement counts
      // Use a generous completion check (player has moved at all)
      return true;
    }

    case 'investigate': {
      // Investigate steps complete on any dialogue (representing finding something)
      // or any interaction event. In the future, could require specific item inspection.
      return events.lastDialogueArchetype !== null || events.combatVictory;
    }

    case 'fetch': {
      // Fetch steps complete on dialogue (representing item pickup/turn-in)
      // In the future, could check inventory for the required itemId.
      return events.lastDialogueArchetype !== null;
    }

    case 'escort': {
      // Escort steps complete on dialogue (representing safe arrival)
      // In the future, could track NPC companion proximity.
      return events.lastDialogueArchetype !== null;
    }

    case 'puzzle': {
      // Puzzle steps complete on dialogue (representing solving)
      // In the future, could have actual puzzle mini-game completion.
      return events.lastDialogueArchetype !== null || events.combatVictory;
    }

    default:
      return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Quest completion — grant rewards
// ═══════════════════════════════════════════════════════════════════════════

function completeQuestWithRewards(
  quest: QuestDefinition,
  activeQuest: ActiveQuest,
): void {
  // Collect all rewards
  const rewards = collectRewards(quest, activeQuest);

  // Grant XP based on quest tier
  const tierXp = TIER_XP[quest.tier] ?? 25;
  addQuestXp(tierXp);

  // Grant currency rewards directly
  for (const reward of rewards) {
    if (reward.type === 'currency' && reward.amount) {
      // Currency rewards add to quest XP as a bonus
      // (In the future, this would add to a gold/currency store)
      addQuestXp(reward.amount);
    }
  }

  // Move quest to completed
  completeQuest(quest.id);
}

/**
 * Collect all rewards from a quest including branch-specific rewards.
 */
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
