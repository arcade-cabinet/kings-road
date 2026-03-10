import { createWorld } from 'koota';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Equipment, Inventory, MAX_INVENTORY_SLOTS } from './inventory';

describe('Inventory Traits', () => {
  let world: ReturnType<typeof createWorld>;

  beforeEach(() => {
    world = createWorld();
  });

  afterEach(() => {
    world.destroy();
  });

  describe('Inventory', () => {
    it('starts with empty items and default max slots', () => {
      const entity = world.spawn(Inventory);
      const inv = entity.get(Inventory);
      expect(inv?.items).toEqual([]);
      expect(inv?.maxSlots).toBe(MAX_INVENTORY_SLOTS);
      expect(inv?.gold).toBe(0);
    });

    it('accepts custom initial values', () => {
      const entity = world.spawn(
        Inventory({
          items: [{ itemId: 'health_potion', quantity: 3 }],
          maxSlots: 10,
          gold: 50,
        }),
      );
      const inv = entity.get(Inventory);
      expect(inv?.items).toHaveLength(1);
      expect(inv?.items[0].itemId).toBe('health_potion');
      expect(inv?.items[0].quantity).toBe(3);
      expect(inv?.maxSlots).toBe(10);
      expect(inv?.gold).toBe(50);
    });

    it('items array is independent between entities', () => {
      const e1 = world.spawn(Inventory);
      const e2 = world.spawn(Inventory);
      e1.set(Inventory, {
        items: [{ itemId: 'iron_sword', quantity: 1 }],
        maxSlots: MAX_INVENTORY_SLOTS,
        gold: 0,
      });
      expect(e2.get(Inventory)?.items).toEqual([]);
    });
  });

  describe('Equipment', () => {
    it('starts with all slots empty', () => {
      const entity = world.spawn(Equipment);
      const equip = entity.get(Equipment);
      expect(equip?.head).toBeNull();
      expect(equip?.chest).toBeNull();
      expect(equip?.legs).toBeNull();
      expect(equip?.feet).toBeNull();
      expect(equip?.weapon).toBeNull();
      expect(equip?.shield).toBeNull();
      expect(equip?.accessory).toBeNull();
    });

    it('can set individual equipment slots', () => {
      const entity = world.spawn(Equipment);
      const equip = entity.get(Equipment)!;
      entity.set(Equipment, { ...equip, weapon: 'iron_sword' });
      expect(entity.get(Equipment)?.weapon).toBe('iron_sword');
      expect(entity.get(Equipment)?.chest).toBeNull();
    });

    it('equipment is independent between entities', () => {
      const e1 = world.spawn(Equipment);
      const e2 = world.spawn(Equipment);
      const equip = e1.get(Equipment)!;
      e1.set(Equipment, { ...equip, weapon: 'iron_sword' });
      expect(e2.get(Equipment)?.weapon).toBeNull();
    });
  });
});
