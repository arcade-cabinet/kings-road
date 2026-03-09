import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from './game-config.schema';

describe('Game Config Schema', () => {
  const minimalValidConfig = {
    version: '0.1.0',
    name: 'kings-road' as const,
    world: {
      totalDistance: 30000,
      anchors: [
        {
          id: 'home',
          name: 'Ashford',
          type: 'VILLAGE_FRIENDLY',
          distanceFromStart: 0,
          mainQuestChapter: 'chapter-00',
          description: 'Your home town, a quiet farming village.',
          features: ['home', 'tavern'],
        },
        {
          id: 'anchor-01',
          name: 'Millbrook',
          type: 'VILLAGE_FRIENDLY',
          distanceFromStart: 6000,
          mainQuestChapter: 'chapter-01',
          description: "A market town along the King's Road.",
          features: ['tavern', 'market'],
        },
      ],
    },
    pacing: {
      ambientInterval: [50, 150],
      minorInterval: [200, 400],
      majorInterval: [800, 1500],
      questMicroInterval: [300, 600],
      questMesoInterval: [1000, 2000],
      questMacroInterval: [3000, 6000],
      anchorInterval: [4000, 8000],
    },
    mainQuest: [
      {
        id: 'main-chapter-00',
        tier: 'macro',
        title: 'The Call to the Road',
        estimatedMinutes: 30,
        anchorAffinity: 'home',
        trigger: { type: 'anchor', anchorId: 'home' },
        branches: {
          A: {
            label: 'Accept the quest willingly',
            steps: [
              {
                id: 'a-01',
                type: 'dialogue',
                npcArchetype: 'priest',
                dialogue:
                  'The road awaits you, pilgrim. Seek the Grail and restore light to these lands once more.',
                dialogueMinWords: 10,
                dialogueMaxWords: 80,
              },
            ],
          },
          B: {
            label: 'Reluctantly depart',
            steps: [
              {
                id: 'b-01',
                type: 'dialogue',
                npcArchetype: 'farmer',
                dialogue:
                  'You must go, child. The signs are clear and the road will not wait much longer for you.',
                dialogueMinWords: 10,
                dialogueMaxWords: 80,
              },
            ],
          },
        },
        reward: { type: 'unlock', unlockId: 'road-access' },
      },
    ],
    sideQuests: {
      macro: [],
      meso: [],
      micro: [],
    },
    npcs: [
      {
        id: 'npc-innkeeper-01',
        archetype: 'innkeeper',
        namePool: ['Martha', 'Bessie', 'Elspeth'],
        greetingPool: [
          {
            text: 'Welcome, weary traveler! Come sit by the fire and rest your bones a while.',
          },
          {
            text: 'Ale or mead? Either will warm your spirits on this cold evening tonight.',
          },
        ],
      },
    ],
    features: [
      {
        id: 'feat-milestone-01',
        tier: 'ambient',
        name: "King's Milestone",
        description:
          'A carved stone marker showing distance to the next town along the road.',
        visualType: 'milestone',
      },
    ],
    items: [
      {
        id: 'merchant-map',
        name: "Merchant's Map",
        description:
          "A hand-drawn map showing hidden paths along the King's Road.",
        type: 'key_item',
      },
    ],
    encounters: [
      {
        id: 'poisoner-fight',
        name: 'Confronting the Poisoner',
        type: 'combat',
        difficulty: 4,
        description:
          'A tense confrontation with the person responsible for poisoning the well.',
      },
    ],
  };

  it('validates a minimal valid game config', () => {
    expect(() => GameConfigSchema.parse(minimalValidConfig)).not.toThrow();
  });

  it('rejects config with invalid version format', () => {
    const invalid = { ...minimalValidConfig, version: 'v1' };
    expect(() => GameConfigSchema.parse(invalid)).toThrow();
  });

  it('rejects config with wrong name', () => {
    const invalid = { ...minimalValidConfig, name: 'aetheria' };
    expect(() => GameConfigSchema.parse(invalid)).toThrow();
  });

  it('rejects config with empty mainQuest array', () => {
    const invalid = { ...minimalValidConfig, mainQuest: [] };
    expect(() => GameConfigSchema.parse(invalid)).toThrow();
  });

  it('validates config type inference', () => {
    const config = GameConfigSchema.parse(minimalValidConfig);
    expect(config.name).toBe('kings-road');
    expect(config.world.anchors).toHaveLength(2);
    expect(config.mainQuest).toHaveLength(1);
    expect(config.pacing.walkSpeed).toBe(4);
    expect(config.pacing.sprintSpeed).toBe(7);
  });
});
