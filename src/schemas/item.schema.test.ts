import { describe, it, expect } from 'vitest';
import { ItemDefinitionSchema } from './item.schema';

describe('Item Schema', () => {
  it('validates a complete item definition', () => {
    const item = {
      id: 'merchant-map',
      name: 'Merchant\'s Map',
      description: 'A hand-drawn map showing hidden paths along the King\'s Road.',
      type: 'key_item',
      effect: { stat: 'navigation', value: 1 },
      stackable: false,
    };
    expect(() => ItemDefinitionSchema.parse(item)).not.toThrow();
  });

  it('applies default stackable of false', () => {
    const item = {
      id: 'healing-herb',
      name: 'Healing Herb',
      description: 'A fragrant herb with restorative properties when brewed.',
      type: 'consumable',
    };
    const parsed = ItemDefinitionSchema.parse(item);
    expect(parsed.stackable).toBe(false);
  });

  it('rejects item with invalid type', () => {
    const item = {
      id: 'bad-item',
      name: 'Bad Item',
      description: 'This item has an invalid type setting here.',
      type: 'legendary_weapon',
    };
    expect(() => ItemDefinitionSchema.parse(item)).toThrow();
  });

  it('validates a stackable consumable', () => {
    const item = {
      id: 'health-potion',
      name: 'Health Potion',
      description: 'A small vial of red liquid that restores health.',
      type: 'consumable',
      effect: { stat: 'health', value: 25, duration: 0 },
      stackable: true,
    };
    const parsed = ItemDefinitionSchema.parse(item);
    expect(parsed.stackable).toBe(true);
    expect(parsed.effect?.value).toBe(25);
  });
});
