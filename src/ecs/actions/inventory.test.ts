import { createWorld, type World } from 'koota';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearRegistry, registerItem } from '../item-registry';
import { Equipment, Inventory } from '../traits';
import { inventoryActions, playerActions } from './index';

describe('inventoryActions', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld();
    clearRegistry();
    // Register test items
    registerItem({
      id: 'health_potion',
      name: 'Health Potion',
      description: 'Restores 25 health points.',
      type: 'consumable',
      stackable: true,
      maxStack: 10,
    });
    registerItem({
      id: 'iron_sword',
      name: 'Iron Sword',
      description: 'A sturdy blade forged by the smiths of Ashford.',
      type: 'equipment',
      stackable: false,
      equipSlot: 'weapon',
      statModifiers: [{ stat: 'damage', value: 5, mode: 'flat' }],
    });
    registerItem({
      id: 'leather_armor',
      name: 'Leather Armor',
      description: 'Tanned hide shaped into a breastplate and pauldrons.',
      type: 'equipment',
      stackable: false,
      equipSlot: 'chest',
      statModifiers: [{ stat: 'defense', value: 4, mode: 'flat' }],
    });
    registerItem({
      id: 'wooden_shield',
      name: 'Wooden Shield',
      description: 'An oak shield banded with iron. Rough-hewn but reliable.',
      type: 'equipment',
      stackable: false,
      equipSlot: 'shield',
    });
    registerItem({
      id: 'map_fragment_1',
      name: 'Map Fragment',
      description: 'A torn piece of parchment with faded markings.',
      type: 'quest_item',
      stackable: false,
    });
    registerItem({
      id: 'ration',
      name: 'Ration',
      description: 'Dried meat and hard bread. Sustains a traveller.',
      type: 'consumable',
      stackable: true,
      maxStack: 20,
    });
  });

  afterEach(() => {
    world.destroy();
    clearRegistry();
  });

  describe('addItem', () => {
    it('adds a single item to an empty inventory', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      const result = addItem(player, 'iron_sword');
      expect(result).toEqual({ ok: true });

      const inv = player.get(Inventory);
      expect(inv?.items).toHaveLength(1);
      expect(inv?.items[0]).toEqual({ itemId: 'iron_sword', quantity: 1 });
    });

    it('stacks stackable items into the same slot', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'health_potion', 3);
      addItem(player, 'health_potion', 2);

      const inv = player.get(Inventory);
      expect(inv?.items).toHaveLength(1);
      expect(inv?.items[0].quantity).toBe(5);
    });

    it('respects maxStack and creates new stacks when needed', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'health_potion', 10); // fills first stack
      addItem(player, 'health_potion', 5); // creates second stack

      const inv = player.get(Inventory);
      expect(inv?.items).toHaveLength(2);
      expect(inv?.items[0].quantity).toBe(10);
      expect(inv?.items[1].quantity).toBe(5);
    });

    it('adds non-stackable items as separate stacks', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'iron_sword');
      addItem(player, 'iron_sword');

      const inv = player.get(Inventory);
      expect(inv?.items).toHaveLength(2);
      expect(inv?.items[0].quantity).toBe(1);
      expect(inv?.items[1].quantity).toBe(1);
    });

    it('fails when inventory is full', () => {
      const player = world.spawn(
        Inventory({ items: [], maxSlots: 2, gold: 0 }),
      );
      const { addItem } = inventoryActions(world);

      addItem(player, 'iron_sword');
      addItem(player, 'wooden_shield');
      const result = addItem(player, 'leather_armor');

      expect(result).toEqual({ ok: false, reason: 'Inventory is full' });
      expect(player.get(Inventory)?.items).toHaveLength(2);
    });

    it('partially adds items when inventory runs out of space mid-add', () => {
      const player = world.spawn(
        Inventory({ items: [], maxSlots: 2, gold: 0 }),
      );
      const { addItem } = inventoryActions(world);

      // Add 25 potions: fills 2 slots (10 + 10), remaining 5 can't fit
      const result = addItem(player, 'health_potion', 25);

      expect(result).toEqual({ ok: false, reason: 'Inventory is full' });
      const inv = player.get(Inventory);
      expect(inv?.items).toHaveLength(2);
      expect(inv?.items[0].quantity).toBe(10);
      expect(inv?.items[1].quantity).toBe(10);
    });

    it('handles unknown items gracefully (treats as non-stackable)', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      const result = addItem(player, 'mystery_item');
      expect(result).toEqual({ ok: true });
      expect(player.get(Inventory)?.items[0]).toEqual({
        itemId: 'mystery_item',
        quantity: 1,
      });
    });
  });

  describe('removeItem', () => {
    it('removes an item from inventory', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem, removeItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'iron_sword');
      const result = removeItem(player, 'iron_sword');

      expect(result).toEqual({ ok: true });
      expect(player.get(Inventory)?.items).toHaveLength(0);
    });

    it('decrements quantity from a stack', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem, removeItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'health_potion', 5);
      removeItem(player, 'health_potion', 2);

      const inv = player.get(Inventory);
      expect(inv?.items).toHaveLength(1);
      expect(inv?.items[0].quantity).toBe(3);
    });

    it('removes entire stack when quantity reaches zero', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem, removeItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'health_potion', 3);
      removeItem(player, 'health_potion', 3);

      expect(player.get(Inventory)?.items).toHaveLength(0);
    });

    it('fails when not enough items exist', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem, removeItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'health_potion', 2);
      const result = removeItem(player, 'health_potion', 5);

      expect(result).toEqual({ ok: false, reason: 'Not enough items' });
      // Inventory should be unchanged
      expect(player.get(Inventory)?.items[0].quantity).toBe(2);
    });

    it('fails when item does not exist in inventory', () => {
      const { spawnPlayer } = playerActions(world);
      const { removeItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      const result = removeItem(player, 'iron_sword');
      expect(result).toEqual({ ok: false, reason: 'Not enough items' });
    });

    it('removes across multiple stacks', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem, removeItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'health_potion', 10); // stack 1: 10
      addItem(player, 'health_potion', 5); // stack 2: 5
      removeItem(player, 'health_potion', 12);

      const inv = player.get(Inventory);
      expect(inv?.items).toHaveLength(1);
      expect(inv?.items[0].quantity).toBe(3);
    });
  });

  describe('equipItem', () => {
    it('equips an item from inventory', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem, equipItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'iron_sword');
      const result = equipItem(player, 'iron_sword');

      expect(result).toEqual({ ok: true });
      expect(player.get(Equipment)?.weapon).toBe('iron_sword');
      // Item should be removed from inventory
      expect(player.get(Inventory)?.items).toHaveLength(0);
    });

    it('swaps equipped item back to inventory', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem, equipItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'iron_sword');
      equipItem(player, 'iron_sword');

      // Register a second weapon
      registerItem({
        id: 'steel_sword',
        name: 'Steel Sword',
        description: 'A finely honed blade of tempered steel.',
        type: 'equipment',
        stackable: false,
        equipSlot: 'weapon',
      });
      addItem(player, 'steel_sword');
      equipItem(player, 'steel_sword');

      expect(player.get(Equipment)?.weapon).toBe('steel_sword');
      // Old weapon should be back in inventory
      const inv = player.get(Inventory);
      expect(inv?.items.some((s) => s.itemId === 'iron_sword')).toBe(true);
    });

    it('fails for non-equipment items', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem, equipItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'health_potion');
      const result = equipItem(player, 'health_potion');

      expect(result.ok).toBe(false);
    });

    it('fails if item is not in inventory', () => {
      const { spawnPlayer } = playerActions(world);
      const { equipItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      const result = equipItem(player, 'iron_sword');
      expect(result).toEqual({
        ok: false,
        reason: 'iron_sword not in inventory',
      });
    });

    it('fails for unknown items', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem, equipItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'mystery_item');
      const result = equipItem(player, 'mystery_item');

      expect(result).toEqual({
        ok: false,
        reason: 'Unknown item: mystery_item',
      });
    });

    it('equips to correct slot based on item definition', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem, equipItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'iron_sword');
      addItem(player, 'leather_armor');
      addItem(player, 'wooden_shield');

      equipItem(player, 'iron_sword');
      equipItem(player, 'leather_armor');
      equipItem(player, 'wooden_shield');

      const equip = player.get(Equipment);
      expect(equip?.weapon).toBe('iron_sword');
      expect(equip?.chest).toBe('leather_armor');
      expect(equip?.shield).toBe('wooden_shield');
    });
  });

  describe('unequipItem', () => {
    it('moves equipped item back to inventory', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem, equipItem, unequipItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'iron_sword');
      equipItem(player, 'iron_sword');

      const result = unequipItem(player, 'weapon');
      expect(result).toEqual({ ok: true });
      expect(player.get(Equipment)?.weapon).toBeNull();
      expect(player.get(Inventory)?.items).toHaveLength(1);
      expect(player.get(Inventory)?.items[0].itemId).toBe('iron_sword');
    });

    it('fails when slot is empty', () => {
      const { spawnPlayer } = playerActions(world);
      const { unequipItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      const result = unequipItem(player, 'weapon');
      expect(result).toEqual({
        ok: false,
        reason: 'Nothing equipped in weapon slot',
      });
    });

    it('fails when inventory is full', () => {
      const player = world.spawn(
        Inventory({ items: [], maxSlots: 1, gold: 0 }),
        Equipment({
          head: null,
          chest: null,
          legs: null,
          feet: null,
          weapon: 'iron_sword',
          shield: null,
          accessory: null,
        }),
      );
      const { addItem, unequipItem } = inventoryActions(world);

      addItem(player, 'health_potion');

      const result = unequipItem(player, 'weapon');
      expect(result).toEqual({ ok: false, reason: 'Inventory is full' });
      // Item should still be equipped
      expect(player.get(Equipment)?.weapon).toBe('iron_sword');
    });
  });

  describe('addGold', () => {
    it('adds gold to inventory', () => {
      const { spawnPlayer } = playerActions(world);
      const { addGold } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addGold(player, 50);
      expect(player.get(Inventory)?.gold).toBe(50);

      addGold(player, 30);
      expect(player.get(Inventory)?.gold).toBe(80);
    });

    it('subtracts gold with negative amount', () => {
      const { spawnPlayer } = playerActions(world);
      const { addGold } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addGold(player, 100);
      const result = addGold(player, -30);

      expect(result).toEqual({ ok: true });
      expect(player.get(Inventory)?.gold).toBe(70);
    });

    it('fails when spending more gold than available', () => {
      const { spawnPlayer } = playerActions(world);
      const { addGold } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addGold(player, 10);
      const result = addGold(player, -20);

      expect(result).toEqual({ ok: false, reason: 'Not enough gold' });
      expect(player.get(Inventory)?.gold).toBe(10);
    });
  });

  describe('hasItem', () => {
    it('returns true when item exists in sufficient quantity', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem, hasItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'health_potion', 5);
      expect(hasItem(player, 'health_potion', 3)).toBe(true);
      expect(hasItem(player, 'health_potion', 5)).toBe(true);
    });

    it('returns false when not enough items', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem, hasItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'health_potion', 2);
      expect(hasItem(player, 'health_potion', 5)).toBe(false);
    });

    it('returns false when item does not exist', () => {
      const { spawnPlayer } = playerActions(world);
      const { hasItem } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      expect(hasItem(player, 'iron_sword')).toBe(false);
    });
  });

  describe('getItemCount', () => {
    it('returns total count across stacks', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem, getItemCount } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      addItem(player, 'health_potion', 10);
      addItem(player, 'health_potion', 5);

      expect(getItemCount(player, 'health_potion')).toBe(15);
    });

    it('returns 0 for items not in inventory', () => {
      const { spawnPlayer } = playerActions(world);
      const { getItemCount } = inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      expect(getItemCount(player, 'iron_sword')).toBe(0);
    });
  });

  describe('full inventory lifecycle', () => {
    it('runs a complete gear-up scenario', () => {
      const { spawnPlayer } = playerActions(world);
      const { addItem, removeItem, equipItem, addGold, hasItem, getItemCount } =
        inventoryActions(world);
      const player = spawnPlayer(0, 0, 0);

      // Start with some gold and basic supplies
      addGold(player, 100);
      addItem(player, 'health_potion', 5);
      addItem(player, 'ration', 10);
      addItem(player, 'iron_sword');
      addItem(player, 'leather_armor');

      // Equip gear
      equipItem(player, 'iron_sword');
      equipItem(player, 'leather_armor');

      expect(player.get(Equipment)?.weapon).toBe('iron_sword');
      expect(player.get(Equipment)?.chest).toBe('leather_armor');
      expect(player.get(Inventory)?.items).toHaveLength(2); // potions + rations

      // Use some consumables
      removeItem(player, 'health_potion', 2);
      expect(getItemCount(player, 'health_potion')).toBe(3);

      // Buy a shield (spend gold, gain item)
      addGold(player, -25);
      addItem(player, 'wooden_shield');
      equipItem(player, 'wooden_shield');

      expect(player.get(Equipment)?.shield).toBe('wooden_shield');
      expect(player.get(Inventory)?.gold).toBe(75);

      // Swap weapon (unequip then equip new)
      registerItem({
        id: 'steel_sword',
        name: 'Steel Sword',
        description: 'A finely honed blade of tempered steel.',
        type: 'equipment',
        stackable: false,
        equipSlot: 'weapon',
      });
      addItem(player, 'steel_sword');
      equipItem(player, 'steel_sword');

      expect(player.get(Equipment)?.weapon).toBe('steel_sword');
      expect(hasItem(player, 'iron_sword')).toBe(true); // old weapon in inventory
    });
  });
});
