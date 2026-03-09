import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  calculateSubstanceScore,
  checkQuestBranches,
  checkReferentialIntegrity,
  estimateQuestDuration,
  findJsonFiles,
  runValidation,
  validateFile,
} from '../../scripts/validate-trove';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const VALID_ROAD_SPINE = {
  totalDistance: 30000,
  anchors: [
    {
      id: 'home',
      name: 'Ashford',
      type: 'VILLAGE_FRIENDLY',
      distanceFromStart: 0,
      mainQuestChapter: 'chapter-00',
      description:
        'Your home town, a quiet farming village at the foot of gentle hills.',
      features: ['home', 'tavern', 'blacksmith'],
    },
    {
      id: 'anchor-01',
      name: 'Millbrook',
      type: 'VILLAGE_FRIENDLY',
      distanceFromStart: 6000,
      mainQuestChapter: 'chapter-01',
      description:
        "A market town where the King's Road crosses the River Mill.",
      features: ['tavern', 'market', 'chapel'],
    },
  ],
};

const VALID_MICRO_QUEST = {
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
      dialogueMinWords: 10,
      dialogueMaxWords: 80,
      dialogue:
        'Good traveler, I have lost my way on these winding paths. The road forked and I foolishly took the wrong turn. Could you kindly escort me to Millbrook? I will reward you handsomely for your trouble.',
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

const VALID_MESO_QUEST = {
  id: 'meso-poisoned-well',
  tier: 'meso',
  title: 'The Poisoned Well',
  estimatedMinutes: 25,
  anchorAffinity: 'anchor-01',
  trigger: { type: 'anchor', anchorId: 'anchor-01' },
  branches: {
    A: {
      label: 'Confront the poisoner',
      steps: [
        {
          id: 'a-01',
          type: 'investigate',
          description: 'Search the well house for clues.',
          dialogueMinWords: 10,
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
          dialogueMinWords: 10,
          dialogueMaxWords: 60,
        },
        {
          id: 'b-02',
          type: 'dialogue',
          npcArchetype: 'healer',
          dialogue:
            'You found the moonpetal! Let me brew the antidote right away. The village will be saved thanks to your quick thinking and brave heart.',
          dialogueMinWords: 10,
          dialogueMaxWords: 60,
        },
      ],
      reward: { type: 'modifier', modifierId: 'village-healer' },
    },
  },
  reward: { type: 'item', itemId: 'well-keeper-ring' },
};

const VALID_NPC = {
  id: 'npc-merchant',
  archetype: 'merchant',
  namePool: ['Edwin', 'Godric', 'Aldric'],
  greetingPool: [
    {
      text: 'Welcome, traveler! Have a look at my fine wares from across the kingdom.',
    },
    {
      text: 'Good day to you! The road has been kind today, and so shall I be.',
    },
  ],
};

const VALID_FEATURE = {
  id: 'feature-stone-bridge',
  tier: 'minor',
  name: 'Old Stone Bridge',
  description: 'A moss-covered stone bridge spanning a gentle stream.',
  visualType: 'stone_bridge',
  interactable: false,
};

// ---------------------------------------------------------------------------
// Helpers for temporary content directories
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trove-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeContentFile(relPath: string, data: unknown): void {
  const fullPath = path.join(tmpDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('findJsonFiles', () => {
  it('finds JSON files recursively', () => {
    writeContentFile('world/road-spine.json', VALID_ROAD_SPINE);
    writeContentFile('main-quest/chapter-01.json', VALID_MICRO_QUEST);
    writeContentFile('npcs/merchant.json', VALID_NPC);

    const files = findJsonFiles(tmpDir);
    expect(files).toHaveLength(3);
    expect(files.every((f) => f.endsWith('.json'))).toBe(true);
  });

  it('skips dotfiles', () => {
    writeContentFile('.validation-report.json', { test: true });
    writeContentFile('world/road-spine.json', VALID_ROAD_SPINE);

    const files = findJsonFiles(tmpDir);
    expect(files).toHaveLength(1);
  });

  it('returns empty array for missing directory', () => {
    const files = findJsonFiles('/nonexistent/dir');
    expect(files).toHaveLength(0);
  });
});

describe('validateFile — road spine', () => {
  it('passes valid road spine', () => {
    writeContentFile('world/road-spine.json', VALID_ROAD_SPINE);
    const index = {
      anchorIds: new Set<string>(),
      questIds: new Set<string>(),
      npcArchetypes: new Set<string>(),
      encounterIds: new Set<string>(),
      featureIds: new Set<string>(),
    };
    const result = validateFile(
      path.join(tmpDir, 'world/road-spine.json'),
      tmpDir,
      index,
    );
    expect(result.status).toBe('pass');
    expect(result.errors).toHaveLength(0);
    expect(result.contentType).toBe('road-spine');
  });

  it('fails on invalid road spine', () => {
    writeContentFile('world/road-spine.json', { totalDistance: -1 });
    const index = {
      anchorIds: new Set<string>(),
      questIds: new Set<string>(),
      npcArchetypes: new Set<string>(),
      encounterIds: new Set<string>(),
      featureIds: new Set<string>(),
    };
    const result = validateFile(
      path.join(tmpDir, 'world/road-spine.json'),
      tmpDir,
      index,
    );
    expect(result.status).toBe('fail');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('fails on malformed JSON', () => {
    const fullPath = path.join(tmpDir, 'world/bad.json');
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, '{ invalid json }');
    const index = {
      anchorIds: new Set<string>(),
      questIds: new Set<string>(),
      npcArchetypes: new Set<string>(),
      encounterIds: new Set<string>(),
      featureIds: new Set<string>(),
    };
    const result = validateFile(fullPath, tmpDir, index);
    expect(result.status).toBe('fail');
    expect(result.errors[0]).toContain('Failed to parse JSON');
  });
});

describe('validateFile — quests', () => {
  it('validates micro quest with no schema errors', () => {
    writeContentFile('side-quests/micro/lost-merchant.json', VALID_MICRO_QUEST);
    const index = {
      anchorIds: new Set(['anchor-01']),
      questIds: new Set<string>(),
      npcArchetypes: new Set(['merchant']),
      encounterIds: new Set<string>(),
      featureIds: new Set<string>(),
    };
    const result = validateFile(
      path.join(tmpDir, 'side-quests/micro/lost-merchant.json'),
      tmpDir,
      index,
    );
    expect(result.status).not.toBe('fail');
    expect(result.errors).toHaveLength(0);
    expect(result.contentType).toBe('quest');
    expect(result.questDetails).toHaveLength(1);
  });

  it('validates meso quest with branches and no schema errors', () => {
    writeContentFile('side-quests/meso/poisoned-well.json', VALID_MESO_QUEST);
    const index = {
      anchorIds: new Set(['anchor-01']),
      questIds: new Set<string>(),
      npcArchetypes: new Set(['healer']),
      encounterIds: new Set<string>(),
      featureIds: new Set<string>(),
    };
    const result = validateFile(
      path.join(tmpDir, 'side-quests/meso/poisoned-well.json'),
      tmpDir,
      index,
    );
    expect(result.status).not.toBe('fail');
    expect(result.errors).toHaveLength(0);
    expect(result.questDetails?.[0].hasBranches).toBe(true);
  });

  it('validates main-quest directory', () => {
    const mainQuest = {
      ...VALID_MESO_QUEST,
      id: 'main-chapter-01',
      tier: 'macro',
    };
    writeContentFile('main-quest/chapter-01.json', mainQuest);
    const index = {
      anchorIds: new Set(['anchor-01']),
      questIds: new Set<string>(),
      npcArchetypes: new Set(['healer']),
      encounterIds: new Set<string>(),
      featureIds: new Set<string>(),
    };
    const result = validateFile(
      path.join(tmpDir, 'main-quest/chapter-01.json'),
      tmpDir,
      index,
    );
    expect(result.contentType).toBe('quest');
  });

  it('warns for unknown file location', () => {
    writeContentFile('random/file.json', { foo: 'bar' });
    const index = {
      anchorIds: new Set<string>(),
      questIds: new Set<string>(),
      npcArchetypes: new Set<string>(),
      encounterIds: new Set<string>(),
      featureIds: new Set<string>(),
    };
    const result = validateFile(
      path.join(tmpDir, 'random/file.json'),
      tmpDir,
      index,
    );
    expect(result.status).toBe('warn');
    expect(result.contentType).toBe('unknown');
  });
});

describe('validateFile — NPCs', () => {
  it('passes valid NPC', () => {
    writeContentFile('npcs/merchant.json', VALID_NPC);
    const index = {
      anchorIds: new Set<string>(),
      questIds: new Set<string>(),
      npcArchetypes: new Set<string>(),
      encounterIds: new Set<string>(),
      featureIds: new Set<string>(),
    };
    const result = validateFile(
      path.join(tmpDir, 'npcs/merchant.json'),
      tmpDir,
      index,
    );
    expect(result.status).toBe('pass');
    expect(result.contentType).toBe('npc');
  });
});

describe('validateFile — features', () => {
  it('passes valid feature', () => {
    writeContentFile('features/stone-bridge.json', VALID_FEATURE);
    const index = {
      anchorIds: new Set<string>(),
      questIds: new Set<string>(),
      npcArchetypes: new Set<string>(),
      encounterIds: new Set<string>(),
      featureIds: new Set<string>(),
    };
    const result = validateFile(
      path.join(tmpDir, 'features/stone-bridge.json'),
      tmpDir,
      index,
    );
    expect(result.status).toBe('pass');
    expect(result.contentType).toBe('feature');
  });
});

describe('estimateQuestDuration', () => {
  it('estimates dialogue steps from word count', () => {
    const quest = {
      steps: [
        {
          type: 'dialogue',
          dialogue:
            'one two three four five six seven eight nine ten ' +
            'eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty ' +
            'twentyone twentytwo twentythree twentyfour twentyfive twentysix twentyseven twentyeight twentynine thirty ' +
            'thirtyone thirtytwo thirtythree thirtyfour thirtyfive thirtysix thirtyseven thirtyeight thirtynine forty ' +
            'fortyone fortytwo fortythree fortyfour fortyfive fortysix fortyseven fortyeight fortynine fifty',
        },
      ],
    };
    const result = estimateQuestDuration(quest as Record<string, unknown>);
    // 50 words -> ~30 seconds -> 0.5 min
    expect(result.estimatedMinutes).toBeCloseTo(0.5, 1);
  });

  it('estimates travel steps at 2 min', () => {
    const quest = {
      steps: [{ type: 'travel' }],
      estimatedMinutes: 2,
    };
    const result = estimateQuestDuration(quest as Record<string, unknown>);
    expect(result.estimatedMinutes).toBe(2);
    expect(result.deviationPercent).toBe(0);
  });

  it('estimates encounter steps at 5 min', () => {
    const quest = {
      steps: [{ type: 'encounter' }],
      estimatedMinutes: 5,
    };
    const result = estimateQuestDuration(quest as Record<string, unknown>);
    expect(result.estimatedMinutes).toBe(5);
  });

  it('estimates fetch steps at 3 min', () => {
    const quest = {
      steps: [{ type: 'fetch' }],
      estimatedMinutes: 3,
    };
    const result = estimateQuestDuration(quest as Record<string, unknown>);
    expect(result.estimatedMinutes).toBe(3);
  });

  it('warns when deviation exceeds 50%', () => {
    const quest = {
      steps: [{ type: 'travel' }], // 2 min
      estimatedMinutes: 10, // declared 10 min
    };
    const result = estimateQuestDuration(quest as Record<string, unknown>);
    expect(result.warning).not.toBeNull();
    expect(result.deviationPercent).toBeGreaterThan(50);
  });

  it('includes branch steps in estimation', () => {
    const quest = {
      branches: {
        A: { steps: [{ type: 'encounter' }, { type: 'travel' }] }, // 5 + 2 = 7
        B: { steps: [{ type: 'fetch' }] }, // 3
      },
      estimatedMinutes: 10,
    };
    const result = estimateQuestDuration(quest as Record<string, unknown>);
    expect(result.estimatedMinutes).toBe(10); // 5+2+3 = 10
  });
});

describe('calculateSubstanceScore', () => {
  it('calculates dialogue density', () => {
    const quest = {
      steps: [
        {
          type: 'dialogue',
          dialogue:
            'one two three four five six seven eight nine ten eleven twelve',
        },
        { type: 'travel' },
      ],
    };
    const score = calculateSubstanceScore(quest as Record<string, unknown>);
    expect(score.totalDialogueWords).toBe(12);
    expect(score.totalSteps).toBe(2);
    expect(score.density).toBe(6);
    expect(score.belowThreshold).toBe(true); // 6 < 10
  });

  it('counts unique NPCs', () => {
    const quest = {
      steps: [
        { type: 'dialogue', npcArchetype: 'merchant' },
        { type: 'dialogue', npcArchetype: 'healer' },
        { type: 'dialogue', npcArchetype: 'merchant' },
      ],
    };
    const score = calculateSubstanceScore(quest as Record<string, unknown>);
    expect(score.uniqueNPCs).toBe(2);
  });
});

describe('checkQuestBranches', () => {
  it('returns null for micro quests (branches not required)', () => {
    const result = checkQuestBranches({ tier: 'micro', id: 'test' });
    expect(result).toBeNull();
  });

  it('warns for meso quest without branches', () => {
    const result = checkQuestBranches({
      tier: 'meso',
      id: 'test-meso',
      steps: [],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('missing A/B branches');
  });

  it('warns for macro quest without branches', () => {
    const result = checkQuestBranches({
      tier: 'macro',
      id: 'test-macro',
      steps: [],
    });
    expect(result).not.toBeNull();
    expect(result).toContain('missing A/B branches');
  });

  it('returns null for meso quest with both branches', () => {
    const result = checkQuestBranches({
      tier: 'meso',
      id: 'test-meso',
      branches: { A: { steps: [] }, B: { steps: [] } },
    });
    expect(result).toBeNull();
  });
});

describe('checkReferentialIntegrity', () => {
  it('warns on unknown prerequisite', () => {
    const quest = {
      id: 'test-quest',
      prerequisites: ['nonexistent-quest'],
    };
    const index = {
      anchorIds: new Set<string>(),
      questIds: new Set(['other-quest']),
      npcArchetypes: new Set<string>(),
      encounterIds: new Set<string>(),
      featureIds: new Set<string>(),
    };
    const warnings = checkReferentialIntegrity(quest, index);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('nonexistent-quest');
  });

  it('warns on unknown anchor affinity', () => {
    const quest = {
      id: 'test-quest',
      anchorAffinity: 'unknown-anchor',
    };
    const index = {
      anchorIds: new Set(['home', 'anchor-01']),
      questIds: new Set<string>(),
      npcArchetypes: new Set<string>(),
      encounterIds: new Set<string>(),
      featureIds: new Set<string>(),
    };
    const warnings = checkReferentialIntegrity(quest, index);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('unknown-anchor');
  });

  it('no warnings when references are valid', () => {
    const quest = {
      id: 'test-quest',
      anchorAffinity: 'anchor-01',
      prerequisites: ['other-quest'],
      steps: [{ id: 's1', npcArchetype: 'merchant' }],
    };
    const index = {
      anchorIds: new Set(['anchor-01']),
      questIds: new Set(['other-quest']),
      npcArchetypes: new Set(['merchant']),
      encounterIds: new Set<string>(),
      featureIds: new Set<string>(),
    };
    const warnings = checkReferentialIntegrity(quest, index);
    expect(warnings).toHaveLength(0);
  });
});

describe('runValidation — integration', () => {
  it('validates a full content directory', () => {
    writeContentFile('world/road-spine.json', VALID_ROAD_SPINE);
    writeContentFile('side-quests/micro/lost-merchant.json', VALID_MICRO_QUEST);
    writeContentFile('npcs/merchant.json', VALID_NPC);
    writeContentFile('features/stone-bridge.json', VALID_FEATURE);

    const report = runValidation(tmpDir);
    expect(report.summary.totalFiles).toBe(4);
    expect(report.summary.failed).toBe(0);
    expect(report.summary.totalQuests).toBe(1);
  });

  it('catches invalid content', () => {
    writeContentFile('world/road-spine.json', { totalDistance: -1 });

    const report = runValidation(tmpDir);
    expect(report.summary.failed).toBe(1);
  });

  it('reports referential integrity warnings for quests', () => {
    writeContentFile('world/road-spine.json', VALID_ROAD_SPINE);
    const questWithBadRef = {
      ...VALID_MICRO_QUEST,
      anchorAffinity: 'nonexistent-anchor',
    };
    writeContentFile('side-quests/micro/bad-ref.json', questWithBadRef);

    const report = runValidation(tmpDir);
    const questResult = report.results.find((r) => r.file.includes('bad-ref'));
    expect(
      questResult?.warnings.some((w) => w.includes('nonexistent-anchor')),
    ).toBe(true);
  });

  it('handles empty content directory', () => {
    const report = runValidation(tmpDir);
    expect(report.summary.totalFiles).toBe(0);
  });
});
