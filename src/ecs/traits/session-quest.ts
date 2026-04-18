import { trait } from 'koota';
import type { QuestGraph } from '@/world/quest-resolver';

export interface ActiveQuest {
  questId: string;
  currentStep: number;
  branch?: 'A' | 'B';
}

export interface QuestEvents {
  lastDialogueArchetype: string | null;
  lastDialogueName: string | null;
  combatVictory: boolean;
  lastEncounterId: string | null;
  lastCombatKills: number;
  totalMonstersDefeated: number;
}

export const EMPTY_QUEST_EVENTS: QuestEvents = {
  lastDialogueArchetype: null,
  lastDialogueName: null,
  combatVictory: false,
  lastEncounterId: null,
  lastCombatKills: 0,
  totalMonstersDefeated: 0,
};

/** Session-scoped quest state (player's progress through the narrative). */
export const QuestLog = trait(() => ({
  activeQuests: [] as ActiveQuest[],
  completedQuests: [] as string[],
  triggeredQuests: [] as string[],
  questGraph: null as QuestGraph | null,
  events: { ...EMPTY_QUEST_EVENTS } as QuestEvents,
  questXpEarned: 0,
}));
