import { describe, expect, it } from 'vitest';
import { cyrb128, mulberry32 } from '@/core';
import type { LootTable } from '@/schemas/encounter-table.schema';
import { rollLootFromTable } from './loot-resolver';

function makeRng(seed = 'test-loot') {
  return mulberry32(cyrb128(seed));
}

const BASIC_TABLE: LootTable = {
  id: 'test-loot',
  entries: [
    { itemId: 'health_potion', weight: 0.5, quantity: [1, 3] },
    { itemId: 'iron_sword', weight: 0.1, quantity: [1, 1] },
    { itemId: 'ration', weight: 0.8, quantity: [2, 5] },
  ],
};

const GUARANTEED_TABLE: LootTable = {
  id: 'guaranteed-loot',
  entries: [
    { itemId: 'gold_coin', weight: 1.0, quantity: [10, 10] },
    { itemId: 'gem', weight: 1.0, quantity: [1, 1] },
  ],
};

const EMPTY_TABLE: LootTable = {
  id: 'empty-loot',
  entries: [],
};

const ZERO_WEIGHT_TABLE: LootTable = {
  id: 'no-drop',
  entries: [{ itemId: 'nothing', weight: 0, quantity: [1, 1] }],
};

describe('rollLootFromTable', () => {
  it('returns an array of drops', () => {
    const drops = rollLootFromTable(BASIC_TABLE, makeRng());
    expect(Array.isArray(drops)).toBe(true);
  });

  it('drops have itemId and quantity', () => {
    const drops = rollLootFromTable(GUARANTEED_TABLE, makeRng());
    for (const drop of drops) {
      expect(drop.itemId).toBeDefined();
      expect(typeof drop.quantity).toBe('number');
      expect(drop.quantity).toBeGreaterThan(0);
    }
  });

  it('guaranteed drops always drop', () => {
    const drops = rollLootFromTable(GUARANTEED_TABLE, makeRng());
    expect(drops.length).toBe(2);
    expect(drops[0].itemId).toBe('gold_coin');
    expect(drops[0].quantity).toBe(10);
    expect(drops[1].itemId).toBe('gem');
    expect(drops[1].quantity).toBe(1);
  });

  it('empty table produces no drops', () => {
    const drops = rollLootFromTable(EMPTY_TABLE, makeRng());
    expect(drops).toEqual([]);
  });

  it('zero-weight entries never drop', () => {
    // Roll many times — none should ever drop
    for (let i = 0; i < 50; i++) {
      const drops = rollLootFromTable(ZERO_WEIGHT_TABLE, makeRng(`seed-${i}`));
      expect(drops).toEqual([]);
    }
  });

  it('quantities are within the specified range', () => {
    // Run multiple trials
    for (let i = 0; i < 100; i++) {
      const drops = rollLootFromTable(BASIC_TABLE, makeRng(`trial-${i}`));
      for (const drop of drops) {
        const entry = BASIC_TABLE.entries.find((e) => e.itemId === drop.itemId);
        expect(entry).toBeDefined();
        const [minQty, maxQty] = entry!.quantity;
        expect(drop.quantity).toBeGreaterThanOrEqual(minQty);
        expect(drop.quantity).toBeLessThanOrEqual(maxQty);
      }
    }
  });

  it('produces deterministic results for the same seed', () => {
    const a = rollLootFromTable(BASIC_TABLE, makeRng('deterministic'));
    const b = rollLootFromTable(BASIC_TABLE, makeRng('deterministic'));
    expect(a).toEqual(b);
  });

  it('produces different results for different seeds', () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const drops = rollLootFromTable(BASIC_TABLE, makeRng(`vary-${i}`));
      results.add(JSON.stringify(drops));
    }
    // With 20 different seeds and probabilistic drops, we expect variation
    expect(results.size).toBeGreaterThan(1);
  });

  it('ration drops frequently (weight 0.8)', () => {
    let rationCount = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      const drops = rollLootFromTable(BASIC_TABLE, makeRng(`freq-${i}`));
      if (drops.some((d) => d.itemId === 'ration')) rationCount++;
    }
    // With weight 0.8, expect roughly 160/200 drops (allow wide margin)
    expect(rationCount).toBeGreaterThan(100);
  });

  it('iron_sword drops rarely (weight 0.1)', () => {
    let swordCount = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      const drops = rollLootFromTable(BASIC_TABLE, makeRng(`rare-${i}`));
      if (drops.some((d) => d.itemId === 'iron_sword')) swordCount++;
    }
    // With weight 0.1, expect roughly 20/200 drops (allow margin)
    expect(swordCount).toBeLessThan(60);
    expect(swordCount).toBeGreaterThan(0);
  });

  it('multiple entries can drop simultaneously', () => {
    // Guaranteed table should always give both items
    const drops = rollLootFromTable(GUARANTEED_TABLE, makeRng());
    expect(drops.length).toBe(2);
  });
});
