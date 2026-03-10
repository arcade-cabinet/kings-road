/**
 * InventoryScreen — full-screen overlay showing the player's inventory.
 *
 * Opens with 'I' key. Grid-based item display with equipment slots,
 * item tooltips on hover, and gold display. Medieval satchel aesthetic.
 */

import { useState } from 'react';
import type { ItemStack } from '../../../ecs/traits/inventory';
import type { ItemDefinition } from '../../../schemas/item.schema';
import { useGameStore } from '../../stores/gameStore';
import {
  getItemInfo,
  getRarityColor,
  getSlotLabel,
  useInventoryStore,
} from '../../stores/inventoryStore';

// ── Constants ────────────────────────────────────────────────────────────

const ACCENT = '#8b6f47';
const GOLD_COLOR = '#c4a747';
const TEXT = '#3d3a34';
const PARCHMENT = 'rgba(245, 240, 232, 0.95)';
const SLOT_BG = 'rgba(245, 240, 232, 0.6)';
const SLOT_BORDER = 'rgba(139, 111, 71, 0.3)';
const SLOT_HOVER = 'rgba(196, 167, 71, 0.2)';

const EQUIP_SLOTS = [
  'head',
  'chest',
  'legs',
  'feet',
  'weapon',
  'shield',
  'accessory',
] as const;

const ITEM_TYPE_LABELS: Record<string, string> = {
  key_item: 'Key Item',
  consumable: 'Consumable',
  equipment: 'Equipment',
  quest_item: 'Quest Item',
  modifier: 'Modifier',
  crafting_material: 'Material',
};

// ── Item tooltip ─────────────────────────────────────────────────────────

