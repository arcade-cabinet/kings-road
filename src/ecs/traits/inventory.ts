import { trait } from 'koota';

/** A single item stack in the inventory */
export interface ItemStack {
  itemId: string;
  quantity: number;
}

/** Equipment slots mapped to item IDs (null = empty slot) */
export interface EquippedItems {
  head: string | null;
  chest: string | null;
  legs: string | null;
  feet: string | null;
  weapon: string | null;
  shield: string | null;
  accessory: string | null;
}

/** Maximum number of inventory slots */
export const MAX_INVENTORY_SLOTS = 20;

export const Inventory = trait(() => ({
  items: [] as ItemStack[],
  maxSlots: MAX_INVENTORY_SLOTS,
  gold: 0,
}));

export const Equipment = trait(() => ({
  head: null as string | null,
  chest: null as string | null,
  legs: null as string | null,
  feet: null as string | null,
  weapon: null as string | null,
  shield: null as string | null,
  accessory: null as string | null,
}));
