import { z } from 'zod';
import { RoadSpineSchema } from './world.schema';
import { QuestDefinitionSchema } from './quest.schema';
import { NPCDefinitionSchema } from './npc.schema';
import { FeatureDefinitionSchema } from './feature.schema';
import { ItemDefinitionSchema } from './item.schema';
import { EncounterDefinitionSchema } from './encounter.schema';
import { PacingConfigSchema } from './pacing.schema';

export const GameConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  name: z.literal('kings-road'),
  world: RoadSpineSchema,
  pacing: PacingConfigSchema,
  mainQuest: z.array(QuestDefinitionSchema).min(1),
  sideQuests: z.object({
    macro: z.array(QuestDefinitionSchema),
    meso: z.array(QuestDefinitionSchema),
    micro: z.array(QuestDefinitionSchema),
  }),
  npcs: z.array(NPCDefinitionSchema),
  features: z.array(FeatureDefinitionSchema),
  items: z.array(ItemDefinitionSchema),
  encounters: z.array(EncounterDefinitionSchema),
});
export type GameConfig = z.infer<typeof GameConfigSchema>;
