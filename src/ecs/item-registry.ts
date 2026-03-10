import type { ItemDefinition } from '../schemas/item.schema';

/**
 * Runtime registry of item definitions.
 * Populated at startup from content/items/ JSON files.
 * Actions query this to validate stacking, equip slots, etc.
 */
const registry = new Map<string, ItemDefinition>();

export function registerItem(item: ItemDefinition): void {
  registry.set(item.id, item);
}

export function registerItems(items: ItemDefinition[]): void {
  for (const item of items) {
    registry.set(item.id, item);
  }
}

export function getItemDef(itemId: string): ItemDefinition | undefined {
  return registry.get(itemId);
}

export function hasItemDef(itemId: string): boolean {
  return registry.has(itemId);
}

export function clearRegistry(): void {
  registry.clear();
}

export function getAllItems(): ItemDefinition[] {
  return Array.from(registry.values());
}
