import { OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useTrait } from 'koota/react';
import { Suspense, useState } from 'react';
import {
  closeInventory,
  getItemInfo,
  getRarityColor,
  getSlotLabel,
} from '@/ecs/actions/inventory-ui';
import type { ItemStack } from '@/ecs/traits/inventory';
import { InventoryUI } from '@/ecs/traits/session-inventory';
import { getSessionEntity } from '@/ecs/world';
import { assetUrl } from '@/lib/assets';
import type { ItemDefinition } from '@/schemas/item.schema';
import { useFlags } from '@/ecs/hooks/useGameSession';

// ── Constants ────────────────────────────────────────────────────────────

const ACCENT = '#8b6f47';
const GOLD_COLOR = '#c4a747';
const TEXT = '#3d3a34';
const PARCHMENT = 'rgba(245, 240, 232, 0.95)';
const SLOT_BG = 'rgba(245, 240, 232, 0.6)';
const SLOT_BORDER = 'rgba(139, 111, 71, 0.3)';
const SLOT_HOVER = 'rgba(196, 167, 71, 0.2)';

const ITEM_MODELS = {
  sword: assetUrl('/assets/items/Sword-transformed.glb'),
  treasure: assetUrl('/assets/items/Treasure-transformed.glb'),
  stew: assetUrl('/assets/items/stew-transformed.glb'),
  cleaver: assetUrl('/assets/items/cleaver-transformed.glb'),
  machete: assetUrl('/assets/items/machete-transformed.glb'),
  traps: assetUrl('/assets/items/traps-transformed.glb'),
  bottles: assetUrl('/assets/items/bottles-transformed.glb'),
  books: assetUrl('/assets/items/books.glb'),
  misc: assetUrl('/assets/items/MISC_2025-transformed.glb'),
};

const ITEM_ICONS: Record<string, string> = {
  iron_sword: '⚔️',
  steel_sword: '🗡️',
  health_potion: '🧪',
  mana_potion: '🔮',
  bread: '🍞',
  stew: '🍲',
  gold: '💰',
  key: '🔑',
  map: '📜',
  shield: '🛡️',
  armor: '👕',
  helmet: '🪖',
  boots: '👞',
  ring: '💍',
  amulet: '📿',
  book: '📖',
  gem: '💎',
  hammer: '🔨',
  pickaxe: '⛏️',
};

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

// ── 3D Item Preview ──────────────────────────────────────────────────────

