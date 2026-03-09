import { describe, expect, it } from 'vitest';
import { TownConfigSchema } from './town.schema';

describe('TownConfigSchema', () => {
  it('accepts a valid organic town config', () => {
    const ashford = {
      id: 'ashford',
      name: 'Ashford',
      anchorId: 'anchor-ashford',
      layout: 'organic',
      boundary: 'palisade',
      approach: 'meadow_stream',
      center: [0, 0],
      buildings: [
        { archetype: 'cottage', label: 'Your Home', position: [0, 2], rotation: 15 },
        { archetype: 'tavern', label: 'The Golden Meadow', position: [-3, 0], overrides: { stories: 2 } },
      ],
      npcs: [
        { id: 'aldric', archetype: 'blacksmith', fixed: true, building: "Aldric's Forge", name: 'Aldric' },
      ],
    };
    expect(() => TownConfigSchema.parse(ashford)).not.toThrow();
  });

  it('rejects unknown layout strategy', () => {
    const bad = {
      id: 'x',
      name: 'X',
      layout: 'hexagonal',
      boundary: 'palisade',
      approach: 'meadow',
      center: [0, 0],
      buildings: [],
      npcs: [],
    };
    expect(() => TownConfigSchema.parse(bad)).toThrow();
  });
});
