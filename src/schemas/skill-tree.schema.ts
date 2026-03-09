import { z } from 'zod';

/**
 * Skill tree schema — from Grok Phase 17.
 * Three branches (Combat/Magic/Survival) with tiered perks.
 */

/** Skill branch categories */
export const SkillBranch = z.enum(['combat', 'magic', 'survival']);
export type SkillBranch = z.infer<typeof SkillBranch>;

/** Effect of unlocking a perk */
export const PerkEffectSchema = z.object({
  type: z.enum([
    'stat_bonus', // +N to a stat
    'ability_unlock', // grants a new ability
    'passive', // always-active effect
    'discount', // reduces costs
    'resistance', // damage reduction
  ]),
  stat: z.string().optional(),
  value: z.number().optional(),
  abilityId: z.string().optional(),
  description: z.string().max(200),
});

/** A single perk in the skill tree */
export const PerkSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(40),
  description: z.string().min(10).max(200),
  branch: SkillBranch,
  /** Tier within the branch (1 = first available, higher = later) */
  tier: z.number().int().min(1).max(5),
  /** Skill points required to unlock */
  cost: z.number().int().min(1).max(5).default(1),
  /** Perk IDs that must be unlocked first */
  prerequisites: z.array(z.string()).optional(),
  /** Effects when this perk is active */
  effects: z.array(PerkEffectSchema).min(1),
  /** Icon key for UI display */
  iconKey: z.string().optional(),
});
export type Perk = z.infer<typeof PerkSchema>;

/** Complete skill tree definition */
export const SkillTreeSchema = z.object({
  id: z.string().min(1),
  /** Skill points awarded per level */
  pointsPerLevel: z.number().int().min(1).max(3).default(1),
  /** All perks in the tree */
  perks: z.array(PerkSchema).min(3),
});
export type SkillTree = z.infer<typeof SkillTreeSchema>;
