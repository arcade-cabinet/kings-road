import { create } from 'zustand';
import {
  getAllQuests as getAllQuestsFromStore,
  getQuest,
  isContentStoreReady,
} from '../../db/content-queries';
import type { QuestDefinition } from '../../schemas/quest.schema';
import type { QuestGraph, ResolvedQuest } from '../world/quest-resolver';
import { resolveQuestGraph } from '../world/quest-resolver';

/** Look up a quest definition by id. */
export function getQuestDefinition(id: string): QuestDefinition | undefined {
  if (!isContentStoreReady()) return undefined;
  return getQuest(id) as QuestDefinition | undefined;
}

/** Get all registered quest definitions. */
export function getAllQuests(): QuestDefinition[] {
  if (!isContentStoreReady()) return [];
  return getAllQuestsFromStore() as QuestDefinition[];
}

// --- Active quest state ---

export interface ActiveQuest {
  questId: string;
  currentStep: number;
  branch?: 'A' | 'B';
}

/**
 * Quest events track player actions that can satisfy step conditions.
 * Events are consumed (cleared) once the QuestSystem processes them.
 */
export interface QuestEvents {
  /** NPC archetype of the last completed dialogue (set on dialogue close). */
  lastDialogueArchetype: string | null;
  /** Name of the NPC from the last completed dialogue. */
  lastDialogueName: string | null;
  /** Set to true when combat ends in victory. */
  combatVictory: boolean;
  /** Encounter ID of the last combat victory (if quest-initiated). */
  lastEncounterId: string | null;
  /** Number of monsters killed in the last combat. */
  lastCombatKills: number;
  /** Total monsters defeated since game start (cumulative). */
  totalMonstersDefeated: number;
}

interface QuestState {
  activeQuests: ActiveQuest[];
  completedQuests: string[];
  /** Track quests already triggered so they don't re-fire. */
  triggeredQuests: string[];
  /** Deterministic narrative spine resolved from the seed at New Game. */
  questGraph: QuestGraph | null;
  /** Transient events consumed by QuestSystem for step evaluation. */
  events: QuestEvents;
  /** XP earned from quest completions (cumulative). */
  questXpEarned: number;

  // Actions
  activateQuest: (questId: string, branch?: 'A' | 'B') => void;
  advanceStep: (questId: string) => void;
  chooseBranch: (questId: string, branch: 'A' | 'B') => void;
  completeQuest: (questId: string) => void;
  failQuest: (questId: string) => void;
  markTriggered: (questId: string) => void;
  /** Record a completed dialogue interaction. */
  recordDialogue: (npcArchetype: string, npcName: string) => void;
  /** Record a combat victory. */
  recordCombatVictory: (
    encounterId: string | null,
    monstersKilled: number,
  ) => void;
  /** Clear transient events after QuestSystem has consumed them. */
  consumeEvents: () => void;
  /** Resolve all quest branches from the seed. Call once at New Game. */
  resolveNarrative: (seedPhrase: string) => void;
  /** Look up a resolved quest by id. */
  getResolvedQuest: (questId: string) => ResolvedQuest | undefined;
  /** Restore quest state from save data (preserves currentStep). */
  restoreQuests: (
    activeQuests: ActiveQuest[],
    completedQuests: string[],
    triggeredQuests: string[],
  ) => void;
  /** Add XP from quest rewards. */
  addQuestXp: (amount: number) => void;
  resetQuests: () => void;
}

const EMPTY_EVENTS: QuestEvents = {
  lastDialogueArchetype: null,
  lastDialogueName: null,
  combatVictory: false,
  lastEncounterId: null,
  lastCombatKills: 0,
  totalMonstersDefeated: 0,
};

export const useQuestStore = create<QuestState>((set, get) => ({
  activeQuests: [],
  completedQuests: [],
  triggeredQuests: [],
  questGraph: null,
  events: { ...EMPTY_EVENTS },
  questXpEarned: 0,

  activateQuest: (questId, branch) =>
    set((state) => {
      // Don't double-activate
      if (state.activeQuests.some((q) => q.questId === questId)) return state;
      if (state.completedQuests.includes(questId)) return state;

      return {
        activeQuests: [
          ...state.activeQuests,
          { questId, currentStep: 0, branch },
        ],
        triggeredQuests: state.triggeredQuests.includes(questId)
          ? state.triggeredQuests
          : [...state.triggeredQuests, questId],
      };
    }),

  advanceStep: (questId) =>
    set((state) => ({
      activeQuests: state.activeQuests.map((q) =>
        q.questId === questId ? { ...q, currentStep: q.currentStep + 1 } : q,
      ),
    })),

  chooseBranch: (questId, branch) =>
    set((state) => ({
      activeQuests: state.activeQuests.map((q) =>
        q.questId === questId ? { ...q, branch, currentStep: 0 } : q,
      ),
    })),

  completeQuest: (questId) =>
    set((state) => ({
      activeQuests: state.activeQuests.filter((q) => q.questId !== questId),
      completedQuests: state.completedQuests.includes(questId)
        ? state.completedQuests
        : [...state.completedQuests, questId],
    })),

  failQuest: (questId) =>
    set((state) => ({
      activeQuests: state.activeQuests.filter((q) => q.questId !== questId),
    })),

  markTriggered: (questId) =>
    set((state) => ({
      triggeredQuests: state.triggeredQuests.includes(questId)
        ? state.triggeredQuests
        : [...state.triggeredQuests, questId],
    })),

  recordDialogue: (npcArchetype, npcName) =>
    set((state) => ({
      events: {
        ...state.events,
        lastDialogueArchetype: npcArchetype,
        lastDialogueName: npcName,
      },
    })),

  recordCombatVictory: (encounterId, monstersKilled) =>
    set((state) => ({
      events: {
        ...state.events,
        combatVictory: true,
        lastEncounterId: encounterId,
        lastCombatKills: monstersKilled,
        totalMonstersDefeated:
          state.events.totalMonstersDefeated + monstersKilled,
      },
    })),

  consumeEvents: () =>
    set((state) => ({
      events: {
        ...EMPTY_EVENTS,
        // Preserve cumulative counters
        totalMonstersDefeated: state.events.totalMonstersDefeated,
      },
    })),

  addQuestXp: (amount) =>
    set((state) => ({
      questXpEarned: state.questXpEarned + amount,
    })),

  resolveNarrative: (seedPhrase) =>
    set({
      questGraph: resolveQuestGraph(
        getAllQuestsFromStore() as QuestDefinition[],
        seedPhrase,
      ),
    }),

  getResolvedQuest: (questId) => get().questGraph?.byId.get(questId),

  restoreQuests: (activeQuests, completedQuests, triggeredQuests) =>
    set({
      activeQuests: activeQuests.map((q) => ({ ...q })),
      completedQuests: [...completedQuests],
      triggeredQuests: [...triggeredQuests],
    }),

  resetQuests: () =>
    set({
      activeQuests: [],
      completedQuests: [],
      triggeredQuests: [],
      questGraph: null,
      events: { ...EMPTY_EVENTS },
      questXpEarned: 0,
    }),
}));
