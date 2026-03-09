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

/** NPC expression states — from Grok Phase 2's 6 expressions */
export const ExpressionType = z.enum([
  'neutral',
  'happy',
  'angry',
  'sad',
  'surprised',
  'sleeping',
  'speaking',
]);
export type ExpressionType = z.infer<typeof ExpressionType>;

/**
 * Chibi face configuration — controls procedural face generation.
 * From Grok Phase 1-2's canvas-based face system.
 */
export const ChibiFaceConfigSchema = z.object({
  /** Eye shape: round=large chibi eyes, narrow=squinting, almond=default */
  eyeShape: z.enum(['round', 'narrow', 'almond', 'wide']).default('almond'),
  /** Pupil size relative to eye (0.3-0.8) */
  pupilSize: z.number().min(0.3).max(0.8).default(0.5),
  /** Brow angle in degrees (-30 = angry, 0 = neutral, 30 = worried) */
  browAngle: z.number().min(-30).max(30).default(0),
  /** Mouth style */
  mouthStyle: z
    .enum(['smile', 'frown', 'neutral', 'open', 'smirk'])
    .default('neutral'),
  /** Face shape */
  faceShape: z.enum(['round', 'oval', 'square', 'heart']).default('round'),
  /** Blush intensity (0 = none, 1 = full) */
  blushIntensity: z.number().min(0).max(1).default(0),
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

  // --- Grok-inspired expansions (all optional for backward compat) ---

  /** Supported expression states for this archetype */
  expressions: z.array(ExpressionType).optional(),
  /** Chibi face generation config (overrides faceSlots for fine control) */
  chibiFaceConfig: ChibiFaceConfigSchema.optional(),
  /** Animation set key (maps to a set of procedural animations) */
  animationSet: z
    .enum(['standard', 'smith', 'merchant', 'guard', 'noble', 'elder'])
    .optional(),
  /** Reference to a dialogue tree definition */
  dialogueTreeRef: z.string().optional(),
  /** Race for character proportions and face generation */
  race: z.enum(['human', 'elf', 'dwarf', 'orc', 'halfling']).optional(),
});
export type NPCDefinition = z.infer<typeof NPCDefinitionSchema>;
