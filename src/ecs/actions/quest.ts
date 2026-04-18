import {
  getAllQuests as getAllQuestsFromStore,
  getQuest,
  isContentStoreReady,
} from '@/db/content-queries';
import {
  type ActiveQuest,
  EMPTY_QUEST_EVENTS,
  type QuestEvents,
  QuestLog,
} from '@/ecs/traits/session-quest';
import { getSessionEntity } from '@/ecs/world';
import type { QuestDefinition } from '@/schemas/quest.schema';
import type { QuestGraph, ResolvedQuest } from '@/world/quest-resolver';
import { resolveQuestGraph } from '@/world/quest-resolver';

export function getQuestDefinition(id: string): QuestDefinition | undefined {
  if (!isContentStoreReady()) return undefined;
  return getQuest(id) as QuestDefinition | undefined;
}

export function getAllQuests(): QuestDefinition[] {
  if (!isContentStoreReady()) return [];
  return getAllQuestsFromStore() as QuestDefinition[];
}

type QuestState = {
  activeQuests: ActiveQuest[];
  completedQuests: string[];
  triggeredQuests: string[];
  questGraph: QuestGraph | null;
  events: QuestEvents;
  questXpEarned: number;
};

type SessionProxy = {
  has: (t: typeof QuestLog) => boolean;
  add: (t: typeof QuestLog) => void;
  get: (t: typeof QuestLog) => QuestState;
  set: (t: typeof QuestLog, value: QuestState) => void;
};

function session(): SessionProxy {
  const proxy = getSessionEntity() as unknown as SessionProxy;
  if (!proxy.has(QuestLog)) proxy.add(QuestLog);
  return proxy;
}

function patch(update: Partial<QuestState>): void {
  const s = session();
  s.set(QuestLog, { ...s.get(QuestLog), ...update });
}

export function getQuestState(): QuestState {
  return session().get(QuestLog);
}

export function activateQuest(questId: string, branch?: 'A' | 'B'): void {
  const cur = getQuestState();
  if (cur.activeQuests.some((q) => q.questId === questId)) return;
  if (cur.completedQuests.includes(questId)) return;
  patch({
    activeQuests: [...cur.activeQuests, { questId, currentStep: 0, branch }],
    triggeredQuests: cur.triggeredQuests.includes(questId)
      ? cur.triggeredQuests
      : [...cur.triggeredQuests, questId],
  });
}

export function advanceQuestStep(questId: string): void {
  const cur = getQuestState();
  patch({
    activeQuests: cur.activeQuests.map((q) =>
      q.questId === questId ? { ...q, currentStep: q.currentStep + 1 } : q,
    ),
  });
}

export function chooseQuestBranch(questId: string, branch: 'A' | 'B'): void {
  const cur = getQuestState();
  patch({
    activeQuests: cur.activeQuests.map((q) =>
      q.questId === questId ? { ...q, branch, currentStep: 0 } : q,
    ),
  });
}

export function completeQuest(questId: string): void {
  const cur = getQuestState();
  patch({
    activeQuests: cur.activeQuests.filter((q) => q.questId !== questId),
    completedQuests: cur.completedQuests.includes(questId)
      ? cur.completedQuests
      : [...cur.completedQuests, questId],
  });
}

export function failQuest(questId: string): void {
  const cur = getQuestState();
  patch({
    activeQuests: cur.activeQuests.filter((q) => q.questId !== questId),
  });
}

export function markQuestTriggered(questId: string): void {
  const cur = getQuestState();
  if (cur.triggeredQuests.includes(questId)) return;
  patch({ triggeredQuests: [...cur.triggeredQuests, questId] });
}

export function recordDialogue(npcArchetype: string, npcName: string): void {
  const cur = getQuestState();
  patch({
    events: {
      ...cur.events,
      lastDialogueArchetype: npcArchetype,
      lastDialogueName: npcName,
    },
  });
}

export function recordCombatVictory(
  encounterId: string | null,
  monstersKilled: number,
): void {
  const cur = getQuestState();
  patch({
    events: {
      ...cur.events,
      combatVictory: true,
      lastEncounterId: encounterId,
      lastCombatKills: monstersKilled,
      totalMonstersDefeated: cur.events.totalMonstersDefeated + monstersKilled,
    },
  });
}

export function consumeQuestEvents(): void {
  const cur = getQuestState();
  patch({
    events: {
      ...EMPTY_QUEST_EVENTS,
      totalMonstersDefeated: cur.events.totalMonstersDefeated,
    },
  });
}

export function addQuestXp(amount: number): void {
  const cur = getQuestState();
  patch({ questXpEarned: cur.questXpEarned + amount });
}

export function resolveNarrative(seedPhrase: string): void {
  patch({
    questGraph: resolveQuestGraph(
      getAllQuestsFromStore() as QuestDefinition[],
      seedPhrase,
    ),
  });
}

export function getResolvedQuest(questId: string): ResolvedQuest | undefined {
  return getQuestState().questGraph?.byId.get(questId);
}

export function restoreQuests(
  activeQuests: ActiveQuest[],
  completedQuests: string[],
  triggeredQuests: string[],
): void {
  patch({
    activeQuests: activeQuests.map((q) => ({ ...q })),
    completedQuests: [...completedQuests],
    triggeredQuests: [...triggeredQuests],
  });
}

export function resetQuests(): void {
  patch({
    activeQuests: [],
    completedQuests: [],
    triggeredQuests: [],
    questGraph: null,
    events: { ...EMPTY_QUEST_EVENTS },
    questXpEarned: 0,
  });
}
