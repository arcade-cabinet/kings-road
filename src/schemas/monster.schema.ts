import { z } from 'zod';

/**
 * Monster body plans — determines the procedural mesh structure.
 * Expanded from Grok Phase 11's 5 body plans + Kings Road's 4 types.
 */
export const MonsterBodyPlan = z.enum([
  'biped', // humanoid two-legged
  'quadruped', // four-legged beast
  'serpent', // snake/wyrm body
  'amorphous', // blob/slime/ooze
  'centaur', // humanoid torso on quadruped body
  'wyrm', // long segmented body (dragon-like)
  'golem', // bulky geometric construct
  'insectoid', // multi-legged with carapace
  'chimera', // hybrid multi-part body
]);
export type MonsterBodyPlan = z.infer<typeof MonsterBodyPlan>;

/**
 * Monster material type — affects shading and visual properties.
 * From Grok Phase 11's 7 material types.
 */
export const MonsterMaterial = z.enum([
  'flesh', // organic creature (default)
  'stone', // rough, matte surface
  'crystal', // translucent, emissive highlights
  'shadow', // semi-transparent, dark aura
  'bone', // pale, dry texture
  'metal', // reflective, armored
  'plant', // mossy, vine-covered
]);
export type MonsterMaterial = z.infer<typeof MonsterMaterial>;

/** Appendage configuration for multi-headed/tailed monsters */
export const AppendageSchema = z.object({
  type: z.enum(['head', 'tail', 'arm', 'wing', 'tentacle']),
  count: z.number().int().min(1).max(7),
  /** Size relative to body (0.5 = half, 1.0 = same, 2.0 = double) */
  scale: z.number().min(0.2).max(3.0).default(1.0),
});

/** Monster ability for combat */
export const MonsterAbilitySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  type: z.enum(['melee', 'ranged', 'aoe', 'buff', 'debuff', 'summon']),
  damage: z.number().int().min(0).optional(),
  cooldown: z.number().min(0).optional(),
  range: z.number().min(0).optional(),
  description: z.string().max(200).optional(),
});

export const MonsterArchetypeSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  /** Legacy field — use bodyPlan for richer generation */
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

  // --- Grok-inspired expansions (all optional for backward compat) ---

  /** Rich body plan for procedural mesh generation */
  bodyPlan: MonsterBodyPlan.optional(),
  /** Material type for shading/visual effects */
  materialType: MonsterMaterial.optional(),
  /** Extra appendages (multi-head hydra, scorpion tail, etc.) */
  appendages: z.array(AppendageSchema).optional(),
  /** Pattern for procedural name generation (e.g. "{prefix} {root} {suffix}") */
  namePattern: z
    .object({
      prefixes: z.array(z.string()),
      roots: z.array(z.string()),
      suffixes: z.array(z.string()),
    })
    .optional(),
  /** Combat abilities beyond basic attack */
  abilities: z.array(MonsterAbilitySchema).optional(),
  /** Preferred biome for spawning */
  spawnBiome: z
    .enum(['forest', 'road', 'dungeon', 'town_outskirts', 'mountain', 'swamp'])
    .optional(),
  /** XP reward for defeating this monster */
  xpReward: z.number().int().min(0).optional(),
  /** Flee threshold — monster retreats below this HP percentage */
  fleeThreshold: z.number().min(0).max(1).optional(),
  /** Aggro radius in world units */
  aggroRadius: z.number().min(1).max(30).optional(),
  /** Sound effect key for aggro */
  aggroSound: z.string().optional(),
  /** Description for bestiary/monster card */
  description: z.string().max(300).optional(),
});
export type MonsterArchetype = z.infer<typeof MonsterArchetypeSchema>;
