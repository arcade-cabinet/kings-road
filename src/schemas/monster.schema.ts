import { z } from 'zod';

export const MonsterArchetypeSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  bodyType: z.enum(['biped', 'quadruped', 'serpent', 'amorphous']),
  size: z.number().min(0.3).max(5.0),
  colorScheme: z.object({
    primary: z.string(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
  }),
  dangerTier: z.number().int().min(0).max(4),
  health: z.number().int().min(1),
  damage: z.number().int().min(0),
  lootTable: z.string().optional(),
});
export type MonsterArchetype = z.infer<typeof MonsterArchetypeSchema>;
