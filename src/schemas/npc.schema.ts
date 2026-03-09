import { z } from 'zod';

export const NPCArchetype = z.enum([
  'blacksmith',
  'innkeeper',
  'merchant',
  'wanderer',
  'healer',
  'knight',
  'hermit',
  'farmer',
  'priest',
  'noble',
  'bandit',
  'scholar',
]);
export type NPCArchetype = z.infer<typeof NPCArchetype>;

export const DialogueLineSchema = z.object({
  text: z.string().min(10).max(300),
  condition: z.string().optional(), // e.g. "quest:poisoned-well:active"
});

export const NPCDefinitionSchema = z.object({
  id: z.string().min(1),
  archetype: NPCArchetype,
  namePool: z.array(z.string().min(2).max(40)).min(3),
  greetingPool: z.array(DialogueLineSchema).min(2),
  questDialogue: z.record(z.string(), z.array(DialogueLineSchema)).optional(),
  appearance: z
    .object({
      clothColor: z.string().optional(),
      accessory: z.string().optional(),
    })
    .optional(),
});
export type NPCDefinition = z.infer<typeof NPCDefinitionSchema>;