/** Renders a 3D preview using a structured viewmodel GLB from the item definition. */
function ViewmodelPreview({ glb }: { glb: string }) {
  const { nodes } = useGLTF(glb) as any;
  const mesh = Object.values(nodes).find((n: any) => n?.isMesh || n?.geometry) as any;
  if (!mesh) return null;
  return (
    <mesh geometry={mesh.geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#c4a747" roughness={0.4} metalness={0.8} />
    </mesh>
  );
}

function ItemModelPreview({ itemId }: { itemId: string }) {
  const def = getItemInfo(itemId);

  // Prefer the structured viewmodel GLB if the item definition provides one
  if (def?.viewmodel?.glb) {
    return <ViewmodelPreview glb={def.viewmodel.glb} />;
  }

  const descriptor = `${itemId} ${def?.name ?? ''} ${def?.type ?? ''} ${def?.equipSlot ?? ''}`.toLowerCase();

  let modelPath = ITEM_MODELS.treasure;
  let nodeName = 'coin';

  if (
    descriptor.includes('sword') ||
    descriptor.includes('staff') ||
    descriptor.includes('branch')
  ) {
    modelPath = ITEM_MODELS.sword;
    nodeName = 'Sword';
  } else if (descriptor.includes('hammer') || descriptor.includes('torch')) {
    modelPath = ITEM_MODELS.cleaver;
    nodeName = 'cleaver';
  } else if (descriptor.includes('cleaver')) {
    modelPath = ITEM_MODELS.cleaver;
    nodeName = 'cleaver';
  } else if (descriptor.includes('machete')) {
    modelPath = ITEM_MODELS.machete;
    nodeName = 'machete';
  } else if (
    descriptor.includes('potion') ||
    descriptor.includes('salve') ||
    descriptor.includes('draught') ||
    descriptor.includes('antidote') ||
    descriptor.includes('herb') ||
    descriptor.includes('leaf') ||
    descriptor.includes('moss') ||
    descriptor.includes('thyme') ||
    descriptor.includes('yarrow') ||
    descriptor.includes('comfrey') ||
    descriptor.includes('grailbloom') ||
    descriptor.includes('windcrown')
  ) {
    modelPath = ITEM_MODELS.bottles;
    nodeName = 'Bottle_Variant_1';
  } else if (descriptor.includes('stew') || descriptor.includes('ration')) {
    modelPath = ITEM_MODELS.stew;
    nodeName = 'bowl_01';
  } else if (descriptor.includes('trap')) {
    modelPath = ITEM_MODELS.traps;
    nodeName = 'Bear_Trap';
  } else if (
    descriptor.includes('map') ||
    descriptor.includes('ledger') ||
    descriptor.includes('hymnal') ||
    descriptor.includes('recipe') ||
    descriptor.includes('manuscript') ||
    descriptor.includes('treatise')
  ) {
    modelPath = ITEM_MODELS.books;
    nodeName = 'Book';
  } else if (
    descriptor.includes('ring') ||
    descriptor.includes('signet') ||
    descriptor.includes('medallion') ||
    descriptor.includes('seal') ||
    descriptor.includes('token') ||
    descriptor.includes('stamp') ||
    descriptor.includes('grail') ||
    descriptor.includes('key')
  ) {
    modelPath = ITEM_MODELS.treasure;
    nodeName = 'Grail_1';
  } else if (descriptor.includes('gem') || descriptor.includes('diamond')) {
    modelPath = ITEM_MODELS.treasure;
    nodeName = 'Diamond';
  } else if (
    descriptor.includes('shield') ||
    descriptor.includes('armor') ||
    descriptor.includes('cloak') ||
    descriptor.includes('disguise')
  ) {
    modelPath = ITEM_MODELS.misc;
  }

  const { nodes } = useGLTF(modelPath) as any;
  const mesh =
    nodes[nodeName] ||
    Object.values(nodes).find((n: any) => n?.isMesh || n?.geometry);

  if (!mesh) return null;

  return (
    <mesh geometry={mesh.geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#c4a747" roughness={0.4} metalness={0.8} />
    </mesh>
  );
}

function ItemPreviewPane({ itemId }: { itemId: string | null }) {
  if (!itemId) {
    return (
      <div className="w-full h-full flex items-center justify-center border border-dashed border-amber-900/20 opacity-30">
        <span className="font-lora text-[10px] uppercase tracking-widest">
          No Item Selected
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-amber-900/5 rounded shadow-inner overflow-hidden">
      <Canvas shadows dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[4, 6, 8]} intensity={1.2} />
          <group position={[0, -0.15, 0]}>
            <ItemModelPreview itemId={itemId} />
          </group>
        </Suspense>
        <OrbitControls
          autoRotate
          autoRotateSpeed={4}
          enableZoom={false}
          enablePan={false}
        />
      </Canvas>
      <div className="absolute bottom-2 right-2 opacity-20 pointer-events-none">
        <span className="font-lora text-[8px] uppercase tracking-tighter">
          3DPSX PREVIEW
        </span>
      </div>
    </div>
  );
}

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
        className="absolute z-50 px-3 py-2 pointer-events-none translate-y-2 top-full left-1/2 -translate-x-1/2 min-w-[160px]"
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
      className="absolute z-50 px-4 py-3 pointer-events-none translate-y-2 top-full left-1/2 -translate-x-1/2 min-w-[200px] max-w-[260px]"
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

function InventorySlot({
  item,
  onHover,
}: {
  item: ItemStack | null;
  onHover: (id: string | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const def = item ? getItemInfo(item.itemId) : undefined;
  const rarityColor = def ? getRarityColor(def.rarity) : undefined;

  const handleEnter = () => {
    setHovered(true);
    onHover(item?.itemId ?? null);
  };

  const handleLeave = () => {
    setHovered(false);
    onHover(null);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tooltip hover on inventory slot
    <div
      className="relative w-14 h-14 flex items-center justify-center cursor-default group"
      style={{
        background: hovered && item ? SLOT_HOVER : SLOT_BG,
        border: `1px solid ${item && rarityColor ? `${rarityColor}60` : SLOT_BORDER}`,
        transition: 'all 150ms',
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {item && def ? (
        <>
          {/* Item icon — uses emoji or fallback */}
          <div
            className="text-2xl select-none transition-transform group-hover:scale-110"
            title={def.name}
          >
            {ITEM_ICONS[item.itemId] || ITEM_ICONS[def.type] || '📦'}
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

function EquipmentSlot({
  slot,
  onHover,
}: {
  slot: string;
  onHover: (id: string | null) => void;
}) {
  const ui = useTrait(getSessionEntity(), InventoryUI);
  const itemId = ui
    ? ui.equipped[slot as keyof typeof ui.equipped]
    : null;
  const [hovered, setHovered] = useState(false);
  const def = itemId ? getItemInfo(itemId) : undefined;
  const rarityColor = def ? getRarityColor(def.rarity) : undefined;

  const handleEnter = () => {
    setHovered(true);
    onHover(itemId);
  };

  const handleLeave = () => {
    setHovered(false);
    onHover(null);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tooltip hover on equipment slot
    <div
      className="relative flex items-center gap-2 py-1.5 px-2 group"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Slot icon */}
      <div
        className="w-10 h-10 flex items-center justify-center transition-all group-hover:border-amber-600/60"
        style={{
          background: itemId ? SLOT_HOVER : SLOT_BG,
          border: `1px solid ${rarityColor ? `${rarityColor}60` : SLOT_BORDER}`,
        }}
      >
        {itemId && def ? (
          <span className="text-xl select-none">
            {ITEM_ICONS[itemId] || ITEM_ICONS[slot] || '🛡️'}
          </span>
        ) : (
          <span
            className="font-lora text-[10px] uppercase tracking-wider opacity-40"
            style={{ color: ACCENT }}
          >
            {getSlotLabel(slot).slice(0, 2)}
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
  const ui = useTrait(getSessionEntity(), InventoryUI);
  const isOpen = ui?.isOpen ?? false;
  const items = ui?.items ?? [];
  const maxSlots = ui?.maxSlots ?? 20;
  const gold = ui?.gold ?? 0;
  const close = closeInventory;
  const { gameActive } = useFlags();

  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  if (!isOpen || !gameActive) return null;

  // Build slot array with empty slots
  const slots: (ItemStack | null)[] = [];
  for (let i = 0; i < maxSlots; i++) {
    slots.push(items[i] ?? null);
  }

  return (
    <div
      className="absolute inset-0 z-[54] flex items-center justify-center p-4"
      style={{
        background: 'rgba(15, 12, 8, 0.65)',
        backdropFilter: 'blur(5px)',
      }}
    >
      <div
        className="relative flex flex-col md:flex-row gap-4 md:gap-8 px-5 py-5 md:px-10 md:py-8 shadow-2xl max-h-[min(90dvh,calc(100dvh-2rem))] w-[min(900px,calc(100dvw-2rem))] overflow-y-auto"
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

        {/* Left: Equipment & Preview */}
        <div className="flex flex-col w-56">
          <h3
            className="font-lora text-lg font-bold tracking-[0.1em] uppercase mb-3"
            style={{
              color: ACCENT,
              textShadow: '0 0 15px rgba(196, 167, 71, 0.12)',
            }}
          >
            Adventurer
          </h3>

          {/* 3D Preview Box */}
          <div className="w-full aspect-square mb-4">
            <ItemPreviewPane itemId={hoveredItemId} />
          </div>

          <div
            className="h-px mb-3"
            style={{
              background: `linear-gradient(to right, ${ACCENT}40, transparent 80%)`,
            }}
          />

          <div className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto">
            {EQUIP_SLOTS.map((slot) => (
              <EquipmentSlot
                key={slot}
                slot={slot}
                onHover={setHoveredItemId}
              />
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
          <div className="grid grid-cols-5 gap-1.5">
            {slots.map((item, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-size slot grid, items don't reorder
              <InventorySlot key={i} item={item} onHover={setHoveredItemId} />
            ))}
          </div>

          {/* Slots counter */}
          <div
            className="font-lora text-[10px] tracking-wider mt-4 text-right italic"
            style={{ color: ACCENT }}
          >
            Capacity: {items.length} / {maxSlots}
          </div>

          {/* Hints */}
          <div className="mt-auto pt-4 flex gap-4 opacity-50">
            <span className="font-lora text-[9px] uppercase tracking-widest">
              [I] Close
            </span>
            <span className="font-lora text-[9px] uppercase tracking-widest">
              [DRAG] Equip
            </span>
          </div>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={close}
          className="absolute top-3 right-4 font-lora text-sm font-bold tracking-wider cursor-pointer transition-colors hover:text-red-800"
          style={{ color: ACCENT }}
        >
          [✕]
        </button>
      </div>
    </div>
  );
}

useGLTF.preload(ITEM_MODELS.sword);
useGLTF.preload(ITEM_MODELS.treasure);
useGLTF.preload(ITEM_MODELS.stew);
useGLTF.preload(ITEM_MODELS.cleaver);
useGLTF.preload(ITEM_MODELS.machete);
useGLTF.preload(ITEM_MODELS.traps);
useGLTF.preload(ITEM_MODELS.bottles);
