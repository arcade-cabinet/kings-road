import { bench, describe } from 'vitest';
import type { NPCDefinition } from '../../schemas/npc.schema';
import type { NPCBlueprint } from '../../schemas/npc-blueprint.schema';
import { generateBuildingGeometry } from '../factories/building-factory';
import {
  generateChibiFromSeed,
  generateTownNPC,
  hashString,
} from '../factories/chibi-generator';
import {
  blueprintToChibiConfig,
  buildNPCRenderData,
  generateNPCFromArchetype,
} from '../factories/npc-factory';
import { resolveBuildingArchetype } from '../world/town-configs';

// --- Test fixtures ---

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
  idlePool: [
    {
      text: 'This blade needs three more heats before it will hold an edge properly.',
    },
    {
      text: 'The iron sings when you get the temperature just right, you know.',
    },
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

describe('Chibi Generator', () => {
  bench(
    'hashString',
    () => {
      for (let i = 0; i < 1000; i++) {
        hashString(`npc_${i}_benchmark`);
      }
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'generateChibiFromSeed (string seed) x100',
    () => {
      for (let i = 0; i < 100; i++) {
        generateChibiFromSeed(`hero_${i}`);
      }
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'generateChibiFromSeed (numeric seed) x100',
    () => {
      for (let i = 0; i < 100; i++) {
        generateChibiFromSeed(i * 7919);
      }
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'generateTownNPC x50 (mixed roles)',
    () => {
      const roles = [
        'guard',
        'merchant',
        'priest',
        'blacksmith',
        'bard',
        'villager',
      ] as const;
      for (let i = 0; i < 50; i++) {
        generateTownNPC('millbrook', i, roles[i % roles.length]);
      }
    },
    { time: 1000, warmupTime: 200, throws: false },
  );
});

describe('NPC Factory', () => {
  bench(
    'generateNPCFromArchetype x50',
    () => {
      for (let i = 0; i < 50; i++) {
        generateNPCFromArchetype(blacksmithArchetype, i * 31);
      }
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'blueprintToChibiConfig x100',
    () => {
      for (let i = 0; i < 100; i++) {
        blueprintToChibiConfig(testBlueprint);
      }
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'buildNPCRenderData (blueprint to render)',
    () => {
      buildNPCRenderData(testBlueprint);
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'full NPC pipeline: archetype -> generate -> blueprint -> chibi',
    () => {
      const npc = generateNPCFromArchetype(blacksmithArchetype, 42);
      blueprintToChibiConfig(npc.blueprint);
    },
    { time: 1000, warmupTime: 200, throws: false },
  );
});

describe('Face Texture Creation', () => {
  bench(
    'generateFaceTexture via buildNPCRenderData x10',
    () => {
      for (let i = 0; i < 10; i++) {
        buildNPCRenderData({
          ...testBlueprint,
          face: { ...testBlueprint.face, skinTone: i % 5 },
        });
      }
    },
    { time: 1000, warmupTime: 200, throws: false },
  );
});

describe('Building Factory', () => {
  bench(
    'generateBuildingGeometry (tavern, 1 story)',
    () => {
      const archetype = resolveBuildingArchetype('tavern')!;
      generateBuildingGeometry(archetype);
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'generateBuildingGeometry (house_large, 2 stories)',
    () => {
      const archetype = resolveBuildingArchetype('house_large', {
        stories: 2,
      })!;
      generateBuildingGeometry(archetype);
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'generateBuildingGeometry all archetypes',
    () => {
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
      for (const id of archetypeIds) {
        const arch = resolveBuildingArchetype(id);
        if (arch) generateBuildingGeometry(arch);
      }
    },
    { time: 1000, warmupTime: 200, throws: false },
  );
});
