import { z } from 'zod';

export const AnchorType = z.enum([
  'VILLAGE_FRIENDLY',
  'VILLAGE_HOSTILE',
  'DUNGEON',
  'WAYPOINT',
]);
export type AnchorType = z.infer<typeof AnchorType>;

export const Biome = z.enum([
  'MEADOW',
  'FOREST',
  'HILLS',
  'FARMLAND',
  'MOOR',
  'RIVERSIDE',
]);
export type Biome = z.infer<typeof Biome>;

export const AnchorPointSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60),
  type: AnchorType,
  distanceFromStart: z.number().int().nonnegative(),
  mainQuestChapter: z.string().min(1),
  description: z.string().min(10).max(500),
  features: z.array(z.string()).min(1),
  sideQuestSlots: z.number().int().nonnegative().default(0),
});
export type AnchorPoint = z.infer<typeof AnchorPointSchema>;

export const RegionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60),
  biome: Biome,
  anchorRange: z.tuple([z.string(), z.string()]),
  terrainFeatures: z.array(z.string()).min(1),
});
export type Region = z.infer<typeof RegionSchema>;

export const RoadSpineSchema = z.object({
  totalDistance: z.number().int().positive(),
  anchors: z.array(AnchorPointSchema).min(2).refine(
    (anchors) => anchors[0].distanceFromStart === 0,
    { message: 'First anchor must be at distance 0 (home town)' }
  ),
  regions: z.array(RegionSchema).optional(),
});
export type RoadSpine = z.infer<typeof RoadSpineSchema>;
