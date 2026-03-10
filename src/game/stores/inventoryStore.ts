/**
 * Inventory UI store — Zustand bridge for the Koota ECS inventory state.
 *
 * The ECS owns the authoritative inventory data (Inventory + Equipment traits).
 * This store provides a React-friendly snapshot that the UI can subscribe to.
 * Call `syncFromECS()` after any ECS inventory mutation to update the UI.
 */

import { create } from 'zustand';
import { getItemDef } from '../../ecs/item-registry';
import type { EquippedItems, ItemStack } from '../../ecs/traits/inventory';
import type { ItemDefinition } from '../../schemas/item.schema';

export interface InventoryUIState {
  /** Current inventory items (snapshot from ECS) */
  items: ItemStack[];
  /** Maximum inventory slots */
  maxSlots: number;
  /** Current gold */
  gold: number;
  /** Equipped items by slot */
  equipped: EquippedItems;
  /** Whether the inventory screen is open */
  isOpen: boolean;

  // Actions
  /** Sync from ECS state — called after ECS mutations */
  sync: (
    items: ItemStack[],
    maxSlots: number,
    gold: number,
    equipped: EquippedItems,
  ) => void;
  /** Toggle inventory open/close */
  toggle: () => void;
  /** Open inventory */
  open: () => void;
  /** Close inventory */
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

export const useInventoryStore = create<InventoryUIState>((set) => ({
  items: [],
  maxSlots: 20,
  gold: 0,
  equipped: EMPTY_EQUIPPED,
  isOpen: false,

  sync: (items, maxSlots, gold, equipped) =>
    set({ items, maxSlots, gold, equipped }),

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
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
