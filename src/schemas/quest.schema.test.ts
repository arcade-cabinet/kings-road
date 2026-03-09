import { describe, expect, it } from 'vitest';
import {
  QuestBranchSchema,
  QuestDefinitionSchema,
  QuestStepSchema,
} from './quest.schema';

describe('Quest Schema', () => {
  it('validates a micro quest', () => {
    const quest = {
      id: 'micro-lost-merchant',
      tier: 'micro',
      title: 'The Lost Merchant',
      estimatedMinutes: 8,
      anchorAffinity: 'anchor-01',
      trigger: { type: 'roadside', distanceRange: [5000, 7000] },
      steps: [
        {
          id: 'step-01',
          type: 'dialogue',
          npcArchetype: 'merchant',
          dialogueMinWords: 20,
          dialogueMaxWords: 80,
          dialogue:
            'Good traveler, I have lost my way. The road forked and I took the wrong path. Could you escort me to Millbrook?',
        },
        {
          id: 'step-02',
          type: 'escort',
          destination: 'anchor-01',
          description: 'Escort the merchant to Millbrook.',
        },
      ],
      reward: { type: 'item', itemId: 'merchant-map' },
    };
    expect(() => QuestDefinitionSchema.parse(quest)).not.toThrow();
  });

  it('validates a meso quest with A/B branches', () => {
    const quest = {
      id: 'meso-poisoned-well',
      tier: 'meso',
      title: 'The Poisoned Well',
      estimatedMinutes: 25,
      anchorAffinity: 'anchor-02',
      trigger: { type: 'anchor', anchorId: 'anchor-02' },
      branches: {
        A: {
          label: 'Confront the poisoner',
          steps: [
            {
              id: 'a-01',
              type: 'investigate',
              description: 'Search the well house for clues.',
              dialogueMinWords: 15,
              dialogueMaxWords: 60,
            },
            { id: 'a-02', type: 'encounter', encounterId: 'poisoner-fight' },
          ],
          reward: { type: 'modifier', modifierId: 'village-hero' },
        },
        B: {
          label: 'Find the cure',
          steps: [
            {
              id: 'b-01',
              type: 'fetch',
              itemId: 'moonpetal',
              description: 'Find moonpetal herbs in the forest.',
              dialogueMinWords: 15,
              dialogueMaxWords: 60,
            },
            {
              id: 'b-02',
              type: 'dialogue',
              npcArchetype: 'healer',
              dialogue:
                'You found the moonpetal! Let me brew the antidote right away for the village folk.',
              dialogueMinWords: 15,
              dialogueMaxWords: 60,
            },
          ],
          reward: { type: 'modifier', modifierId: 'village-healer' },
        },
      },
      reward: { type: 'item', itemId: 'well-keeper-ring' },
    };
    expect(() => QuestDefinitionSchema.parse(quest)).not.toThrow();
  });

  it('rejects quest with too-short dialogue', () => {
    const quest = {
      id: 'bad',
      tier: 'micro',
      title: 'Bad Quest',
      estimatedMinutes: 5,
      anchorAffinity: 'anchor-01',
      trigger: { type: 'roadside', distanceRange: [0, 100] },
      steps: [
        {
          id: 'step-01',
          type: 'dialogue',
          npcArchetype: 'merchant',
          dialogue: 'Hi.',
          dialogueMinWords: 20,
          dialogueMaxWords: 80,
        },
      ],
      reward: { type: 'item', itemId: 'nothing' },
    };
    expect(() => QuestDefinitionSchema.parse(quest)).toThrow();
  });

  it('rejects meso quest without branches', () => {
    const quest = {
      id: 'meso-no-branches',
      tier: 'meso',
      title: 'Missing Branches',
      estimatedMinutes: 20,
      anchorAffinity: 'anchor-01',
      trigger: { type: 'anchor', anchorId: 'anchor-01' },
      steps: [
        {
          id: 'step-01',
          type: 'dialogue',
          npcArchetype: 'merchant',
          dialogue:
            'This is a long enough dialogue to pass the minimum word count requirement for the step.',
          dialogueMinWords: 15,
          dialogueMaxWords: 80,
        },
      ],
      reward: { type: 'item', itemId: 'something' },
    };
    expect(() => QuestDefinitionSchema.parse(quest)).toThrow(
      'Meso and macro quests must have A/B branches',
    );
  });

  it('rejects quest with neither steps nor branches', () => {
    const quest = {
      id: 'empty-quest',
      tier: 'micro',
      title: 'Empty Quest',
      estimatedMinutes: 5,
      anchorAffinity: 'anchor-01',
      trigger: { type: 'roadside', distanceRange: [0, 100] },
      reward: { type: 'item', itemId: 'nothing' },
    };
    expect(() => QuestDefinitionSchema.parse(quest)).toThrow(
      'Quest must have either steps or branches',
    );
  });

  it('validates quest step with dialogue word count validation', () => {
    const step = {
      id: 'step-01',
      type: 'dialogue',
      npcArchetype: 'merchant',
      dialogueMinWords: 5,
      dialogueMaxWords: 80,
      dialogue: 'Hello there good traveler, welcome to our village.',
    };
    expect(() => QuestStepSchema.parse(step)).not.toThrow();
  });

  it('validates a quest branch', () => {
    const branch = {
      label: 'Take the peaceful path',
      steps: [
        {
          id: 'step-01',
          type: 'travel',
          description: 'Walk through the meadow.',
        },
      ],
      reward: { type: 'item', itemId: 'flower-crown' },
    };
    expect(() => QuestBranchSchema.parse(branch)).not.toThrow();
  });

  it('validates prerequisite trigger type', () => {
    const quest = {
      id: 'sequel-quest',
      tier: 'micro',
      title: 'The Sequel',
      estimatedMinutes: 10,
      anchorAffinity: 'anchor-01',
      trigger: { type: 'prerequisite', questId: 'micro-lost-merchant' },
      steps: [
        {
          id: 'step-01',
          type: 'dialogue',
          npcArchetype: 'merchant',
          dialogue:
            'Thank you for your help before, traveler. I have another task for you this time around.',
          dialogueMinWords: 15,
          dialogueMaxWords: 80,
        },
      ],
      reward: { type: 'currency', amount: 50 },
    };
    expect(() => QuestDefinitionSchema.parse(quest)).not.toThrow();
  });
});
