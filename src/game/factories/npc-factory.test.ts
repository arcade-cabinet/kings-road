import { describe, expect, it } from 'vitest';
import type { NPCBlueprint } from '../../schemas/npc-blueprint.schema';
import { buildNPCRenderData } from './npc-factory';

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
