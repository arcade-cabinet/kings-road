import { getItemDef } from '@/ecs/item-registry';
import type { EquippedItems, ItemStack } from '@/ecs/traits/inventory';
import { InventoryUI } from '@/ecs/traits/session-inventory';
import { getSessionEntity } from '@/ecs/world';
import type { ItemDefinition } from '@/schemas/item.schema';

type SessionProxy = {
  has: (t: typeof InventoryUI) => boolean;
  add: (t: typeof InventoryUI) => void;
  get: (t: typeof InventoryUI) => {
    isOpen: boolean;
    items: ItemStack[];
    maxSlots: number;
    gold: number;
    equipped: EquippedItems;
  };
  set: (
    t: typeof InventoryUI,
    value: {
      isOpen: boolean;
      items: ItemStack[];
      maxSlots: number;
      gold: number;
      equipped: EquippedItems;
    },
  ) => void;
};

function session(): SessionProxy {
  const proxy = getSessionEntity() as unknown as SessionProxy;
  if (!proxy.has(InventoryUI)) proxy.add(InventoryUI);
  return proxy;
}

export function openInventory(): void {
  const s = session();
  s.set(InventoryUI, { ...s.get(InventoryUI), isOpen: true });
}

export function closeInventory(): void {
  const s = session();
  s.set(InventoryUI, { ...s.get(InventoryUI), isOpen: false });
}

export function toggleInventory(): void {
  const s = session();
  const cur = s.get(InventoryUI);
  s.set(InventoryUI, { ...cur, isOpen: !cur.isOpen });
}

export function isInventoryOpen(): boolean {
  return session().get(InventoryUI).isOpen;
}

export function syncInventory(
  items: ItemStack[],
  maxSlots: number,
  gold: number,
  equipped: EquippedItems,
): void {
  const s = session();
  s.set(InventoryUI, {
    ...s.get(InventoryUI),
    items,
    maxSlots,
    gold,
    equipped,
  });
}

export function getInventorySnapshot(): {
  isOpen: boolean;
  items: ItemStack[];
  maxSlots: number;
  gold: number;
  equipped: EquippedItems;
} {
  return session().get(InventoryUI);
}

/** Item-definition / presentation helpers — pure lookups, keep near consumers. */

export function getItemInfo(itemId: string): ItemDefinition | undefined {
  return getItemDef(itemId);
}

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
