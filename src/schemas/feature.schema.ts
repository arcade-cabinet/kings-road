import { z } from 'zod';

export const FeatureTier = z.enum(['ambient', 'minor', 'major']);
export type FeatureTier = z.infer<typeof FeatureTier>;

export const FeatureDefinitionSchema = z.object({
  id: z.string().min(1),
  tier: FeatureTier,
  name: z.string().min(2).max(80),
  description: z.string().min(10).max(300),
  visualType: z.string(), // Maps to a renderer: 'stone_bridge', 'shrine', 'ruin', etc.
  interactable: z.boolean().default(false),
  dialogueOnInteract: z.string().max(300).optional(),
});
export type FeatureDefinition = z.infer<typeof FeatureDefinitionSchema>;
