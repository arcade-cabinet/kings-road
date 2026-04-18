import { useCallback, useEffect, useState } from 'react';
import * as THREE from 'three';
import {
  listSaveSlots,
  loadFromSlot,
  restoreGameState,
  type SaveSlotSummary,
  saveToSlot,
  snapshotGameState,
} from '@/db/save-service';
import { cn } from '@/lib/utils';
import { type ActiveDungeon } from '@/ecs/traits/session-game';
import {
  enterDungeon,
  getGameSnapshot,
  getPlayTimeSeconds,
  mergeGameState,
  resetGame,
  setGameActive,
  setPaused,
  setPlayTimeSeconds,
  startGame,
} from '@/ecs/actions/game';
import { useFlags, useSeed } from '@/ecs/hooks/useGameSession';
import {
  getInventorySnapshot,
  syncInventory,
} from '@/ecs/actions/inventory-ui';
import {
  getQuestState,
  resetQuests,
  resolveNarrative,
  restoreQuests,
} from '@/ecs/actions/quest';
import { useWorldSession } from '@/ecs/hooks/useWorldSession';
import {
  clearWorld,
  generateWorld,
  getFeaturesAt,
  getTileAtGrid,
  getTileAtWorld,
  getWorldState,
  setWorldState,
} from '@/ecs/actions/world';
import { generateDungeonLayout } from '@/world/dungeon-generator';
import { getDungeonById } from '@/world/dungeon-registry';
import { SettingsPanel } from '@app/views/SettingsPanel';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTO_SAVE_SLOT = 0;
const MANUAL_SLOTS = [1, 2, 3];

// ---------------------------------------------------------------------------
// Menu button — shared between main menu and sub-pages
// ---------------------------------------------------------------------------

function MenuButton({
  label,
  onClick,
  disabled = false,
  variant = 'default',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}) {
  const [hovering, setHovering] = useState(false);

  const baseClasses =
    variant === 'danger'
      ? 'border-rose-700/40 bg-rose-50/60 text-rose-900'
      : 'border-yellow-700/40 bg-yellow-100/60 text-yellow-900';

  const hoverClasses =
    variant === 'danger'
      ? 'border-rose-600/70 bg-rose-100/80 text-rose-950'
      : 'border-yellow-600/70 bg-yellow-200/80 text-yellow-950';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        'relative w-full border px-6 py-3',
        'font-lora text-sm font-semibold tracking-wider uppercase',
        'transition-all duration-200 cursor-pointer overflow-hidden',
        disabled && 'opacity-40 cursor-not-allowed',
        hovering && !disabled ? hoverClasses : baseClasses,
      )}
    >
      {/* Hover shine */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-500',
          hovering && !disabled && 'translate-x-full',
        )}
      />
      <span className="relative">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPlayTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Build a snapshot of current game state for saving. */
function captureSnapshot() {
  const gs = getGameSnapshot();
  const qs = getQuestState();
  const inv = getInventorySnapshot();
  return snapshotGameState(
    gs,
    qs,
    {
      items: inv.items,
      gold: inv.gold,
      equipment: inv.equipped,
    },
    gs.seedPhrase,
    // Preserve sub-second precision across saves — the UI floors to
    // minutes when displaying, but persisted values should retain full
    // fidelity so repeated auto-saves don't drift.
    getPlayTimeSeconds(),
  );
}

// ---------------------------------------------------------------------------
// SaveSlotRow
// ---------------------------------------------------------------------------

