import { createActions, type Entity } from 'koota';
import type { EquipSlot } from '../../schemas/item.schema';
import { getItemDef } from '../item-registry';
import type { ItemStack } from '../traits';
import {
  Dialogue,
  DistanceTraveled,
  Equipment,
  Health,
  Interactable,
  Inventory,
  IsNPC,
  IsPlayer,
  IsQuestGiver,
  Movement,
  NPCArchetype,
  PlayerInput,
  Position,
  QuestLog,
  Rotation,
  Stamina,
  Velocity,
} from '../traits';

export const playerActions = createActions((world) => ({
  spawnPlayer: (x: number, y: number, z: number) =>
    world.spawn(
      IsPlayer,
      Position({ x, y, z }),
      Velocity,
      Rotation,
      Health,
      Stamina,
      Movement,
      PlayerInput,
      DistanceTraveled,
      QuestLog,
      Inventory,
      Equipment,
    ),
  updateInput: (
    entity: Entity,
    input: Partial<{
      forward: boolean;
      backward: boolean;
      left: boolean;
      right: boolean;
      strafeLeft: boolean;
      strafeRight: boolean;
      jump: boolean;
      walk: boolean;
      interact: boolean;
    }>,
  ) => {
    entity.set(PlayerInput, input);
  },
}));

export const npcActions = createActions((world) => ({
  spawnNPC: (options: {
    x: number;
    y: number;
    z: number;
    archetype: string;
    greetings: string[];
    questDialogue?: Record<string, string[]>;
    interactRadius?: number;
    actionVerb?: string;
  }) =>
    world.spawn(
      IsNPC,
      Position({ x: options.x, y: options.y, z: options.z }),
      Rotation,
      NPCArchetype({ archetype: options.archetype }),
      Dialogue,
      Interactable({
        radius: options.interactRadius ?? 3,
        actionVerb: options.actionVerb ?? 'Talk',
      }),
    ),
}));

export const questActions = createActions((_world) => ({
  startQuest: (entity: Entity, questId: string) => {
    const log = entity.get(QuestLog);
    if (!log) return;
    const alreadyActive = log.activeQuests.some((q) => q.questId === questId);
    if (alreadyActive) return;
    entity.set(QuestLog, {
      ...log,
      activeQuests: [...log.activeQuests, { questId, currentStep: 0 }],
    });
  },
  chooseBranch: (entity: Entity, questId: string, branch: 'A' | 'B') => {
    const log = entity.get(QuestLog);
    if (!log) return;
    entity.set(QuestLog, {
      ...log,
      activeQuests: log.activeQuests.map((q) =>
        q.questId === questId ? { ...q, branch } : q,
      ),
    });
  },
  advanceStep: (entity: Entity, questId: string) => {
    const log = entity.get(QuestLog);
    if (!log) return;
    entity.set(QuestLog, {
      ...log,
      activeQuests: log.activeQuests.map((q) =>
        q.questId === questId ? { ...q, currentStep: q.currentStep + 1 } : q,
      ),
    });
  },
  completeQuest: (entity: Entity, questId: string) => {
    const log = entity.get(QuestLog);
    if (!log) return;
    entity.set(QuestLog, {
      ...log,
      activeQuests: log.activeQuests.filter((q) => q.questId !== questId),
      completedQuests: [...log.completedQuests, questId],
    });
  },
  assignQuestGiver: (npcEntity: Entity, questId: string) => {
    if (!npcEntity.has(IsQuestGiver)) {
      npcEntity.add(IsQuestGiver({ questId }));
    } else {
      npcEntity.set(IsQuestGiver, { questId });
    }
  },
}));

export type InventoryResult = { ok: true } | { ok: false; reason: string };

