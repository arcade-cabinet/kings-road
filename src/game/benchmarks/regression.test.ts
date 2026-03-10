/**
 * Performance regression tests.
 *
 * These are regular Vitest tests (not bench) so they run in CI alongside
 * unit tests. Each test asserts that a critical path completes within a
 * generous time budget. Budgets are set at ~10x the observed p99 to avoid
 * flaky failures on slow CI runners while still catching large regressions.
 */
import { describe, expect, it } from 'vitest';
import type { NPCDefinition } from '../../schemas/npc.schema';
import type { NPCBlueprint } from '../../schemas/npc-blueprint.schema';
import { generateBuildingGeometry } from '../factories/building-factory';
import {
  generateChibiFromSeed,
  generateTownNPC,
} from '../factories/chibi-generator';
import {
  blueprintToChibiConfig,
  buildNPCRenderData,
  generateNPCFromArchetype,
} from '../factories/npc-factory';
import {
  DEFAULT_PACING_CONFIG,
  generatePlacements,
  generateRoadPacing,
} from '../world/pacing-engine';
import { clearRoadSpineCache, loadRoadSpine } from '../world/road-spine';
import { getTownConfig, resolveBuildingArchetype } from '../world/town-configs';
import { generateBoundary, layoutTown } from '../world/town-layout';

// --- Helpers ---

