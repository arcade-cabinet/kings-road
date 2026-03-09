import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import {
  getAllQuests,
  type getQuestDefinition,
  useQuestStore,
} from '../stores/questStore';
import { CHUNK_SIZE } from '../utils/worldGen';
import { getAnchorById } from '../world/road-spine';

/** How often (in seconds) to re-evaluate quest triggers. */
const TRIGGER_CHECK_INTERVAL = 1;

/** Distance threshold (road units) for anchor proximity triggers. */
const ANCHOR_PROXIMITY = 500;

/**
 * QuestSystem — runs inside the R3F Canvas as a renderless component.
 *
 * Each frame (throttled), evaluates all quest triggers against the
 * player's current position and completed quests. When a trigger fires,
 * the quest is activated in the quest store.
 */
export function QuestSystem() {
  const timerRef = useRef(0);

  useFrame((_, delta) => {
    const { gameActive, inDialogue, playerPosition, currentChunkType } =
      useGameStore.getState();
    if (!gameActive || inDialogue) return;

    // Throttle trigger checks
    timerRef.current += Math.min(delta, 0.1);
    if (timerRef.current < TRIGGER_CHECK_INTERVAL) return;
    timerRef.current = 0;

    const { activeQuests, completedQuests, triggeredQuests, activateQuest } =
      useQuestStore.getState();

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
      if (checkTrigger(quest, playerRoadDistance, currentChunkType)) {
        activateQuest(quest.id);
      }
    }
  });

  return null;
}

function checkTrigger(
  quest: ReturnType<typeof getQuestDefinition> & object,
  playerRoadDistance: number,
  _currentChunkType: string,
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
      const { completedQuests } = useQuestStore.getState();
      return completedQuests.includes(trigger.questId);
    }

    default:
      return false;
  }
}
