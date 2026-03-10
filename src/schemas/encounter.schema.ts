import { z } from 'zod';

/** Monster formation for combat encounters */
export const FormationType = z.enum([
  'semicircle', // default — surround player
  'line', // side by side
  'ambush', // behind player
  'scattered', // random positions
  'guarding', // around a point of interest
]);
export type FormationType = z.infer<typeof FormationType>;

export const EncounterDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(80),
  type: z.enum(['combat', 'puzzle', 'social', 'stealth', 'survival']),
  difficulty: z.number().int().min(1).max(10),
  description: z.string().min(10).max(500),
  rewards: z
    .array(
      z.object({
        itemId: z.string(),
        chance: z.number().min(0).max(1).default(1),
      }),
    )
    .optional(),
  failureConsequence: z.string().max(300).optional(),

  // --- Grok-inspired expansions (all optional for backward compat) ---

  /** Monster formation pattern */
  formation: FormationType.optional(),
  /** Chance this encounter starts as an ambush (0-1) */
  ambushChance: z.number().min(0).max(1).optional(),
  /** Player can flee if monsters below this HP percentage */
  fleeThreshold: z.number().min(0).max(1).optional(),
  /** Whether this is a boss encounter (special UI, no flee) */
  bossEncounter: z.boolean().default(false),
  /** Music track override for this encounter */
  musicTrack: z.string().optional(),
  /** XP bonus multiplier for completing this encounter */
  xpMultiplier: z.number().min(0.5).max(5.0).optional(),
  /** Environmental effects during combat */
  environment: z
    .object({
      weather: z.string().optional(),
      lighting: z.enum(['normal', 'dark', 'dim', 'bright']).optional(),
      terrain: z.string().optional(),
    })
    .optional(),
});
export type EncounterDefinition = z.infer<typeof EncounterDefinitionSchema>;
