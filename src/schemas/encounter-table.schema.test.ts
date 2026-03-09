import { describe, expect, it } from 'vitest';
import { EncounterTableSchema, LootTableSchema } from './encounter-table.schema';

describe('EncounterTableSchema', () => {
  it('accepts a valid tier-1 encounter table', () => {
    const table = {
      id: 'road_shoulder',
      dangerTier: 1,
      entries: [
        { monsterId: 'wolf', weight: 0.6, count: [1, 3] },
        { monsterId: 'bandit', weight: 0.4, count: [1, 2] },
      ],
      lootTable: 'common_wildlife',
    };
    expect(() => EncounterTableSchema.parse(table)).not.toThrow();
  });
});

describe('LootTableSchema', () => {
  it('accepts a valid loot table', () => {
    const table = {
      id: 'common_wildlife',
      entries: [
        { itemId: 'wolf_pelt', weight: 0.5, quantity: [1, 2] },
        { itemId: 'raw_meat', weight: 0.8, quantity: [1, 3] },
      ],
    };
    expect(() => LootTableSchema.parse(table)).not.toThrow();
  });
});
