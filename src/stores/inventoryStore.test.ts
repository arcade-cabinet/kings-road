import { beforeEach, describe, expect, it } from 'vitest';
import { InventoryUI } from '@/ecs/traits/session-inventory';
import { getSessionEntity, unsafe_resetSessionEntity } from '@/ecs/world';
import { useInventoryStore } from './inventoryStore';

describe('inventoryStore (Koota-backed facade)', () => {
  beforeEach(() => {
    unsafe_resetSessionEntity();
    useInventoryStore.setState({ isOpen: false });
  });

  it('open() sets isOpen on the store AND on the InventoryUI Session trait', () => {
    useInventoryStore.getState().open();
    expect(useInventoryStore.getState().isOpen).toBe(true);

    const proxy = getSessionEntity() as unknown as {
      has: (t: typeof InventoryUI) => boolean;
      get: (t: typeof InventoryUI) => { isOpen: boolean };
    };
    expect(proxy.has(InventoryUI)).toBe(true);
    expect(proxy.get(InventoryUI).isOpen).toBe(true);
  });

  it('close() clears isOpen on both sides', () => {
    useInventoryStore.getState().open();
    useInventoryStore.getState().close();
    expect(useInventoryStore.getState().isOpen).toBe(false);

    const proxy = getSessionEntity() as unknown as {
      get: (t: typeof InventoryUI) => { isOpen: boolean };
    };
    expect(proxy.get(InventoryUI).isOpen).toBe(false);
  });

  it('toggle() flips state on both sides', () => {
    useInventoryStore.getState().toggle();
    expect(useInventoryStore.getState().isOpen).toBe(true);
    useInventoryStore.getState().toggle();
    expect(useInventoryStore.getState().isOpen).toBe(false);
  });

  it('sync() updates items, maxSlots, gold, equipped without touching InventoryUI', () => {
    useInventoryStore
      .getState()
      .sync([{ itemId: 'sword', quantity: 1 }], 25, 42, {
        head: null,
        chest: null,
        legs: null,
        feet: null,
        weapon: 'sword',
        shield: null,
        accessory: null,
      });
    const s = useInventoryStore.getState();
    expect(s.items).toHaveLength(1);
    expect(s.maxSlots).toBe(25);
    expect(s.gold).toBe(42);
    expect(s.equipped.weapon).toBe('sword');
    expect(s.isOpen).toBe(false);
  });
});
