import { trait } from 'koota';

/**
 * Session-scoped inventory UI state (per Koota Phase 1).
 *
 * The inventory *data* (items, gold, equipment) still lives on the player
 * entity's `Inventory` + `Equipment` traits — that's the authoritative model.
 * This trait captures the UI-only flag: is the inventory panel open on screen?
 *
 * Attached to the singleton session entity via `getSessionEntity()`.
 */
export const InventoryUI = trait(() => ({
  isOpen: false,
}));
