/**
 * Quest narrative seed resolver.
 *
 * At New Game time, runs the seed phrase through all quest A/B variants
 * to produce a deterministic narrative spine. The same seed always
 * produces the same story.
 */

import type {
  QuestBranch,
  QuestDefinition,
  QuestReward,
  QuestStep,
} from '@/schemas/quest.schema';
import { createRng } from '@/utils/random';

/** A quest with its branch resolved and steps flattened. */
export interface ResolvedQuest {
  id: string;
  title: string;
  tier: QuestDefinition['tier'];
  anchorAffinity: string;
  trigger: QuestDefinition['trigger'];
  /** 'A' | 'B' for branching quests, undefined for linear (micro) quests */
  branch: 'A' | 'B' | undefined;
  /** The resolved step sequence (from the chosen branch or linear steps) */
  steps: QuestStep[];
  /** Combined rewards: quest-level + branch-level */
  rewards: QuestReward[];
  prerequisites: string[];
}

/** The full deterministic narrative spine for a game seed. */
export interface QuestGraph {
  seed: string;
  quests: ResolvedQuest[];
  /** Lookup by quest id */
  byId: Map<string, ResolvedQuest>;
}

/**
 * Resolve all quest A/B branches using seeded RNG.
 *
 * For each quest with branches, the seed determines whether variant A or B
 * is chosen. Linear quests (micro tier with `steps`) pass through unchanged.
 *
 * @param quests    All quest definitions from the content trove
 * @param seedPhrase  The realm seed phrase from New Game
 * @returns A deterministic QuestGraph
 */
export function resolveQuestGraph(
  quests: QuestDefinition[],
  seedPhrase: string,
): QuestGraph {
  const resolved: ResolvedQuest[] = [];
  const byId = new Map<string, ResolvedQuest>();

  for (const quest of quests) {
    const rq = resolveQuest(quest, seedPhrase);
    resolved.push(rq);
    byId.set(rq.id, rq);
  }

  return { seed: seedPhrase, quests: resolved, byId };
}

/**
 * Resolve a single quest's branch using seeded RNG.
 */
export function resolveQuest(
  quest: QuestDefinition,
  seedPhrase: string,
): ResolvedQuest {
  let branch: 'A' | 'B' | undefined;
  let steps: QuestStep[];
  const rewards: QuestReward[] = [];

  if (quest.reward) {
    rewards.push(quest.reward);
  }

  if (quest.branches) {
    // Use seeded RNG keyed to quest id + seed phrase for determinism
    const rng = createRng(`${seedPhrase}:quest:${quest.id}`);
    branch = rng() < 0.5 ? 'A' : 'B';

    const chosenBranch: QuestBranch = quest.branches[branch];
    steps = chosenBranch.steps;

    if (chosenBranch.reward) {
      rewards.push(chosenBranch.reward);
    }
  } else if (quest.steps) {
    steps = quest.steps;
  } else {
    steps = [];
  }

  return {
    id: quest.id,
    title: quest.title,
    tier: quest.tier,
    anchorAffinity: quest.anchorAffinity,
    trigger: quest.trigger,
    branch,
    steps,
    rewards,
    prerequisites: quest.prerequisites ?? [],
  };
}

/**
 * Validate referential integrity of a resolved quest graph.
 *
 * Checks:
 * - All prerequisite quest ids exist in the graph
 * - Quest ids are unique
 *
 * Returns an array of error strings (empty = valid).
 */
export function validateQuestGraph(graph: QuestGraph): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const quest of graph.quests) {
    // Uniqueness
    if (ids.has(quest.id)) {
      errors.push(`Duplicate quest id: ${quest.id}`);
    }
    ids.add(quest.id);
  }

  // Prerequisite references
  for (const quest of graph.quests) {
    for (const prereq of quest.prerequisites) {
      if (!ids.has(prereq)) {
        errors.push(
          `Quest "${quest.id}" references prerequisite "${prereq}" which does not exist`,
        );
      }
    }
  }

  return errors;
}