function timeMs(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

// --- Fixtures ---

const blacksmithArchetype: NPCDefinition = {
  id: 'blacksmith-pool',
  archetype: 'blacksmith',
  personality: 'Gruff, practical, proud of their craft.',
  displayTitle: 'Master Smith',
  visualIdentity: {
    bodyBuild: { heightRange: [0.85, 1.0], widthRange: [1.1, 1.3] },
    clothPalette: {
      primary: '#4a3020',
      secondary: '#2b1d12',
      variations: ['#3a2515', '#5a4030'],
    },
    signatureAccessories: ['leather_apron'],
    optionalAccessories: ['hammer', 'tongs', 'bandana'],
  },
  faceSlots: {
    skinToneRange: [0, 4],
    eyeColors: ['brown', 'gray'],
    hairStyles: ['bald', 'short'],
    hairColors: ['#1a1a1a', '#4a3020', '#888888'],
    facialHairOptions: ['stubble', 'full_beard'],
  },
  behavior: {
    idleStyle: 'working',
    interactionVerb: 'TRADE',
    walkNodes: false,
  },
  namePool: [
    'Cedric',
    'Haldric',
    'Brynn',
    'Osric',
    'Wulfgar',
    'Ingrid',
    'Torben',
  ],
  greetingPool: [
    {
      text: 'The forge runs hot today. What brings you to my anvil, traveller?',
    },
    { text: 'Steel speaks truer than words. Tell me what you need shaped.' },
    { text: 'Mind the sparks, friend. I can mend what ails your gear.' },
  ],
};

const testBlueprint: NPCBlueprint = {
  id: 'aldric',
  name: 'Aldric',
  archetype: 'blacksmith',
  fixed: true,
  bodyBuild: { height: 0.85, width: 1.25 },
  face: {
    skinTone: 3,
    eyeColor: 'brown',
    hairStyle: 'bald',
    hairColor: '#1a1a1a',
    facialHair: 'full_beard',
  },
  accessories: ['leather_apron', 'hammer'],
  clothPalette: { primary: '#4a3320', secondary: '#2b1d12' },
  behavior: { idleStyle: 'working', interactionVerb: 'TALK', walkNodes: false },
};

// --- Regression thresholds (ms) ---
// Set generously to avoid flakes on CI but catch >10x regressions.

describe('performance regression: chibi generator', () => {
  it('generates 100 chibis from string seeds in <50ms', () => {
    const elapsed = timeMs(() => {
      for (let i = 0; i < 100; i++) {
        generateChibiFromSeed(`hero_${i}`);
      }
    });
    expect(elapsed).toBeLessThan(50);
  });

  it('generates 50 town NPCs in <50ms', () => {
    const roles = [
      'guard',
      'merchant',
      'priest',
      'blacksmith',
      'bard',
      'villager',
    ] as const;
    const elapsed = timeMs(() => {
      for (let i = 0; i < 50; i++) {
        generateTownNPC('millbrook', i, roles[i % roles.length]);
      }
    });
    expect(elapsed).toBeLessThan(50);
  });
});

describe('performance regression: NPC factory', () => {
  it('generates 50 NPCs from archetype in <50ms', () => {
    const elapsed = timeMs(() => {
      for (let i = 0; i < 50; i++) {
        generateNPCFromArchetype(blacksmithArchetype, i * 31);
      }
    });
    expect(elapsed).toBeLessThan(50);
  });

  it('converts 100 blueprints to chibi config in <10ms', () => {
    const elapsed = timeMs(() => {
      for (let i = 0; i < 100; i++) {
        blueprintToChibiConfig(testBlueprint);
      }
    });
    expect(elapsed).toBeLessThan(10);
  });

  it('builds NPC render data in <5ms', () => {
    const elapsed = timeMs(() => {
      buildNPCRenderData(testBlueprint);
    });
    expect(elapsed).toBeLessThan(5);
  });
});

describe('performance regression: building factory', () => {
  it('generates geometry for all 14 archetypes in <5ms', () => {
    const archetypeIds = [
      'tavern',
      'cottage',
      'chapel',
      'smithy',
      'market_stall',
      'house_large',
      'guard_post',
      'stable',
      'manor',
      'temple',
      'barracks',
      'library',
      'watchtower',
      'prison',
    ];
    const elapsed = timeMs(() => {
      for (const id of archetypeIds) {
        const arch = resolveBuildingArchetype(id);
        if (arch) generateBuildingGeometry(arch);
      }
    });
    expect(elapsed).toBeLessThan(5);
  });
});

describe('performance regression: town layout', () => {
  it('layouts all 6 towns in <5ms', () => {
    const towns = [
      { cx: 0, cz: 0 },
      { cx: 0, cz: 50 },
      { cx: 0, cz: 100 },
      { cx: 0, cz: 141 },
      { cx: 0, cz: 175 },
      { cx: 0, cz: 233 },
    ];
    const elapsed = timeMs(() => {
      for (const t of towns) {
        const config = getTownConfig(t.cx, t.cz)!;
        layoutTown(config, t.cx * 120, t.cz * 120);
      }
    });
    expect(elapsed).toBeLessThan(5);
  });

  it('full town pipeline (layout + boundary) for all 6 in <5ms', () => {
    const towns = [
      { cx: 0, cz: 0 },
      { cx: 0, cz: 50 },
      { cx: 0, cz: 100 },
      { cx: 0, cz: 141 },
      { cx: 0, cz: 175 },
      { cx: 0, cz: 233 },
    ];
    const elapsed = timeMs(() => {
      for (const t of towns) {
        const config = getTownConfig(t.cx, t.cz)!;
        layoutTown(config, t.cx * 120, t.cz * 120);
        generateBoundary(config, t.cx * 120, t.cz * 120);
      }
    });
    expect(elapsed).toBeLessThan(5);
  });
});

describe('performance regression: pacing engine', () => {
  it('generates placements for full road (28000 units) in <5ms', () => {
    const elapsed = timeMs(() => {
      generatePlacements(28000, DEFAULT_PACING_CONFIG, 'regression-seed');
    });
    expect(elapsed).toBeLessThan(5);
  });

  it('generateRoadPacing with Zod validation in <10ms', () => {
    const elapsed = timeMs(() => {
      generateRoadPacing(28000, DEFAULT_PACING_CONFIG, 'regression-seed');
    });
    expect(elapsed).toBeLessThan(10);
  });

  it('generates placements for 10 seeds in <20ms', () => {
    const elapsed = timeMs(() => {
      for (let i = 0; i < 10; i++) {
        generatePlacements(28000, DEFAULT_PACING_CONFIG, `seed-${i}`);
      }
    });
    expect(elapsed).toBeLessThan(20);
  });

  it('high-density pacing (tight intervals) in <20ms', () => {
    const denseConfig = {
      ...DEFAULT_PACING_CONFIG,
      ambientInterval: [50, 100] as [number, number],
      minorInterval: [100, 200] as [number, number],
      majorInterval: [200, 400] as [number, number],
    };
    const elapsed = timeMs(() => {
      generatePlacements(28000, denseConfig, 'dense-regression');
    });
    expect(elapsed).toBeLessThan(20);
  });
});

describe('performance regression: road spine parsing', () => {
  it('loadRoadSpine uncached (Zod parse) in <5ms', () => {
    clearRoadSpineCache();
    const elapsed = timeMs(() => {
      loadRoadSpine();
    });
    expect(elapsed).toBeLessThan(5);
  });
});
