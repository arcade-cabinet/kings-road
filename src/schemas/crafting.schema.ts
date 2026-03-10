import { z } from 'zod';

/**
 * Crafting system schema — from Grok Phase 16.
 * Defines recipes, crafting stations, and material requirements.
 */

/** Type of crafting station required */
export const CraftingStationType = z.enum([
  'workbench', // basic crafting
  'forge', // metalworking (blacksmith)
  'alchemy_table', // potions and elixirs
  'loom', // textiles and enchanting
  'cooking_fire', // food and buffs
  'anvil', // weapon/armor repair and upgrade
]);
export type CraftingStationType = z.infer<typeof CraftingStationType>;

/** A single ingredient requirement */
export const CraftingIngredientSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

/** A crafting recipe definition */
export const CraftingRecipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60),
  description: z.string().max(300).optional(),
  /** Required crafting station */
  station: CraftingStationType,
  /** Input materials */
  ingredients: z.array(CraftingIngredientSchema).min(1),
  /** Output item ID */
  resultItemId: z.string(),
  /** Number of items produced */
  resultQuantity: z.number().int().min(1).max(99).default(1),
  /** Time in seconds to craft */
  craftTime: z.number().min(0).max(300).default(0),
  /** Minimum player level to learn/use this recipe */
  levelRequirement: z.number().int().min(1).optional(),
  /** Must be discovered before it can be crafted */
  requiresDiscovery: z.boolean().default(false),
  /** XP awarded for crafting */
  xpReward: z.number().int().min(0).optional(),
});
export type CraftingRecipe = z.infer<typeof CraftingRecipeSchema>;