export const inventoryActions = createActions((_world) => ({
  addItem: (entity: Entity, itemId: string, quantity = 1): InventoryResult => {
    const inv = entity.get(Inventory);
    if (!inv) return { ok: false, reason: 'Entity has no Inventory trait' };

    const def = getItemDef(itemId);
    const maxStack = def?.stackable ? (def.maxStack ?? 99) : 1;

    // Try to stack onto existing slot first
    const items = [...inv.items];
    let remaining = quantity;

    if (def?.stackable) {
      for (let i = 0; i < items.length && remaining > 0; i++) {
        if (items[i].itemId === itemId) {
          const canAdd = maxStack - items[i].quantity;
          const toAdd = Math.min(canAdd, remaining);
          if (toAdd > 0) {
            items[i] = { ...items[i], quantity: items[i].quantity + toAdd };
            remaining -= toAdd;
          }
        }
      }
    }

    // Add new stacks for remaining quantity
    while (remaining > 0) {
      if (items.length >= inv.maxSlots) {
        entity.set(Inventory, { ...inv, items });
        return { ok: false, reason: 'Inventory is full' };
      }
      const toAdd = Math.min(remaining, maxStack);
      items.push({ itemId, quantity: toAdd });
      remaining -= toAdd;
    }

    entity.set(Inventory, { ...inv, items });
    return { ok: true };
  },

  removeItem: (
    entity: Entity,
    itemId: string,
    quantity = 1,
  ): InventoryResult => {
    const inv = entity.get(Inventory);
    if (!inv) return { ok: false, reason: 'Entity has no Inventory trait' };

    // Count total of this item
    const total = inv.items
      .filter((s) => s.itemId === itemId)
      .reduce((sum, s) => sum + s.quantity, 0);
    if (total < quantity) {
      return { ok: false, reason: 'Not enough items' };
    }

    let remaining = quantity;
    const items: ItemStack[] = [];
    for (const stack of inv.items) {
      if (stack.itemId === itemId && remaining > 0) {
        const toRemove = Math.min(stack.quantity, remaining);
        remaining -= toRemove;
        const newQty = stack.quantity - toRemove;
        if (newQty > 0) {
          items.push({ ...stack, quantity: newQty });
        }
      } else {
        items.push(stack);
      }
    }

    entity.set(Inventory, { ...inv, items });
    return { ok: true };
  },

  equipItem: (entity: Entity, itemId: string): InventoryResult => {
    const inv = entity.get(Inventory);
    const equip = entity.get(Equipment);
    if (!inv) return { ok: false, reason: 'Entity has no Inventory trait' };
    if (!equip) return { ok: false, reason: 'Entity has no Equipment trait' };

    const def = getItemDef(itemId);
    if (!def) return { ok: false, reason: `Unknown item: ${itemId}` };
    if (def.type !== 'equipment') {
      return { ok: false, reason: `${itemId} is not equipment` };
    }
    if (!def.equipSlot) {
      return { ok: false, reason: `${itemId} has no equip slot defined` };
    }

    // Check item is in inventory
    const hasItem = inv.items.some((s) => s.itemId === itemId);
    if (!hasItem) {
      return { ok: false, reason: `${itemId} not in inventory` };
    }

    const slot = def.equipSlot as EquipSlot;
    const currentlyEquipped = equip[slot];

    // Remove item from inventory
    const items = removeOneItem(inv.items, itemId);

    // If something is already equipped in that slot, put it back in inventory
    if (currentlyEquipped) {
      items.push({ itemId: currentlyEquipped, quantity: 1 });
    }

    entity.set(Inventory, { ...inv, items });
    entity.set(Equipment, { ...equip, [slot]: itemId });
    return { ok: true };
  },

  unequipItem: (entity: Entity, slot: EquipSlot): InventoryResult => {
    const inv = entity.get(Inventory);
    const equip = entity.get(Equipment);
    if (!inv) return { ok: false, reason: 'Entity has no Inventory trait' };
    if (!equip) return { ok: false, reason: 'Entity has no Equipment trait' };

    const equippedItemId = equip[slot];
    if (!equippedItemId) {
      return { ok: false, reason: `Nothing equipped in ${slot} slot` };
    }

    // Check inventory has space
    if (inv.items.length >= inv.maxSlots) {
      return { ok: false, reason: 'Inventory is full' };
    }

    const items = [...inv.items, { itemId: equippedItemId, quantity: 1 }];
    entity.set(Inventory, { ...inv, items });
    entity.set(Equipment, { ...equip, [slot]: null });
    return { ok: true };
  },

  addGold: (entity: Entity, amount: number): InventoryResult => {
    const inv = entity.get(Inventory);
    if (!inv) return { ok: false, reason: 'Entity has no Inventory trait' };
    if (amount < 0 && inv.gold + amount < 0) {
      return { ok: false, reason: 'Not enough gold' };
    }
    entity.set(Inventory, { ...inv, gold: inv.gold + amount });
    return { ok: true };
  },

  hasItem: (entity: Entity, itemId: string, quantity = 1): boolean => {
    const inv = entity.get(Inventory);
    if (!inv) return false;
    const total = inv.items
      .filter((s) => s.itemId === itemId)
      .reduce((sum, s) => sum + s.quantity, 0);
    return total >= quantity;
  },

  getItemCount: (entity: Entity, itemId: string): number => {
    const inv = entity.get(Inventory);
    if (!inv) return 0;
    return inv.items
      .filter((s) => s.itemId === itemId)
      .reduce((sum, s) => sum + s.quantity, 0);
  },
}));

/** Remove exactly one of an item from the items array */
function removeOneItem(items: ItemStack[], itemId: string): ItemStack[] {
  const result: ItemStack[] = [];
  let removed = false;
  for (const stack of items) {
    if (!removed && stack.itemId === itemId) {
      if (stack.quantity > 1) {
        result.push({ ...stack, quantity: stack.quantity - 1 });
      }
      removed = true;
    } else {
      result.push(stack);
    }
  }
  return result;
}
