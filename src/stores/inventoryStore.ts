/**
 * Inventory UI store — Zustand facade wired to Koota traits.
 *
 * Authoritative state now lives in the ECS:
 *   - Player `Inventory` trait: items, maxSlots, gold
 *   - Player `Equipment` trait: equipped slot → item id
 *   - Session `InventoryUI` trait: UI open flag
 *
 * This store exists only as a compatibility shim so existing callsites
 * (~15 across app/ + src/hooks/) keep working while we finish Phase 1.
 * Future commits will replace each `useInventoryStore(...)` call with
 * `useTrait(entity, Trait)` reads and then delete this module.
 */

import { create } from 'zustand';
import { getItemDef } from '@/ecs/item-registry';
import type { EquippedItems, ItemStack } from '@/ecs/traits/inventory';
import { InventoryUI } from '@/ecs/traits/session-inventory';
import { getSessionEntity } from '@/ecs/world';
import type { ItemDefinition } from '@/schemas/item.schema';

export interface InventoryUIState {
  items: ItemStack[];
  maxSlots: number;
  gold: number;
  equipped: EquippedItems;
  isOpen: boolean;

  sync: (
    items: ItemStack[],
    maxSlots: number,
    gold: number,
    equipped: EquippedItems,
  ) => void;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const EMPTY_EQUIPPED: EquippedItems = {
  head: null,
  chest: null,
  legs: null,
  feet: null,
  weapon: null,
  shield: null,
  accessory: null,
};

/**
 * Lazy-attach InventoryUI to the session entity and return a setter that
 * writes through to Koota while pushing a snapshot back into the store so
 * selectors re-render.
 */
function writeInventoryOpen(isOpen: boolean): void {
  const entity = getSessionEntity();
  const proxy = entity as unknown as {
    has: (t: typeof InventoryUI) => boolean;
    add: (t: typeof InventoryUI) => void;
    set: (t: typeof InventoryUI, v: { isOpen: boolean }) => void;
  };
  if (!proxy.has(InventoryUI)) {
    proxy.add(InventoryUI);
  }
  proxy.set(InventoryUI, { isOpen });
}

export const useInventoryStore = create<InventoryUIState>((set) => ({
  items: [],
  maxSlots: 20,
  gold: 0,
  equipped: EMPTY_EQUIPPED,
  isOpen: false,

  sync: (items, maxSlots, gold, equipped) =>
    set({ items, maxSlots, gold, equipped }),

  toggle: () =>
    set((s) => {
      const next = !s.isOpen;
      writeInventoryOpen(next);
      return { isOpen: next };
    }),
  open: () => {
    writeInventoryOpen(true);
    set({ isOpen: true });
  },
  close: () => {
    writeInventoryOpen(false);
    set({ isOpen: false });
  },
}));

/** Helper: look up item definition from the registry */
export function getItemInfo(itemId: string): ItemDefinition | undefined {
  return getItemDef(itemId);
}

/** Helper: get the equip slot label */
const SLOT_LABELS: Record<string, string> = {
  head: 'Helm',
  chest: 'Armor',
  legs: 'Greaves',
  feet: 'Boots',
  weapon: 'Weapon',
  shield: 'Shield',
  accessory: 'Amulet',
};

export function getSlotLabel(slot: string): string {
  return SLOT_LABELS[slot] ?? slot;
}

/** Helper: rarity color */
const RARITY_COLORS: Record<string, string> = {
  common: '#8b8680',
  uncommon: '#7a9b6e',
  rare: '#4488cc',
  epic: '#9966cc',
  legendary: '#c4a747',
};

export function getRarityColor(rarity?: string): string {
  return RARITY_COLORS[rarity ?? 'common'] ?? '#8b8680';
}
