import { trait } from 'koota';
import type { EquippedItems, ItemStack } from '@/ecs/traits/inventory';

/**
 * Session-scoped inventory state.
 *
 * Holds the player's live inventory snapshot (items, gold, equipment) as
 * well as the UI open flag. Authoritative for inventory UI rendering.
 * Populated by save restore, panel actions, and loot pickups via the
 * action functions in `@/ecs/actions/inventory-ui`.
 *
 * Attached to the singleton session entity via `getSessionEntity()`.
 */

const EMPTY_EQUIPPED: EquippedItems = {
  head: null,
  chest: null,
  legs: null,
  feet: null,
  weapon: null,
  shield: null,
  accessory: null,
};

export const InventoryUI = trait(() => ({
  isOpen: false,
  items: [] as ItemStack[],
  maxSlots: 20,
  gold: 0,
  equipped: { ...EMPTY_EQUIPPED } as EquippedItems,
}));