function SaveSlotRow({
  slotId,
  summary,
  mode,
  onSelect,
}: {
  slotId: number;
  summary: SaveSlotSummary | undefined;
  mode: 'save' | 'load';
  onSelect: (slotId: number) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const isEmpty = !summary;
  const disabled = mode === 'load' && isEmpty;

  const label = slotId === AUTO_SAVE_SLOT ? 'Auto-save' : `Slot ${slotId}`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(slotId)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        'relative w-full border px-5 py-3 text-left',
        'transition-all duration-200 overflow-hidden',
        disabled
          ? 'opacity-35 cursor-not-allowed border-yellow-700/20 bg-yellow-50/40'
          : 'cursor-pointer border-yellow-700/30 bg-yellow-100/50',
        hovering && !disabled && 'border-yellow-600/70 bg-yellow-200/70',
      )}
    >
      {/* Shine */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-500',
          hovering && !disabled && 'translate-x-full',
        )}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="font-lora text-sm font-semibold tracking-wider text-yellow-900">
            {label}
          </div>
          {isEmpty ? (
            <div className="font-crimson text-xs text-yellow-700/50 italic mt-0.5">
              Empty Slot
            </div>
          ) : (
            <div className="font-crimson text-xs text-yellow-800/70 mt-0.5">
              {summary.seedPhrase}
            </div>
          )}
        </div>
        {!isEmpty && (
          <div className="text-right">
            <div className="font-crimson text-xs text-yellow-800/60">
              {formatDate(summary.savedAt)}
            </div>
            <div className="font-crimson text-xs text-yellow-700/50 mt-0.5">
              {formatPlayTime(summary.playTimeSeconds)}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// SaveGamePage
// ---------------------------------------------------------------------------

function SaveGamePage({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved: () => void;
}) {
  const [slots, setSlots] = useState<SaveSlotSummary[]>([]);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // Load slot summaries
  useEffect(() => {
    listSaveSlots().then(setSlots);
  }, []);

  const slotMap = new Map(slots.map((s) => [s.slotId, s]));

  const handleSelect = (slotId: number) => {
    const existing = slotMap.get(slotId);
    if (existing) {
      setConfirming(slotId);
    } else {
      doSave(slotId);
    }
  };

  const doSave = async (slotId: number) => {
    setSaving(true);
    setConfirming(null);
    const data = captureSnapshot();
    await saveToSlot(slotId, data);
    setFlash('Saved!');
    setTimeout(() => {
      onSaved();
    }, 800);
  };

  if (flash) {
    return (
      <div className="relative bg-gradient-to-b from-yellow-50/95 to-yellow-100/90 border border-yellow-700/30 px-12 py-10 shadow-2xl">
        <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />
        <div className="absolute -bottom-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />
        <p
          className="font-lora text-2xl font-bold tracking-[0.08em] text-center"
          style={{ color: '#8b6f47' }}
        >
          {flash}
        </p>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-b from-yellow-50/95 to-yellow-100/90 border border-yellow-700/30 px-5 py-6 sm:px-10 sm:py-8 shadow-2xl w-[min(380px,calc(100dvw-2rem))] max-h-[min(85dvh,calc(100dvh-2rem))] overflow-y-auto">
      <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />
      <div className="absolute -bottom-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />

      <h2
        className="font-lora text-2xl font-bold tracking-[0.08em] text-center mb-6"
        style={{
          color: '#8b6f47',
          textShadow: '0 0 20px rgba(196, 167, 71, 0.15)',
        }}
      >
        Save Game
      </h2>

      {confirming !== null ? (
        <div className="flex flex-col gap-3">
          <p className="font-crimson text-sm text-yellow-900 text-center">
            Overwrite Slot {confirming}?
          </p>
          <MenuButton label="Confirm" onClick={() => doSave(confirming)} />
          <MenuButton label="Cancel" onClick={() => setConfirming(null)} />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 mb-5">
          {MANUAL_SLOTS.map((id) => (
            <SaveSlotRow
              key={id}
              slotId={id}
              summary={slotMap.get(id)}
              mode="save"
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {confirming === null && !saving && (
        <MenuButton label="Back" onClick={onBack} />
      )}
      {saving && (
        <p className="font-crimson text-xs text-yellow-700/60 text-center mt-2">
          Saving...
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LoadGamePage
// ---------------------------------------------------------------------------

function LoadGamePage({ onBack }: { onBack: () => void }) {
  const [slots, setSlots] = useState<SaveSlotSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listSaveSlots().then(setSlots);
  }, []);

  const slotMap = new Map(slots.map((s) => [s.slotId, s]));
  const allSlots = [AUTO_SAVE_SLOT, ...MANUAL_SLOTS];

  const handleLoad = useCallback(async (slotId: number) => {
    setLoading(true);
    const data = await loadFromSlot(slotId);
    if (!data) {
      setLoading(false);
      return;
    }

    // Reset current game state
    resetGame();
    clearWorld();
    resetQuests();

    // Regenerate kingdom from saved seed
    await generateWorld(data.seedPhrase);

    // Resolve quest narrative
    resolveNarrative(data.seedPhrase);

    // Restore all saved state via centralized restoreGameState
    restoreGameState(data, {
      startGame: (seed, pos, yaw) => {
        const position = new THREE.Vector3(pos.x, pos.y, pos.z);
        startGame(seed, position, yaw);
        // startGame → resetGame zeroes PlayTime; restore the saved value so
        // the "2h 14m walked" counter keeps accumulating on top.
        setPlayTimeSeconds(data.playTimeSeconds);
      },
      mergeGameState: (partial) => {
        mergeGameState(partial);
      },
      restoreInventory: (items, gold, equipment) => {
        syncInventory(items, 20, gold, equipment);
      },
      restoreQuests: (activeQuests, completedQuests, triggeredQuests) => {
        restoreQuests(activeQuests, completedQuests, triggeredQuests);
      },
      restoreDungeon: (dungeon) => {
        const layout = getDungeonById(dungeon.id);
        if (!layout) return;
        const spatial = generateDungeonLayout(layout);
        const active: ActiveDungeon = {
          id: dungeon.id,
          name: layout.name,
          spatial,
          currentRoomIndex: dungeon.currentRoomIndex,
          overworldPosition: new THREE.Vector3(
            dungeon.overworldPosition.x,
            dungeon.overworldPosition.y,
            dungeon.overworldPosition.z,
          ),
          overworldYaw: dungeon.overworldYaw,
        };
        enterDungeon(active);
      },
    });
  }, []);

  if (loading) {
    return (
      <div className="relative bg-gradient-to-b from-yellow-50/95 to-yellow-100/90 border border-yellow-700/30 px-12 py-10 shadow-2xl">
        <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />
        <div className="absolute -bottom-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />
        <p
          className="font-lora text-xl font-bold tracking-[0.08em] text-center"
          style={{ color: '#8b6f47' }}
        >
          Restoring kingdom...
        </p>
        <p className="font-crimson text-xs text-yellow-700/60 text-center mt-2">
          Regenerating the world from seed
        </p>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-b from-yellow-50/95 to-yellow-100/90 border border-yellow-700/30 px-5 py-6 sm:px-10 sm:py-8 shadow-2xl w-[min(380px,calc(100dvw-2rem))] max-h-[min(85dvh,calc(100dvh-2rem))] overflow-y-auto">
      <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />
      <div className="absolute -bottom-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />

      <h2
        className="font-lora text-2xl font-bold tracking-[0.08em] text-center mb-6"
        style={{
          color: '#8b6f47',
          textShadow: '0 0 20px rgba(196, 167, 71, 0.15)',
        }}
      >
        Load Game
      </h2>

      <div className="flex flex-col gap-2.5 mb-5">
        {allSlots.map((id) => (
          <SaveSlotRow
            key={id}
            slotId={id}
            summary={slotMap.get(id)}
            mode="load"
            onSelect={handleLoad}
          />
        ))}
      </div>

      <MenuButton label="Back" onClick={onBack} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auto-save hook
// ---------------------------------------------------------------------------

function useAutoSaveOnPause(paused: boolean, gameActive: boolean) {
  const [autoSaveFlash, setAutoSaveFlash] = useState(false);

  useEffect(() => {
    if (!paused || !gameActive) return;

    let cancelled = false;
    (async () => {
      const data = captureSnapshot();
      await saveToSlot(AUTO_SAVE_SLOT, data);
      if (!cancelled) {
        setAutoSaveFlash(true);
        setTimeout(() => {
          if (!cancelled) setAutoSaveFlash(false);
        }, 1500);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paused, gameActive]);

  return autoSaveFlash;
}

// ---------------------------------------------------------------------------
// Main PauseMenu
// ---------------------------------------------------------------------------

export function PauseMenu() {
  const { gameActive, paused } = useFlags();
  const { seedPhrase } = useSeed();
  const [page, setPage] = useState<'main' | 'settings' | 'save' | 'load'>(
    'main',
  );

  const autoSaveFlash = useAutoSaveOnPause(paused, gameActive);

  // Reset to main page when pause menu opens
  if (!gameActive || !paused) {
    if (page !== 'main') setPage('main');
    return null;
  }

  const handleResume = () => {
    setPaused(false);
  };

  const handleQuit = () => {
    setPaused(false);
    resetGame();
    setGameActive(false);
    clearWorld();
  };

  return (
    <div
      className="absolute inset-0 z-[55] flex flex-col items-center justify-center"
      style={{
        background: 'rgba(20, 16, 10, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {page === 'settings' ? (
        <SettingsPanel onBack={() => setPage('main')} />
      ) : page === 'save' ? (
        <SaveGamePage
          onBack={() => setPage('main')}
          onSaved={() => setPage('main')}
        />
      ) : page === 'load' ? (
        <LoadGamePage onBack={() => setPage('main')} />
      ) : (
        /* Menu card */
        <div className="relative bg-gradient-to-b from-yellow-50/95 to-yellow-100/90 border border-yellow-700/30 px-12 py-10 shadow-2xl">
          {/* Corner accents */}
          <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />
          <div className="absolute -bottom-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />

          {/* Title */}
          <h2
            className="font-lora text-3xl font-bold tracking-[0.08em] text-center mb-2"
            style={{
              color: '#8b6f47',
              textShadow: '0 0 20px rgba(196, 167, 71, 0.15)',
            }}
          >
            Paused
          </h2>

          {/* Seed name */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="w-6 h-px bg-gradient-to-r from-transparent to-yellow-600/30" />
            <span className="font-lora text-sm text-yellow-700/70 tracking-wider italic">
              {seedPhrase}
            </span>
            <span className="w-6 h-px bg-gradient-to-l from-transparent to-yellow-600/30" />
          </div>

          {/* Menu buttons */}
          <div className="flex flex-col gap-3 w-64">
            <MenuButton label="Resume" onClick={handleResume} />
            <MenuButton label="Save Game" onClick={() => setPage('save')} />
            <MenuButton label="Load Game" onClick={() => setPage('load')} />
            <MenuButton label="Settings" onClick={() => setPage('settings')} />
            <div className="w-full h-px bg-gradient-to-r from-transparent via-yellow-600/20 to-transparent my-1" />
            <MenuButton
              label="Quit to Menu"
              onClick={handleQuit}
              variant="danger"
            />
          </div>

          {/* Auto-save flash */}
          <div
            className={cn(
              'text-center text-yellow-700/60 text-xs tracking-wider mt-5 transition-opacity duration-500',
              autoSaveFlash ? 'opacity-100' : 'opacity-0',
            )}
          >
            Auto-saved
          </div>

          {/* Hint */}
          <p className="text-center text-yellow-800/50 text-xs tracking-wider mt-2">
            Press <span className="font-bold text-yellow-800/70">ESC</span> to
            resume
          </p>
        </div>
      )}
    </div>
  );
}
