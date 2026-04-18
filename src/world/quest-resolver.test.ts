import { describe, expect, it } from 'vitest';
import type { QuestDefinition } from '@/schemas/quest.schema';
import {
  resolveQuest,
  resolveQuestGraph,
  validateQuestGraph,
} from './quest-resolver';

// --- Test fixtures ---

const BRANCHING_QUEST: QuestDefinition = {
  id: 'test-branching',
  tier: 'meso',
  title: 'The Branching Test',
  estimatedMinutes: 20,
  anchorAffinity: 'home',
  trigger: { type: 'anchor', anchorId: 'home' },
  branches: {
    A: {
      label: 'Take the left path',
      steps: [
        {
          id: 'a-01',
          type: 'dialogue',
          dialogueMinWords: 15,
          dialogueMaxWords: 80,
        },
        {
          id: 'a-02',
          type: 'travel',
          dialogueMinWords: 15,
          dialogueMaxWords: 80,
        },
      ],
      reward: { type: 'item', itemId: 'branch-a-reward' },
    },
    B: {
      label: 'Take the right path',
      steps: [
        {
          id: 'b-01',
          type: 'investigate',
          dialogueMinWords: 15,
          dialogueMaxWords: 80,
        },
        {
          id: 'b-02',
          type: 'encounter',
          dialogueMinWords: 15,
          dialogueMaxWords: 80,
        },
        {
          id: 'b-03',
          type: 'dialogue',
          dialogueMinWords: 15,
          dialogueMaxWords: 80,
        },
      ],
      reward: { type: 'modifier', modifierId: 'branch-b-modifier' },
    },
  },
  reward: { type: 'item', itemId: 'quest-level-reward' },
} as unknown as QuestDefinition;

const LINEAR_QUEST: QuestDefinition = {
  id: 'test-linear',
  tier: 'micro',
  title: 'The Linear Test',
  estimatedMinutes: 5,
  anchorAffinity: 'home',
  trigger: { type: 'anchor', anchorId: 'home' },
  steps: [
    { id: 's-01', type: 'fetch', dialogueMinWords: 15, dialogueMaxWords: 80 },
    {
      id: 's-02',
      type: 'dialogue',
      dialogueMinWords: 15,
      dialogueMaxWords: 80,
    },
  ],
  reward: { type: 'item', itemId: 'linear-reward' },
} as unknown as QuestDefinition;

const QUEST_WITH_PREREQS: QuestDefinition = {
  id: 'test-with-prereqs',
  tier: 'micro',
  title: 'Has Prerequisites',
  estimatedMinutes: 10,
  anchorAffinity: 'home',
  trigger: { type: 'prerequisite', questId: 'test-linear' },
  prerequisites: ['test-linear', 'test-branching'],
  steps: [
    { id: 'p-01', type: 'travel', dialogueMinWords: 15, dialogueMaxWords: 80 },
  ],
  reward: { type: 'currency', amount: 100 },
} as unknown as QuestDefinition;

const QUEST_WITH_BAD_PREREQ: QuestDefinition = {
  id: 'test-bad-prereq',
  tier: 'micro',
  title: 'Bad Prerequisite',
  estimatedMinutes: 5,
  anchorAffinity: 'home',
  trigger: { type: 'anchor', anchorId: 'home' },
  prerequisites: ['nonexistent-quest'],
  steps: [
    { id: 'x-01', type: 'fetch', dialogueMinWords: 15, dialogueMaxWords: 80 },
  ],
  reward: { type: 'item', itemId: 'nothing' },
} as unknown as QuestDefinition;

const SEED_A = 'test-seed-alpha';

// --- Tests ---

describe('resolveQuest', () => {
  it('is deterministic: same seed always produces the same branch', () => {
    const r1 = resolveQuest(BRANCHING_QUEST, SEED_A);
    const r2 = resolveQuest(BRANCHING_QUEST, SEED_A);

    expect(r1.branch).toBe(r2.branch);
    expect(r1.steps.length).toBe(r2.steps.length);
    expect(r1.rewards).toEqual(r2.rewards);
  });

  it('selects A or B for branching quests', () => {
    const resolved = resolveQuest(BRANCHING_QUEST, SEED_A);
    expect(['A', 'B']).toContain(resolved.branch);
  });

  it('uses steps from the chosen branch', () => {
    const resolved = resolveQuest(BRANCHING_QUEST, SEED_A);

    if (resolved.branch === 'A') {
      expect(resolved.steps.length).toBe(2);
      expect(resolved.steps[0].id).toBe('a-01');
    } else {
      expect(resolved.steps.length).toBe(3);
      expect(resolved.steps[0].id).toBe('b-01');
    }
  });

  it('combines quest-level and branch-level rewards', () => {
    const resolved = resolveQuest(BRANCHING_QUEST, SEED_A);
    // Should have the quest-level reward plus the branch reward
    expect(resolved.rewards.length).toBe(2);
    expect(resolved.rewards[0]).toEqual({
      type: 'item',
      itemId: 'quest-level-reward',
    });
  });

  it('passes linear quests through with no branch', () => {
    const resolved = resolveQuest(LINEAR_QUEST, SEED_A);

    expect(resolved.branch).toBeUndefined();
    expect(resolved.steps.length).toBe(2);
    expect(resolved.steps[0].id).toBe('s-01');
    expect(resolved.steps[1].id).toBe('s-02');
  });

  it('includes quest-level reward for linear quests', () => {
    const resolved = resolveQuest(LINEAR_QUEST, SEED_A);
    expect(resolved.rewards).toEqual([
      { type: 'item', itemId: 'linear-reward' },
    ]);
  });

  it('preserves quest metadata', () => {
    const resolved = resolveQuest(BRANCHING_QUEST, SEED_A);
    expect(resolved.id).toBe('test-branching');
    expect(resolved.title).toBe('The Branching Test');
    expect(resolved.tier).toBe('meso');
    expect(resolved.anchorAffinity).toBe('home');
    expect(resolved.trigger).toEqual({ type: 'anchor', anchorId: 'home' });
  });

  it('resolves prerequisites from the definition', () => {
    const resolved = resolveQuest(QUEST_WITH_PREREQS, SEED_A);
    expect(resolved.prerequisites).toEqual(['test-linear', 'test-branching']);
  });

  it('defaults prerequisites to empty array', () => {
    const resolved = resolveQuest(LINEAR_QUEST, SEED_A);
    expect(resolved.prerequisites).toEqual([]);
  });

  it('handles quest with no branches and no steps gracefully', () => {
    const emptyQuest: QuestDefinition = {
      id: 'test-empty',
      tier: 'micro',
      title: 'Empty Quest',
      estimatedMinutes: 1,
      anchorAffinity: 'home',
      trigger: { type: 'anchor', anchorId: 'home' },
      reward: { type: 'currency', amount: 1 },
    } as unknown as QuestDefinition;

    const resolved = resolveQuest(emptyQuest, SEED_A);
    expect(resolved.steps).toEqual([]);
    expect(resolved.branch).toBeUndefined();
  });
});

