import { describe, expect, it } from 'vitest';
import { BuildingArchetypeSchema } from './building.schema';

describe('BuildingArchetypeSchema', () => {
  it('accepts a valid tavern archetype', () => {
    const tavern = {
      id: 'tavern',
      stories: 2,
      footprint: { width: 3, depth: 4 },
      wallMaterial: 'plaster',
      roofStyle: 'thatch',
      openFront: false,
      features: ['door', 'windows', 'chimney', 'sign', 'hearth'],
      interiorSlots: [
        { type: 'table', position: [1, 2] },
        { type: 'chair', position: [1, 1] },
      ],
      npcSlot: { archetype: 'innkeeper', position: [1.5, 3] },
    };
    expect(() => BuildingArchetypeSchema.parse(tavern)).not.toThrow();
  });

  it('rejects stories > 3', () => {
    const bad = {
      id: 'tower',
      stories: 5,
      footprint: { width: 2, depth: 2 },
      wallMaterial: 'stone',
      roofStyle: 'flat',
      openFront: false,
      features: [],
      interiorSlots: [],
    };
    expect(() => BuildingArchetypeSchema.parse(bad)).toThrow();
  });

  it('defaults openFront to false', () => {
    const minimal = {
      id: 'cottage',
      stories: 1,
      footprint: { width: 2, depth: 2 },
      wallMaterial: 'plaster',
      roofStyle: 'thatch',
      features: ['door', 'windows'],
      interiorSlots: [],
    };
    const result = BuildingArchetypeSchema.parse(minimal);
    expect(result.openFront).toBe(false);
  });
});
