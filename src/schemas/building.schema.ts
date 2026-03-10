import { z } from 'zod';

export const WallMaterial = z.enum([
  'plaster',
  'stone',
  'timber_frame',
  'brick',
]);
export type WallMaterial = z.infer<typeof WallMaterial>;

export const RoofStyle = z.enum(['thatch', 'slate', 'flat']);
export type RoofStyle = z.infer<typeof RoofStyle>;

export const InteriorSlotSchema = z.object({
  type: z.string(),
  position: z.tuple([z.number(), z.number()]),
});
export type InteriorSlot = z.infer<typeof InteriorSlotSchema>;

export const NPCSlotSchema = z.object({
  archetype: z.string(),
  position: z.tuple([z.number(), z.number()]),
});

/** Blueprint type from Grok Phase 6 — determines generation template */
export const BlueprintType = z.enum([
  'cottage',
  'timber_house',
  'tavern',
  'blacksmith',
  'chapel',
  'manor',
  'watchtower',
  'stable',
  'mill',
  'market_stall',
]);
export type BlueprintType = z.infer<typeof BlueprintType>;

/** Walk node for interior NPC navigation */
export const WalkNodeSchema = z.object({
  id: z.string().min(1),
  position: z.tuple([z.number(), z.number()]),
  /** Connected walk node IDs */
  connections: z.array(z.string()),
});

/** Interior lighting source */
export const InteriorLightSchema = z.object({
  type: z.enum(['candle', 'hearth', 'lantern', 'torch', 'window']),
  position: z.tuple([z.number(), z.number()]),
  intensity: z.number().min(0).max(2).default(1.0),
  color: z.string().optional(),
});

/** Stair configuration for multi-story buildings */
export const StairConfigSchema = z.object({
  position: z.tuple([z.number(), z.number()]),
  direction: z.enum(['north', 'south', 'east', 'west']),
  /** If true, stairs have a floor hole above them */
  hasFloorHole: z.boolean().default(true),
});

export const BuildingArchetypeSchema = z.object({
  id: z.string().min(1),
  stories: z.number().int().min(1).max(3),
  footprint: z.object({
    width: z.number().int().min(1).max(6),
    depth: z.number().int().min(1).max(8),
  }),
  wallMaterial: WallMaterial,
  roofStyle: RoofStyle,
  openFront: z.boolean().default(false),
  features: z.array(z.string()),
  interiorSlots: z.array(InteriorSlotSchema),
  npcSlot: NPCSlotSchema.optional(),

  // --- Grok-inspired expansions (all optional for backward compat) ---

  /** Blueprint type for generation template selection */
  blueprintType: BlueprintType.optional(),
  /** Tudor half-timber visual style (dark beam pattern on plaster) */
  tudorHalfTimber: z.boolean().optional(),
  /** Walk nodes for NPC interior pathing */
  walkNodes: z.array(WalkNodeSchema).optional(),
  /** Interior lighting configuration */
  interiorLighting: z.array(InteriorLightSchema).optional(),
  /** Stair layout for multi-story buildings */
  stairs: z.array(StairConfigSchema).optional(),
  /** Whether the building interior is accessible to the player */
  enterable: z.boolean().optional(),
  /** Door position relative to footprint */
  doorPosition: z
    .object({
      side: z.enum(['north', 'south', 'east', 'west']),
      offset: z.number().min(0).max(1).default(0.5),
    })
    .optional(),
});
export type BuildingArchetype = z.infer<typeof BuildingArchetypeSchema>;