describe('resolveQuestGraph', () => {
  const allQuests = [BRANCHING_QUEST, LINEAR_QUEST, QUEST_WITH_PREREQS];

  it('is deterministic: same seed produces identical graph', () => {
    const g1 = resolveQuestGraph(allQuests, SEED_A);
    const g2 = resolveQuestGraph(allQuests, SEED_A);

    expect(g1.seed).toBe(g2.seed);
    expect(g1.quests.length).toBe(g2.quests.length);

    for (let i = 0; i < g1.quests.length; i++) {
      expect(g1.quests[i].branch).toBe(g2.quests[i].branch);
      expect(g1.quests[i].steps.length).toBe(g2.quests[i].steps.length);
    }
  });

  it('different seeds can produce different branch choices', () => {
    // Run many seeds to ensure at least one branch differs
    const seeds = Array.from({ length: 20 }, (_, i) => `seed-variation-${i}`);
    const branches = seeds.map((s) => resolveQuest(BRANCHING_QUEST, s).branch);

    const hasA = branches.includes('A');
    const hasB = branches.includes('B');
    // With 20 seeds it's statistically near-certain both branches appear
    expect(hasA).toBe(true);
    expect(hasB).toBe(true);
  });

  it('resolves all quests in the input', () => {
    const graph = resolveQuestGraph(allQuests, SEED_A);
    expect(graph.quests.length).toBe(3);
  });

  it('stores the seed phrase', () => {
    const graph = resolveQuestGraph(allQuests, SEED_A);
    expect(graph.seed).toBe(SEED_A);
  });

  it('provides byId lookup', () => {
    const graph = resolveQuestGraph(allQuests, SEED_A);
    const linear = graph.byId.get('test-linear');
    expect(linear).toBeDefined();
    expect(linear?.title).toBe('The Linear Test');
  });

  it('byId returns undefined for unknown quest', () => {
    const graph = resolveQuestGraph(allQuests, SEED_A);
    expect(graph.byId.get('nonexistent')).toBeUndefined();
  });
});

describe('validateQuestGraph', () => {
  it('returns no errors for a valid graph', () => {
    const graph = resolveQuestGraph(
      [BRANCHING_QUEST, LINEAR_QUEST, QUEST_WITH_PREREQS],
      SEED_A,
    );
    const errors = validateQuestGraph(graph);
    expect(errors).toEqual([]);
  });

  it('detects missing prerequisite references', () => {
    const graph = resolveQuestGraph(
      [BRANCHING_QUEST, QUEST_WITH_BAD_PREREQ],
      SEED_A,
    );
    const errors = validateQuestGraph(graph);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('nonexistent-quest');
    expect(errors[0]).toContain('does not exist');
  });

  it('detects duplicate quest ids', () => {
    const dupeQuest = { ...LINEAR_QUEST } as unknown as QuestDefinition;
    const graph = resolveQuestGraph([LINEAR_QUEST, dupeQuest], SEED_A);
    const errors = validateQuestGraph(graph);
    expect(errors.some((e) => e.includes('Duplicate'))).toBe(true);
  });
});

describe('resolveQuestGraph with real content', () => {
  // Integration test using the actual quest registry
  it('resolves all bundled quests without errors', async () => {
    const { getAllQuests } = await import('../stores/questStore');
    const quests = getAllQuests();
    const graph = resolveQuestGraph(quests, 'integration-test-seed');
    const errors = validateQuestGraph(graph);

    expect(errors).toEqual([]);
    expect(graph.quests.length).toBe(quests.length);

    // Every branching quest should have a resolved branch
    for (const rq of graph.quests) {
      const def = quests.find((q) => q.id === rq.id)!;
      if (def.branches) {
        expect(['A', 'B']).toContain(rq.branch);
        expect(rq.steps.length).toBeGreaterThan(0);
      } else {
        expect(rq.branch).toBeUndefined();
      }
    }
  });
});
