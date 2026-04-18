import { beforeEach, describe, expect, it } from 'vitest';
import {
  closeInventory,
  getInventorySnapshot,
  isInventoryOpen,
  openInventory,
  syncInventory,
  toggleInventory,
} from '@/ecs/actions/inventory-ui';
import { InventoryUI } from '@/ecs/traits/session-inventory';
import { getSessionEntity, unsafe_resetSessionEntity } from '@/ecs/world';

describe('inventory-ui actions (Koota trait)', () => {
  beforeEach(() => {
    unsafe_resetSessionEntity();
  });

  it('openInventory attaches InventoryUI and sets isOpen true', () => {
    openInventory();
    expect(isInventoryOpen()).toBe(true);
    const proxy = getSessionEntity() as unknown as {
      has: (t: typeof InventoryUI) => boolean;
      get: (t: typeof InventoryUI) => { isOpen: boolean };
    };
    expect(proxy.has(InventoryUI)).toBe(true);
    expect(proxy.get(InventoryUI).isOpen).toBe(true);
  });

  it('closeInventory clears isOpen', () => {
    openInventory();
    closeInventory();
    expect(isInventoryOpen()).toBe(false);
  });

  it('toggleInventory flips state', () => {
    toggleInventory();
    expect(isInventoryOpen()).toBe(true);
    toggleInventory();
    expect(isInventoryOpen()).toBe(false);
  });

  it('syncInventory updates items/maxSlots/gold/equipped without touching isOpen', () => {
    syncInventory([{ itemId: 'sword', quantity: 1 }], 25, 42, {
      head: null,
      chest: null,
      legs: null,
      feet: null,
      weapon: 'sword',
      shield: null,
      accessory: null,
    });
    const snap = getInventorySnapshot();
    expect(snap.items).toHaveLength(1);
    expect(snap.maxSlots).toBe(25);
    expect(snap.gold).toBe(42);
    expect(snap.equipped.weapon).toBe('sword');
    expect(snap.isOpen).toBe(false);
  });
});
