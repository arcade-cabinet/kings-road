import { z } from 'zod';

export const EncounterDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(80),
  type: z.enum(['combat', 'puzzle', 'social', 'stealth', 'survival']),
  difficulty: z.number().int().min(1).max(10),
  description: z.string().min(10).max(500),
  rewards: z.array(z.object({
    itemId: z.string(),
    chance: z.number().min(0).max(1).default(1),
  })).optional(),
  failureConsequence: z.string().max(300).optional(),
});
export type EncounterDefinition = z.infer<typeof EncounterDefinitionSchema>;
