import { z } from 'zod';

/**
 * Branching dialogue tree schema — from Grok Phase 8.
 * Supports condition-gated options, rewards, and relationship changes.
 */

/** Condition that must be met to show a dialogue option */
export const DialogueConditionSchema = z.object({
  type: z.enum([
    'quest_active',
    'quest_complete',
    'has_item',
    'level_min',
    'relationship_min',
    'flag_set',
    'time_of_day',
  ]),
  /** Target ID (quest ID, item ID, flag name, etc.) */
  target: z.string(),
  /** Numeric value for level_min, relationship_min, time_of_day */
  value: z.number().optional(),
});
export type DialogueCondition = z.infer<typeof DialogueConditionSchema>;

/** Effect triggered when a dialogue option is selected */
export const DialogueEffectSchema = z.object({
  type: z.enum([
    'give_item',
    'take_item',
    'start_quest',
    'advance_quest',
    'set_flag',
    'change_relationship',
    'heal',
    'give_xp',
    'open_shop',
  ]),
  target: z.string().optional(),
  value: z.number().optional(),
});
export type DialogueEffect = z.infer<typeof DialogueEffectSchema>;

/** A single dialogue node in the tree */
export const DialogueNodeSchema = z.object({
  id: z.string().min(1),
  /** Speaker name (NPC name, or empty for narrator) */
  speaker: z.string().optional(),
  /** The dialogue text shown to the player */
  text: z.string().min(1).max(500),
  /** Expression the NPC shows during this node */
  expression: z
    .enum(['neutral', 'happy', 'angry', 'sad', 'surprised', 'speaking'])
    .optional(),
  /** Player response options */
  options: z
    .array(
      z.object({
        text: z.string().min(1).max(200),
        /** Node ID to go to when selected */
        next: z.string(),
        /** Conditions required to show this option */
        conditions: z.array(DialogueConditionSchema).optional(),
        /** Effects triggered when selected */
        effects: z.array(DialogueEffectSchema).optional(),
      }),
    )
    .optional(),
  /** Auto-advance to this node (for linear sequences) */
  next: z.string().optional(),
  /** Effects triggered when this node is displayed */
  effects: z.array(DialogueEffectSchema).optional(),
  /** If true, this is a terminal node (ends conversation) */
  terminal: z.boolean().default(false),
});
export type DialogueNode = z.infer<typeof DialogueNodeSchema>;

/** A complete dialogue tree */
export const DialogueTreeSchema = z.object({
  id: z.string().min(1),
  /** NPC or context this dialogue belongs to */
  owner: z.string(),
  /** Starting node ID */
  startNode: z.string(),
  /** All nodes in this tree */
  nodes: z.array(DialogueNodeSchema).min(1),
});
export type DialogueTree = z.infer<typeof DialogueTreeSchema>;
