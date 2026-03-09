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
});
export type BuildingArchetype = z.infer<typeof BuildingArchetypeSchema>;
