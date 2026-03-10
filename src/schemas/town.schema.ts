import { z } from 'zod';

export const LayoutStrategy = z.enum(['organic', 'road', 'grid']);
export type LayoutStrategy = z.infer<typeof LayoutStrategy>;

export const BoundaryType = z.enum(['palisade', 'stone_wall', 'hedge', 'none']);
export type BoundaryType = z.infer<typeof BoundaryType>;

export const ApproachType = z.enum([
  'meadow',
  'meadow_stream',
  'grove',
  'bridge',
  'open',
]);
export type ApproachType = z.infer<typeof ApproachType>;

export const BuildingPlacementSchema = z.object({
  archetype: z.string(),
  label: z.string(),
  position: z.tuple([z.number(), z.number()]),
  rotation: z.number().default(0),
  overrides: z
    .object({
      stories: z.number().int().min(1).max(3).optional(),
      wallMaterial: z.string().optional(),
      roofStyle: z.string().optional(),
    })
    .optional(),
});
export type BuildingPlacement = z.infer<typeof BuildingPlacementSchema>;

export const FacingDirection = z.enum(['north', 'south', 'east', 'west']);
export type FacingDirection = z.infer<typeof FacingDirection>;

export const SpawnPointSchema = z.object({
  id: z.string().min(1),
  tile: z.tuple([z.number(), z.number()]),
  facing: FacingDirection,
});
export type SpawnPoint = z.infer<typeof SpawnPointSchema>;

export const TownNPCPlacementSchema = z.object({
  id: z.string(),
  archetype: z.string(),
  fixed: z.boolean().default(false),
  building: z.string().optional(),
  name: z.string().optional(),
  position: z.tuple([z.number(), z.number()]).optional(),
});
export type TownNPCPlacement = z.infer<typeof TownNPCPlacementSchema>;

export const TownConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  anchorId: z.string().optional(),
  layout: LayoutStrategy,
  boundary: BoundaryType,
  approach: ApproachType,
  center: z.tuple([z.number(), z.number()]),
  buildings: z.array(BuildingPlacementSchema),
  npcs: z.array(TownNPCPlacementSchema),
  spawns: z.array(SpawnPointSchema).optional(),
});
export type TownConfig = z.infer<typeof TownConfigSchema>;
