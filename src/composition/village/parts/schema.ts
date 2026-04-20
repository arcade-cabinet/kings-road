import { z } from 'zod';

export const VillagePartRoleSchema = z.enum([
  'wall',
  'roof',
  'door',
  'window',
  'chimney',
  'foundation',
  'trim',
  'decoration',
]);
export type VillagePartRole = z.infer<typeof VillagePartRoleSchema>;

export const VillageFootprintSchema = z.object({
  /** Width in metres (X axis) at authored GLB scale. */
  width: z.number().positive(),
  /** Depth in metres (Z axis) at authored GLB scale. */
  depth: z.number().positive(),
});
export type VillageFootprint = z.infer<typeof VillageFootprintSchema>;

export const VillagePartSchema = z.object({
  /** Unique kebab-case slug — stable identifier for composer references. */
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'id must be kebab-case'),
  /** Public URL path to the GLB (served from public/assets/buildings/village/). */
  glbPath: z.string().startsWith('/assets/buildings/village/').endsWith('.glb'),
  /** Structural role in a composed building. */
  role: VillagePartRoleSchema,
  /** Bounding footprint (1 Blender unit = 1 m). */
  footprint: VillageFootprintSchema,
  /**
   * Valid parent roles this part snaps onto — consumed by the Phase B
   * composer to build attachment trees. Empty array = independent base
   * piece (e.g. foundation).
   */
  attachTo: z.array(VillagePartRoleSchema),
});
export type VillagePart = z.infer<typeof VillagePartSchema>;
