import { create } from 'zustand';
import type { QuestDefinition } from '../../schemas/quest.schema';

// --- Static quest imports (bundled by Vite) ---

import chapter00 from '../../../content/quests/main/chapter-00.json';
import chapter01 from '../../../content/quests/main/chapter-01.json';
import chapter02 from '../../../content/quests/main/chapter-02.json';
import chapter03 from '../../../content/quests/main/chapter-03.json';
import chapter04 from '../../../content/quests/main/chapter-04.json';
import chapter05 from '../../../content/quests/main/chapter-05.json';
import aldricsMissingHammer from '../../../content/quests/side/aldrics-missing-hammer.json';
import banditAmbush from '../../../content/quests/side/bandit-ambush.json';
import besssSecretRecipe from '../../../content/quests/side/besss-secret-recipe.json';
import fatherCedricsLostHymnal from '../../../content/quests/side/father-cedrics-lost-hymnal.json';
import lordAshwicksSecret from '../../../content/quests/side/lord-ashwicks-secret.json';
import lostPilgrim from '../../../content/quests/side/lost-pilgrim.json';
import merchantsBrokenCart from '../../../content/quests/side/merchants-broken-cart.json';
import sisterMaevesGarden from '../../../content/quests/side/sister-maeves-garden.json';
import strangeShrine from '../../../content/quests/side/strange-shrine.json';
import theBridgeTroll from '../../../content/quests/side/the-bridge-troll.json';
import theCartographersMap from '../../../content/quests/side/the-cartographers-map.json';
import theCursedRing from '../../../content/quests/side/the-cursed-ring.json';
import theDeserter from '../../../content/quests/side/the-deserter.json';
import theHerbalistsJourney from '../../../content/quests/side/the-herbalists-journey.json';
import theMissingManuscript from '../../../content/quests/side/the-missing-manuscript.json';
import theMissingMerchant from '../../../content/quests/side/the-missing-merchant.json';
import thePoisonedWell from '../../../content/quests/side/the-poisoned-well.json';
import theUnderground from '../../../content/quests/side/the-underground.json';
import woundedSoldier from '../../../content/quests/side/wounded-soldier.json';

// --- Quest Registry ---

const ALL_QUESTS: QuestDefinition[] = [
  chapter00,
  chapter01,
  chapter02,
  chapter03,
  chapter04,
  chapter05,
  aldricsMissingHammer,
  banditAmbush,
  besssSecretRecipe,
  fatherCedricsLostHymnal,
  lordAshwicksSecret,
  lostPilgrim,
  merchantsBrokenCart,
  sisterMaevesGarden,
  strangeShrine,
  theBridgeTroll,
  theCartographersMap,
  theCursedRing,
  theDeserter,
  theHerbalistsJourney,
  theMissingMerchant,
  theMissingManuscript,
  thePoisonedWell,
  theUnderground,
  woundedSoldier,
] as unknown as QuestDefinition[];

const QUEST_BY_ID = new Map<string, QuestDefinition>();
for (const q of ALL_QUESTS) {
  QUEST_BY_ID.set(q.id, q);
}

/** Look up a quest definition by id. */
export function getQuestDefinition(id: string): QuestDefinition | undefined {
  return QUEST_BY_ID.get(id);
}

/** Get all registered quest definitions. */
export function getAllQuests(): QuestDefinition[] {
  return ALL_QUESTS;
}

// --- Active quest state ---

export interface ActiveQuest {
  questId: string;
  currentStep: number;
  branch?: 'A' | 'B';
}

interface QuestState {
  activeQuests: ActiveQuest[];
  completedQuests: string[];
  /** Track quests already triggered so they don't re-fire. */
  triggeredQuests: string[];

  // Actions
  activateQuest: (questId: string, branch?: 'A' | 'B') => void;
  advanceStep: (questId: string) => void;
  chooseBranch: (questId: string, branch: 'A' | 'B') => void;
  completeQuest: (questId: string) => void;
  failQuest: (questId: string) => void;
  markTriggered: (questId: string) => void;
  resetQuests: () => void;
}

export const useQuestStore = create<QuestState>((set) => ({
  activeQuests: [],
  completedQuests: [],
  triggeredQuests: [],

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

  resetQuests: () =>
    set({
      activeQuests: [],
      completedQuests: [],
      triggeredQuests: [],
    }),
}));
