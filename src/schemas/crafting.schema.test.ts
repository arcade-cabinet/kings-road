import { describe, expect, it } from 'vitest';
import { CraftingRecipeSchema } from './crafting.schema';

describe('CraftingRecipeSchema', () => {
  it('accepts a valid recipe', () => {
    const recipe = {
      id: 'healing-salve',
      name: 'Healing Salve',
      description: 'A soothing balm brewed from meadow herbs.',
      station: 'alchemy_table',
      ingredients: [
        { itemId: 'healing-herb', quantity: 3 },
        { itemId: 'beeswax', quantity: 1 },
      ],
      resultItemId: 'healing-salve-item',
      resultQuantity: 2,
      craftTime: 10,
      xpReward: 15,
    };
    expect(() => CraftingRecipeSchema.parse(recipe)).not.toThrow();
  });

  it('applies defaults for resultQuantity and craftTime', () => {
    const recipe = {
      id: 'iron-nail',
      name: 'Iron Nail',
      station: 'forge',
      ingredients: [{ itemId: 'iron-ingot', quantity: 1 }],
      resultItemId: 'iron-nail-item',
    };
    const parsed = CraftingRecipeSchema.parse(recipe);
    expect(parsed.resultQuantity).toBe(1);
    expect(parsed.craftTime).toBe(0);
    expect(parsed.requiresDiscovery).toBe(false);
  });

  it('rejects a recipe with no ingredients', () => {
    const recipe = {
      id: 'free-lunch',
      name: 'Free Lunch',
      station: 'cooking_fire',
      ingredients: [],
      resultItemId: 'bread',
    };
    expect(() => CraftingRecipeSchema.parse(recipe)).toThrow();
  });

  it('rejects an invalid station type', () => {
    const recipe = {
      id: 'magic-item',
      name: 'Magic Widget',
      station: 'enchantment_circle',
      ingredients: [{ itemId: 'gem', quantity: 1 }],
      resultItemId: 'magic-widget',
    };
    expect(() => CraftingRecipeSchema.parse(recipe)).toThrow();
  });
});
