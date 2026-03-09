import { describe, expect, it } from 'vitest';
import type { NPCDefinition } from '../../schemas/npc.schema';
import type { NPCBlueprint } from '../../schemas/npc-blueprint.schema';
import { buildNPCRenderData, generateNPCFromArchetype } from './npc-factory';

const stockyBlueprint: NPCBlueprint = {
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

const slimBlueprint: NPCBlueprint = {
  id: 'tomas',
  name: 'Old Tomas',
  archetype: 'scholar',
  fixed: true,
  bodyBuild: { height: 1.1, width: 0.85 },
  face: {
    skinTone: 1,
    eyeColor: 'gray',
    hairStyle: 'short',
    hairColor: '#cccccc',
    facialHair: 'none',
  },
  accessories: ['robes', 'scroll'],
  clothPalette: { primary: '#3a3a5a' },
  behavior: { idleStyle: 'idle', interactionVerb: 'TALK', walkNodes: false },
};

describe('buildNPCRenderData', () => {
  it('scales body for stocky build', () => {
    const data = buildNPCRenderData(stockyBlueprint);
    expect(data.torsoHeight).toBeLessThan(0.7); // shorter
    expect(data.torsoRadiusTop).toBeGreaterThan(0.25); // wider
  });

  it('scales body for slim build', () => {
    const data = buildNPCRenderData(slimBlueprint);
    expect(data.torsoHeight).toBeGreaterThan(0.7); // taller
    expect(data.torsoRadiusTop).toBeLessThan(0.25); // narrower
  });

  it('returns face texture', () => {
    const data = buildNPCRenderData(stockyBlueprint);
    expect(data.faceTexture).toBeDefined();
  });

  it('includes accessories from blueprint', () => {
    const data = buildNPCRenderData(stockyBlueprint);
    expect(data.accessories).toContain('leather_apron');
    expect(data.accessories).toContain('hammer');
  });

  it('sets cloth colors from palette', () => {
    const data = buildNPCRenderData(stockyBlueprint);
    expect(data.clothPrimary).toBe('#4a3320');
    expect(data.clothSecondary).toBe('#2b1d12');
  });
});

// Rich archetype for testing generation
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

describe('generateNPCFromArchetype', () => {
  it('produces a deterministic NPC from seed', () => {
    const a = generateNPCFromArchetype(blacksmithArchetype, 42);
    const b = generateNPCFromArchetype(blacksmithArchetype, 42);
    expect(a.name).toBe(b.name);
    expect(a.id).toBe(b.id);
    expect(a.blueprint.face.skinTone).toBe(b.blueprint.face.skinTone);
  });

  it('produces different NPCs from different seeds', () => {
    const a = generateNPCFromArchetype(blacksmithArchetype, 1);
    const b = generateNPCFromArchetype(blacksmithArchetype, 999);
    // Names could collide but IDs won't
    expect(a.id).not.toBe(b.id);
  });

  it('always includes signature accessories', () => {
    for (let seed = 0; seed < 20; seed++) {
      const npc = generateNPCFromArchetype(blacksmithArchetype, seed);
      expect(npc.blueprint.accessories).toContain('leather_apron');
    }
  });

  it('generates body build within archetype range', () => {
    for (let seed = 0; seed < 20; seed++) {
      const npc = generateNPCFromArchetype(blacksmithArchetype, seed);
      expect(npc.blueprint.bodyBuild.height).toBeGreaterThanOrEqual(0.85);
      expect(npc.blueprint.bodyBuild.height).toBeLessThanOrEqual(1.0);
      expect(npc.blueprint.bodyBuild.width).toBeGreaterThanOrEqual(1.1);
      expect(npc.blueprint.bodyBuild.width).toBeLessThanOrEqual(1.3);
    }
  });

  it('picks face from allowed slots', () => {
    for (let seed = 0; seed < 20; seed++) {
      const npc = generateNPCFromArchetype(blacksmithArchetype, seed);
      expect(['brown', 'gray']).toContain(npc.blueprint.face.eyeColor);
      expect(['bald', 'short']).toContain(npc.blueprint.face.hairStyle);
      expect(['stubble', 'full_beard']).toContain(
        npc.blueprint.face.facialHair,
      );
    }
  });

  it('sets archetype and displayTitle', () => {
    const npc = generateNPCFromArchetype(blacksmithArchetype, 1);
    expect(npc.archetype).toBe('blacksmith');
    expect(npc.displayTitle).toBe('Master Smith');
  });

  it('picks name from pool', () => {
    const npc = generateNPCFromArchetype(blacksmithArchetype, 1);
    expect(blacksmithArchetype.namePool).toContain(npc.name);
  });

  it('picks greeting from pool', () => {
    const npc = generateNPCFromArchetype(blacksmithArchetype, 1);
    const greetingTexts = blacksmithArchetype.greetingPool.map((g) => g.text);
    expect(greetingTexts).toContain(npc.greeting);
  });

  it('generates valid blueprint for render pipeline', () => {
    const npc = generateNPCFromArchetype(blacksmithArchetype, 42);
    const renderData = buildNPCRenderData(npc.blueprint);
    expect(renderData.torsoHeight).toBeGreaterThan(0);
    expect(renderData.faceTexture).toBeDefined();
    expect(renderData.clothPrimary).toBeTruthy();
    expect(renderData.accessories).toContain('leather_apron');
  });
});
