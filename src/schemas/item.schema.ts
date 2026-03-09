import { z } from 'zod';

/** Equipment slot where an item can be worn */
export const EquipSlot = z.enum([
  'head',
  'chest',
  'legs',
  'feet',
  'weapon',
  'shield',
  'accessory',
]);
export type EquipSlot = z.infer<typeof EquipSlot>;

/** Item rarity tier — affects drop rates, visuals, and value */
export const ItemRarity = z.enum([
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
]);
export type ItemRarity = z.infer<typeof ItemRarity>;

/** Stat modifier applied when equipped or consumed */
export const StatModifierSchema = z.object({
  stat: z.enum([
    'health',
    'stamina',
    'damage',
    'defense',
    'speed',
    'luck',
    'magic',
  ]),
  value: z.number(),
  /** Flat = add value, percent = multiply by (1 + value/100) */
  mode: z.enum(['flat', 'percent']).default('flat'),
});

export const ItemDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60),
  description: z.string().min(10).max(300),
  type: z.enum([
    'key_item',
    'consumable',
    'equipment',
    'quest_item',
    'modifier',
    'crafting_material',
  ]),
  effect: z
    .object({
      stat: z.string().optional(),
      value: z.number().optional(),
      duration: z.number().optional(),
    })
    .optional(),
  stackable: z.boolean().default(false),

  // --- Grok-inspired expansions (all optional for backward compat) ---

  /** Weight for encumbrance system (0 = weightless) */
  weight: z.number().min(0).max(100).optional(),
  /** Base sell value in currency */
  value: z.number().int().min(0).optional(),
  /** Which equipment slot this item occupies */
  equipSlot: EquipSlot.optional(),
  /** Stat bonuses when equipped */
  statModifiers: z.array(StatModifierSchema).optional(),
  /** Rarity tier */
  rarity: ItemRarity.optional(),
  /** Maximum stack size (only if stackable=true) */
  maxStack: z.number().int().min(1).max(999).optional(),
  /** Visual icon key for inventory UI */
  iconKey: z.string().optional(),
  /** Level requirement to use/equip */
  levelRequirement: z.number().int().min(1).optional(),
});
export type ItemDefinition = z.infer<typeof ItemDefinitionSchema>;
