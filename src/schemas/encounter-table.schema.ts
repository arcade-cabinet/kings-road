import { z } from 'zod';

export const LootEntrySchema = z.object({
  itemId: z.string(),
  weight: z.number().min(0).max(1),
  quantity: z.tuple([z.number().int(), z.number().int()]).default([1, 1]),
});

export const EncounterTableEntrySchema = z.object({
  monsterId: z.string(),
  weight: z.number().min(0).max(1),
  count: z.tuple([z.number().int(), z.number().int()]).default([1, 1]),
});

export const EncounterTableSchema = z.object({
  id: z.string(),
  dangerTier: z.number().int().min(0).max(4),
  entries: z.array(EncounterTableEntrySchema).min(1),
  lootTable: z.string().optional(),
});
export type EncounterTable = z.infer<typeof EncounterTableSchema>;

export const LootTableSchema = z.object({
  id: z.string(),
  entries: z.array(LootEntrySchema),
});
export type LootTable = z.infer<typeof LootTableSchema>;
