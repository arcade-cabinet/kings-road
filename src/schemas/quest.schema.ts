import { z } from 'zod';

export const QuestTier = z.enum(['macro', 'meso', 'micro']);
export type QuestTier = z.infer<typeof QuestTier>;

export const QuestRewardSchema = z.object({
  type: z.enum(['item', 'modifier', 'unlock', 'currency']),
  itemId: z.string().optional(),
  modifierId: z.string().optional(),
  unlockId: z.string().optional(),
  amount: z.number().optional(),
});
export type QuestReward = z.infer<typeof QuestRewardSchema>;

export const QuestStepSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['dialogue', 'fetch', 'escort', 'investigate', 'encounter', 'travel', 'puzzle']),
  description: z.string().max(500).optional(),
  npcArchetype: z.string().optional(),
  dialogue: z.string().optional(),
  dialogueMinWords: z.number().int().positive().default(15),
  dialogueMaxWords: z.number().int().positive().default(80),
  destination: z.string().optional(),
  itemId: z.string().optional(),
  encounterId: z.string().optional(),
}).refine(
  (step) => {
    if (step.type === 'dialogue' && step.dialogue) {
      const wordCount = step.dialogue.split(/\s+/).length;
      return wordCount >= step.dialogueMinWords;
    }
    return true;
  },
  { message: 'Dialogue does not meet minimum word count' }
);
export type QuestStep = z.infer<typeof QuestStepSchema>;

export const QuestBranchSchema = z.object({
  label: z.string().min(3).max(100),
  steps: z.array(QuestStepSchema).min(1),
  reward: QuestRewardSchema.optional(),
});
export type QuestBranch = z.infer<typeof QuestBranchSchema>;

export const QuestTriggerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('roadside'), distanceRange: z.tuple([z.number(), z.number()]) }),
  z.object({ type: z.literal('anchor'), anchorId: z.string() }),
  z.object({ type: z.literal('prerequisite'), questId: z.string() }),
]);
export type QuestTrigger = z.infer<typeof QuestTriggerSchema>;

export const QuestDefinitionSchema = z.object({
  id: z.string().min(1),
  tier: QuestTier,
  title: z.string().min(3).max(100),
  estimatedMinutes: z.number().positive(),
  anchorAffinity: z.string(),
  trigger: QuestTriggerSchema,
  // Linear quests use steps, branching quests use branches
  steps: z.array(QuestStepSchema).optional(),
  branches: z.object({ A: QuestBranchSchema, B: QuestBranchSchema }).optional(),
  prerequisites: z.array(z.string()).optional(),
  reward: QuestRewardSchema,
}).refine(
  (q) => q.steps || q.branches,
  { message: 'Quest must have either steps or branches' }
).refine(
  (q) => q.tier === 'micro' || q.branches,
  { message: 'Meso and macro quests must have A/B branches' }
);
export type QuestDefinition = z.infer<typeof QuestDefinitionSchema>;
