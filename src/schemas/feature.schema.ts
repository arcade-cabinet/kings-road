import { z } from 'zod';

export const FeatureTier = z.enum(['ambient', 'minor', 'major']);
export type FeatureTier = z.infer<typeof FeatureTier>;

export const FeatureDefinitionSchema = z.object({
  id: z.string().min(1),
  tier: FeatureTier,
  name: z.string().min(2).max(80),
  description: z.string().min(10).max(300),
  visualType: z.string(), // Maps to a renderer: 'stone_bridge', 'shrine', 'ruin', etc.
  /**
   * Optional path to an authored GLB (relative to public/assets/, no leading slash).
   * When present, FeatureSpawner loads the model and places it at the feature
   * position instead of falling back to the procedural color-box.
   * Example: "nature/ancient-oak.glb"
   */
  glb: z.string().optional(),
  /** Uniform scale multiplier applied to the GLB after the tier scale. */
  glbScale: z.number().positive().default(1),
  /** Degrees of Y-axis rotation applied per-instance deterministically by seed. */
  glbYawRange: z.number().min(0).max(360).default(360),
  interactable: z.boolean().default(false),
  dialogueOnInteract: z.string().max(300).optional(),
});
export type FeatureDefinition = z.infer<typeof FeatureDefinitionSchema>;
