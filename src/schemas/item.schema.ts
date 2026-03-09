import { z } from 'zod';

export const ItemDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60),
  description: z.string().min(10).max(300),
  type: z.enum([
    'key_item',
    'consumable',
    'equipment',
    'quest_item',
    'modifier',
  ]),
  effect: z
    .object({
      stat: z.string().optional(),
      value: z.number().optional(),
      duration: z.number().optional(),
    })
    .optional(),
  stackable: z.boolean().default(false),
});
export type ItemDefinition = z.infer<typeof ItemDefinitionSchema>;
