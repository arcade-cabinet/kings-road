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

/**
 * Hand pose used for any item displayed in-hand (FPS viewmodel) or in a
 * 3D inventory thumbnail. `open` is synonymous with `palm` and accepted
 * for authoring clarity on flat objects (books, armor, shields).
 */
export const HandPose = z.enum([
  'grip', // standard pistol/one-handed weapon grip
  'hold', // two-handed hold (polearms, staves)
  'pinch', // small items held between fingers (throwing knife, dagger)
  'palm', // flat-palm hold (torch, shield off-hand)
  'open', // flat object displayed on open palm (books, maps, cloaks)
]);
export type HandPose = z.infer<typeof HandPose>;

/**
 * Item 3D display config — links the item to a GLB. Used in two contexts:
 *   1. FPS viewmodel when the item is equipped as a weapon
 *   2. 3D inventory thumbnail when the player hovers the item in the UI
 * The GLB must live under `/assets/` — weapons, items, or any other
 * extracted pack directory is fine.
 */
export const ViewmodelSchema = z.object({
  /** Path relative to public/ root, e.g. '/assets/weapons/knife-1.glb' */
  glb: z
    .string()
    .regex(
      /^\/assets\/.+\.glb$/,
      'glb must be a /assets/**/*.glb path',
    ),
  /** How the hand rig is posed when holding this weapon */
  handPose: HandPose,
  /** Scale factor for the weapon mesh in viewmodel space (default 1) */
  scale: z.number().min(0.01).max(10).optional(),
  /** Hand GLB override — defaults to '/assets/hands/hand.glb' */
  handGlb: z.string().optional(),
});
export type Viewmodel = z.infer<typeof ViewmodelSchema>;

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
  /** FPS viewmodel config — required for held weapons displayed in first-person */
  viewmodel: ViewmodelSchema.optional(),
});
export type ItemDefinition = z.infer<typeof ItemDefinitionSchema>;