function ItemTooltip({
  item,
  def,
}: {
  item: ItemStack;
  def: ItemDefinition | undefined;
}) {
  if (!def) {
    return (
      <div
        className="absolute z-50 px-3 py-2 pointer-events-none -translate-y-full -top-2 left-1/2 -translate-x-1/2 min-w-[160px]"
        style={{
          background: PARCHMENT,
          border: `1px solid ${SLOT_BORDER}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        <div className="font-lora text-xs font-bold" style={{ color: TEXT }}>
          {item.itemId}
        </div>
      </div>
    );
  }

  const rarityColor = getRarityColor(def.rarity);

  return (
    <div
      className="absolute z-50 px-4 py-3 pointer-events-none -translate-y-full -top-2 left-1/2 -translate-x-1/2 min-w-[200px] max-w-[260px]"
      style={{
        background: PARCHMENT,
        border: `1.5px solid ${SLOT_BORDER}`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      }}
    >
      {/* Name */}
      <div
        className="font-lora text-sm font-bold tracking-wide"
        style={{ color: rarityColor }}
      >
        {def.name}
      </div>

      {/* Type + Rarity */}
      <div className="flex items-center gap-2 mt-0.5">
        <span
          className="font-crimson text-[11px] italic"
          style={{ color: ACCENT }}
        >
          {ITEM_TYPE_LABELS[def.type] ?? def.type}
        </span>
        {def.rarity && def.rarity !== 'common' && (
          <span
            className="font-lora text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: rarityColor }}
          >
            {def.rarity}
          </span>
        )}
      </div>

      {/* Divider */}
      <div
        className="h-px my-2"
        style={{
          background: `linear-gradient(to right, transparent, ${ACCENT}40, transparent)`,
        }}
      />

      {/* Description */}
      <div
        className="font-crimson text-xs italic leading-relaxed"
        style={{ color: TEXT }}
      >
        {def.description}
      </div>

      {/* Stat modifiers */}
      {def.statModifiers && def.statModifiers.length > 0 && (
        <div className="mt-2 flex flex-col gap-0.5">
          {def.statModifiers.map((mod) => (
            <div
              key={mod.stat}
              className="font-lora text-[11px] font-semibold"
              style={{ color: '#7a9b6e' }}
            >
              +{mod.value}{' '}
              {mod.stat.charAt(0).toUpperCase() + mod.stat.slice(1)}
              {mod.mode === 'percent' ? '%' : ''}
            </div>
          ))}
        </div>
      )}

      {/* Stack count */}
      {item.quantity > 1 && (
        <div className="font-lora text-[10px] mt-1.5" style={{ color: ACCENT }}>
          Quantity: {item.quantity}
        </div>
      )}

      {/* Weight + Value */}
      <div className="flex items-center gap-3 mt-1.5">
        {def.weight != null && def.weight > 0 && (
          <span className="font-lora text-[10px]" style={{ color: ACCENT }}>
            Wt: {def.weight}
          </span>
        )}
        {def.value != null && def.value > 0 && (
          <span className="font-lora text-[10px]" style={{ color: GOLD_COLOR }}>
            {def.value}g
          </span>
        )}
      </div>
    </div>
  );
}

// ── Inventory slot ───────────────────────────────────────────────────────

function InventorySlot({ item }: { item: ItemStack | null }) {
  const [hovered, setHovered] = useState(false);
  const def = item ? getItemInfo(item.itemId) : undefined;
  const rarityColor = def ? getRarityColor(def.rarity) : undefined;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tooltip hover on inventory slot
    <div
      className="relative w-14 h-14 flex items-center justify-center cursor-default"
      style={{
        background: hovered && item ? SLOT_HOVER : SLOT_BG,
        border: `1px solid ${item && rarityColor ? `${rarityColor}60` : SLOT_BORDER}`,
        transition: 'background 150ms',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {item && def ? (
        <>
          {/* Item icon — uses first letter as placeholder */}
          <div
            className="font-lora text-lg font-bold select-none"
            style={{ color: rarityColor ?? ACCENT }}
          >
            {def.name.charAt(0).toUpperCase()}
          </div>

          {/* Stack count badge */}
          {item.quantity > 1 && (
            <div
              className="absolute bottom-0.5 right-1 font-lora text-[9px] font-bold"
              style={{ color: TEXT }}
            >
              {item.quantity}
            </div>
          )}
        </>
      ) : item ? (
        <div
          className="font-lora text-xs font-bold select-none"
          style={{ color: `${ACCENT}60` }}
        >
          ?
        </div>
      ) : (
        <div
          className="w-6 h-6 border border-dashed"
          style={{ borderColor: SLOT_BORDER }}
        />
      )}

      {/* Tooltip */}
      {hovered && item && <ItemTooltip item={item} def={def} />}
    </div>
  );
}

// ── Equipment slot ───────────────────────────────────────────────────────

function EquipmentSlot({ slot }: { slot: string }) {
  const equipped = useInventoryStore((s) => s.equipped);
  const itemId = equipped[slot as keyof typeof equipped];
  const [hovered, setHovered] = useState(false);
  const def = itemId ? getItemInfo(itemId) : undefined;
  const rarityColor = def ? getRarityColor(def.rarity) : undefined;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tooltip hover on equipment slot
    <div
      className="relative flex items-center gap-2 py-1.5 px-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Slot icon */}
      <div
        className="w-10 h-10 flex items-center justify-center"
        style={{
          background: itemId ? SLOT_HOVER : SLOT_BG,
          border: `1px solid ${rarityColor ? `${rarityColor}60` : SLOT_BORDER}`,
        }}
      >
        {def ? (
          <span
            className="font-lora text-sm font-bold"
            style={{ color: rarityColor ?? ACCENT }}
          >
            {def.name.charAt(0)}
          </span>
        ) : (
          <span
            className="font-lora text-[10px] uppercase tracking-wider"
            style={{ color: `${ACCENT}40` }}
          >
            --
          </span>
        )}
      </div>

      {/* Slot label + item name */}
      <div className="flex flex-col min-w-0">
        <span
          className="font-lora text-[10px] uppercase tracking-[0.15em] font-semibold"
          style={{ color: ACCENT }}
        >
          {getSlotLabel(slot)}
        </span>
        {def ? (
          <span
            className="font-crimson text-xs truncate"
            style={{ color: rarityColor ?? TEXT }}
          >
            {def.name}
          </span>
        ) : (
          <span
            className="font-crimson text-xs italic"
            style={{ color: `${ACCENT}50` }}
          >
            Empty
          </span>
        )}
      </div>

      {/* Tooltip */}
      {hovered && itemId && (
        <ItemTooltip item={{ itemId, quantity: 1 }} def={def} />
      )}
    </div>
  );
}

// ── Main Inventory Screen ────────────────────────────────────────────────

export function InventoryScreen() {
  const isOpen = useInventoryStore((s) => s.isOpen);
  const items = useInventoryStore((s) => s.items);
  const maxSlots = useInventoryStore((s) => s.maxSlots);
  const gold = useInventoryStore((s) => s.gold);
  const close = useInventoryStore((s) => s.close);
  const gameActive = useGameStore((s) => s.gameActive);

  if (!isOpen || !gameActive) return null;

  // Build slot array with empty slots
  const slots: (ItemStack | null)[] = [];
  for (let i = 0; i < maxSlots; i++) {
    slots.push(items[i] ?? null);
  }

  return (
    <div
      className="absolute inset-0 z-[54] flex items-center justify-center"
      style={{
        background: 'rgba(20, 16, 10, 0.5)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="relative flex gap-6 px-10 py-8 shadow-2xl max-h-[85vh]"
        style={{
          background: PARCHMENT,
          border: `1.5px solid ${SLOT_BORDER}`,
        }}
      >
        {/* Corner accents */}
        <div
          className="absolute -top-px left-6 right-6 h-px"
          style={{
            background: `linear-gradient(to right, transparent, ${GOLD_COLOR}60, transparent)`,
          }}
        />
        <div
          className="absolute -bottom-px left-6 right-6 h-px"
          style={{
            background: `linear-gradient(to right, transparent, ${GOLD_COLOR}60, transparent)`,
          }}
        />

        {/* Left: Equipment */}
        <div className="flex flex-col w-48">
          <h3
            className="font-lora text-lg font-bold tracking-[0.1em] uppercase mb-3"
            style={{
              color: ACCENT,
              textShadow: '0 0 15px rgba(196, 167, 71, 0.12)',
            }}
          >
            Equipment
          </h3>

          <div
            className="h-px mb-3"
            style={{
              background: `linear-gradient(to right, ${ACCENT}40, transparent 80%)`,
            }}
          />

          <div className="flex flex-col gap-0.5">
            {EQUIP_SLOTS.map((slot) => (
              <EquipmentSlot key={slot} slot={slot} />
            ))}
          </div>
        </div>

        {/* Vertical divider */}
        <div
          className="w-px self-stretch"
          style={{
            background: `linear-gradient(to bottom, transparent, ${ACCENT}30, transparent)`,
          }}
        />

        {/* Right: Inventory grid */}
        <div className="flex flex-col">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <h3
              className="font-lora text-lg font-bold tracking-[0.1em] uppercase"
              style={{
                color: ACCENT,
                textShadow: '0 0 15px rgba(196, 167, 71, 0.12)',
              }}
            >
              Satchel
            </h3>

            {/* Gold display */}
            <div className="flex items-center gap-1.5">
              <span
                className="font-lora text-base font-bold"
                style={{ color: GOLD_COLOR }}
              >
                {gold}
              </span>
              <span
                className="font-lora text-xs uppercase tracking-wider"
                style={{ color: ACCENT }}
              >
                gold
              </span>
            </div>
          </div>

          <div
            className="h-px mb-3"
            style={{
              background: `linear-gradient(to right, ${ACCENT}40, transparent 80%)`,
            }}
          />

          {/* Grid */}
          <div className="grid grid-cols-5 gap-1">
            {slots.map((item, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-size slot grid, items don't reorder
              <InventorySlot key={i} item={item} />
            ))}
          </div>

          {/* Slots counter */}
          <div
            className="font-lora text-[10px] tracking-wider mt-2 text-right"
            style={{ color: ACCENT }}
          >
            {items.length} / {maxSlots} slots
          </div>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={close}
          className="absolute top-3 right-4 font-lora text-sm font-bold tracking-wider cursor-pointer transition-colors hover:opacity-80"
          style={{ color: ACCENT }}
        >
          [ESC]
        </button>
      </div>
    </div>
  );
}
