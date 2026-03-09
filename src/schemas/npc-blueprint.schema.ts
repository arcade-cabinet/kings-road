import { z } from 'zod';

export const BodyBuildSchema = z.object({
  height: z.number().min(0.6).max(1.4).default(1.0),
  width: z.number().min(0.7).max(1.5).default(1.0),
});

export const FaceSchema = z.object({
  skinTone: z.number().int().min(0).max(4),
  eyeColor: z.enum(['brown', 'blue', 'green', 'gray']).default('brown'),
  hairStyle: z.enum(['bald', 'short', 'long', 'hooded']).default('short'),
  hairColor: z.string().default('#4a3020'),
  facialHair: z
    .enum(['none', 'stubble', 'full_beard', 'mustache'])
    .default('none'),
});
export type Face = z.infer<typeof FaceSchema>;

export const ClothPaletteSchema = z.object({
  primary: z.string(),
  secondary: z.string().optional(),
});

export const NPCBehaviorSchema = z.object({
  idleStyle: z.enum(['idle', 'working', 'patrolling', 'sitting']),
  interactionVerb: z.string().default('TALK'),
  walkNodes: z.boolean().default(false),
});

export const NPCDialogueSchema = z
  .object({
    greeting: z.array(z.string()).optional(),
    quest: z.array(z.string()).optional(),
    idle: z.array(z.string()).optional(),
  })
  .optional();

export const NPCBlueprintSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  archetype: z.string(),
  fixed: z.boolean().default(false),
  bodyBuild: BodyBuildSchema,
  face: FaceSchema,
  accessories: z.array(z.string()).default([]),
  clothPalette: ClothPaletteSchema,
  behavior: NPCBehaviorSchema,
  dialogue: NPCDialogueSchema,
});
export type NPCBlueprint = z.infer<typeof NPCBlueprintSchema>;
