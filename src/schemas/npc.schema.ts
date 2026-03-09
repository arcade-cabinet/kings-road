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
  'pilgrim',
  'captain',
  'guard',
  'herbalist',
  'lord',
  'miller',
  'jailer',
  'stablehand',
  'watchman',
]);
export type NPCArchetype = z.infer<typeof NPCArchetype>;

export const DialogueLineSchema = z.object({
  text: z.string().min(10).max(300),
  condition: z.string().optional(), // e.g. "quest:poisoned-well:active"
});

/** Range tuple for seeded random generation: [min, max] */
const RangeSchema = z.tuple([z.number(), z.number()]);

/**
 * Visual identity — the "caricature" that makes this archetype instantly
 * recognizable. Defines what every instance of this archetype shares and
 * what varies.
 */
export const VisualIdentitySchema = z.object({
  /** Body build ranges for seeded generation */
  bodyBuild: z.object({
    heightRange: RangeSchema, // e.g. [0.85, 1.0] for stocky blacksmith
    widthRange: RangeSchema, // e.g. [1.1, 1.3] for broad shoulders
  }),
  /** Default cloth colors — primary is the "signature" */
  clothPalette: z.object({
    primary: z.string(),
    secondary: z.string().optional(),
    variations: z.array(z.string()).optional(), // alt primaries for variety
  }),
  /** Always present on every instance (apron for blacksmith, armor for knight) */
  signatureAccessories: z.array(z.string()),
  /** Randomly picked 0-2 of these per instance */
  optionalAccessories: z.array(z.string()),
});

/** Face generation slots — constrained randomization ranges */
export const FaceSlotsSchema = z.object({
  skinToneRange: z.tuple([z.number().int(), z.number().int()]),
  eyeColors: z.array(z.enum(['brown', 'blue', 'green', 'gray'])).min(1),
  hairStyles: z.array(z.enum(['bald', 'short', 'long', 'hooded'])).min(1),
  hairColors: z.array(z.string()).min(1),
  facialHairOptions: z
    .array(z.enum(['none', 'stubble', 'full_beard', 'mustache']))
    .min(1),
});

/** Behavior defaults for this archetype */
export const ArchetypeBehaviorSchema = z.object({
  idleStyle: z.enum(['idle', 'working', 'patrolling', 'sitting']),
  interactionVerb: z.string().default('TALK'),
  walkNodes: z.boolean().default(false),
});

/**
 * NPC Archetype Definition — a rich "caricature" template.
 * Used to generate both fixed story NPCs (with overrides) and
 * random procedural NPCs (from seed).
 */
export const NPCDefinitionSchema = z.object({
  id: z.string().min(1),
  archetype: NPCArchetype,

  /** One-line personality description for procedural flavor */
  personality: z.string().min(10).max(200).optional(),

  /** Display title shown under name in UI (e.g. "Master Smith") */
  displayTitle: z.string().optional(),

  /** Visual caricature — what makes this archetype recognizable */
  visualIdentity: VisualIdentitySchema.optional(),

  /** Face generation constraints */
  faceSlots: FaceSlotsSchema.optional(),

  /** Behavior defaults */
  behavior: ArchetypeBehaviorSchema.optional(),

  /** Name pool for random generation */
  namePool: z.array(z.string().min(2).max(40)).min(3),

  /** Greeting dialogue pool */
  greetingPool: z.array(DialogueLineSchema).min(2),

  /** Idle chatter pool */
  idlePool: z.array(DialogueLineSchema).optional(),

  /** Quest-specific dialogue overrides */
  questDialogue: z.record(z.string(), z.array(DialogueLineSchema)).optional(),

  /** Legacy appearance field (deprecated — use visualIdentity) */
  appearance: z
    .object({
      clothColor: z.string().optional(),
      accessory: z.string().optional(),
    })
    .optional(),
});
export type NPCDefinition = z.infer<typeof NPCDefinitionSchema>;
