import { describe, expect, it } from 'vitest';
import { NPCBlueprintSchema } from './npc-blueprint.schema';

describe('NPCBlueprintSchema', () => {
  it('accepts a fixed NPC with face and accessories', () => {
    const aldric = {
      id: 'aldric',
      name: 'Aldric',
      archetype: 'blacksmith',
      fixed: true,
      bodyBuild: { height: 0.9, width: 1.2 },
      face: {
        skinTone: 3,
        eyeColor: 'brown',
        hairStyle: 'bald',
        hairColor: '#1a1a1a',
        facialHair: 'full_beard',
      },
      accessories: ['leather_apron', 'hammer'],
      clothPalette: { primary: '#4a3320', secondary: '#2b1d12' },
      behavior: {
        idleStyle: 'working',
        interactionVerb: 'TALK',
        walkNodes: true,
      },
      dialogue: {
        greeting: ['Well met, traveler. Need something forged?'],
        quest: ['I could use some iron from the old mine...'],
      },
    };
    expect(() => NPCBlueprintSchema.parse(aldric)).not.toThrow();
  });

  it('accepts a procedural NPC with minimal config', () => {
    const procedural = {
      id: 'wanderer-001',
      archetype: 'wanderer',
      fixed: false,
      bodyBuild: { height: 1.0, width: 1.0 },
      face: { skinTone: 0, eyeColor: 'blue', hairStyle: 'short' },
      accessories: ['walking_stick'],
      clothPalette: { primary: '#5a4a3a' },
      behavior: { idleStyle: 'idle', interactionVerb: 'GREET' },
    };
    expect(() => NPCBlueprintSchema.parse(procedural)).not.toThrow();
  });
});
