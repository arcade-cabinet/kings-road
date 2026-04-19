/**
 * Concrete functional HUD — replaces the diegetic-only body-sense layer
 * for playtests. Shows the core information a player needs to function
 * in-world on a mobile/foldable without having to interpret vignettes.
 *
 *   ┌──────────────────────────────────────────────────┐
 *   │ HP ████████░░  STA ██████░░░░           [Q]  [⚙] │  ← top strip
 *   │                                                   │
 *   │                                                   │
 *   │                       +                           │  ← crosshair (center)
 *   │                                                   │
 *   │                                                   │
 *   │  [satchel]                           [journal]   │  ← thumb zones
 *   │   ◉                                    [attack]  │  ← visible joystick dot + action
 *   └──────────────────────────────────────────────────┘
 *
 * Works alongside the existing DialogueBox / InventoryScreen / QuestLog
 * overlays — those are still the full-screen illuminated panels for
 * deeper interaction. This HUD only shows during active, non-modal play.
 */

import { useTrait } from 'koota/react';
import { cn } from '@/lib/utils';
import { openInventory, isInventoryOpen } from '@/ecs/actions/inventory-ui';
import { togglePause } from '@/ecs/actions/game';
import { QuestLog } from '@/ecs/traits/session-quest';
import { getSessionEntity } from '@/ecs/world';
import { useFlags, usePlayer } from '@/ecs/hooks/useGameSession';

const MAX_HEALTH = 100;
const MAX_STAMINA = 100;

export function FunctionalHud({
  onOpenQuests,
}: {
  onOpenQuests?: () => void;
}) {
  const { gameActive, inDialogue, paused, isDead } = useFlags();
  const { health, stamina } = usePlayer();
  const questLog = useTrait(getSessionEntity(), QuestLog);
  const inventoryOpen = isInventoryOpen();
  const questCount = questLog?.activeQuests.length ?? 0;

  if (!gameActive || isDead) return null;

  // Suppress the HUD during modal overlays so we don't stack bars on top
  // of the dialogue/inventory/pause screens.
  const modal = inDialogue || paused || inventoryOpen;
  if (modal) return null;

  const healthPct = Math.max(0, Math.min(1, health / MAX_HEALTH));
  const staminaPct = Math.max(0, Math.min(1, stamina / MAX_STAMINA));

  return (
    <>
      {/* Illuminated-manuscript frame — parchment border with gold corner
          ornaments. Pointer-events:none so it never intercepts input; it
          sits behind the interactive HUD elements but in front of the
          game scene. All four edges honour iOS safe-area insets via
          env(safe-area-inset-*) so the ornaments don't fall under the
          notch/dynamic island or get clipped by the home indicator on
          foldables with asymmetric safe areas. */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        aria-hidden="true"
      >
        <div
          className="absolute rounded-lg"
          style={{
            top: 'max(env(safe-area-inset-top), 0.5rem)',
            right: 'max(env(safe-area-inset-right), 0.5rem)',
            bottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
            left: 'max(env(safe-area-inset-left), 0.5rem)',
            boxShadow:
              'inset 0 0 0 1px rgba(196, 167, 71, 0.6), inset 0 0 24px rgba(0, 0, 0, 0.35), inset 0 0 80px rgba(139, 111, 71, 0.22)',
          }}
        />
        {/* Corner ornaments — fleur-de-lis style accents */}
        {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(
          (corner) => (
            <CornerOrnament key={corner} corner={corner} />
          ),
        )}
      </div>

      {/* Top strip — health + stamina bars, quest icon, pause */}
      <div
        className={cn(
          'absolute left-0 right-0 pointer-events-none z-30',
          'top-[max(env(safe-area-inset-top),0.5rem)]',
          'px-[max(env(safe-area-inset-left),0.75rem)]',
          'flex items-center gap-3',
        )}
      >
        <StatBar
          label="HP"
          pct={healthPct}
          fill="linear-gradient(90deg,#b23b3b,#d95b5b)"
        />
        <StatBar
          label="STA"
          pct={staminaPct}
          fill="linear-gradient(90deg,#6b7a52,#9db273)"
        />
        <div className="ml-auto flex items-center gap-2 pointer-events-auto">
          {questCount > 0 && (
            <button
              type="button"
              aria-label={`Quest log (${questCount} active)`}
              onClick={onOpenQuests}
              className={cn(
                'h-10 w-10 flex items-center justify-center rounded-full',
                'bg-black/35 text-[#f5e6c8] border border-[#c4a747]/40',
                'active:scale-95 transition-transform',
              )}
            >
              <JournalGlyph />
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-[#f5f0e8] bg-[#8b6f47]"
                aria-hidden="true"
              >
                {questCount > 9 ? '9+' : questCount}
              </span>
            </button>
          )}
          <button
            type="button"
            aria-label="Pause"
            onClick={() => togglePause()}
            className={cn(
              'h-10 w-10 flex items-center justify-center rounded-full',
              'bg-black/35 text-[#f5e6c8] border border-[#c4a747]/40',
              'active:scale-95 transition-transform',
            )}
          >
            <PauseGlyph />
          </button>
        </div>
      </div>

      {/* Center crosshair — subtle, always-visible reticle */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
        aria-hidden="true"
      >
        <div
          className="w-5 h-5 rounded-full"
          style={{
            border: '2px solid rgba(245, 230, 200, 0.7)',
            boxShadow:
              '0 0 0 1px rgba(0,0,0,0.25), 0 0 10px rgba(0,0,0,0.35)',
          }}
        />
      </div>

      {/* Bottom-left — inventory quick-open button */}
      <button
        type="button"
        aria-label="Open inventory"
        onClick={() => openInventory()}
        className={cn(
          'absolute pointer-events-auto z-30',
          'bottom-[max(env(safe-area-inset-bottom),1rem)]',
          'left-[max(env(safe-area-inset-left),1rem)]',
          'h-14 w-14 flex items-center justify-center rounded-full',
          'bg-black/35 text-[#f5e6c8] border border-[#c4a747]/40',
          'active:scale-95 transition-transform',
        )}
      >
        <SatchelGlyph />
      </button>
    </>
  );
}

function StatBar({
  label,
  pct,
  fill,
}: {
  label: string;
  pct: number;
  fill: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-[6.5rem]">
      <span className="text-[10px] font-bold tracking-widest text-[#f5e6c8] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {label}
      </span>
      <div
        className="flex-1 h-2.5 rounded-full overflow-hidden"
        style={{
          background: 'rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(196, 167, 71, 0.35)',
        }}
      >
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${pct * 100}%`,
            background: fill,
            boxShadow: '0 0 8px rgba(255,255,255,0.2) inset',
          }}
        />
      </div>
    </div>
  );
}

function SatchelGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-7 h-7"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 9c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v2h1.5c.83 0 1.5.67 1.5 1.5v6c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2v-6c0-.83.67-1.5 1.5-1.5H7V9zm2 0v2h6V9H9z" />
    </svg>
  );
}

function JournalGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 4h12a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 0 1 2-2z" />
      <path d="M9 8h6" />
      <path d="M9 11h6" />
    </svg>
  );
}

function CornerOrnament({
  corner,
}: {
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}) {
  // Each corner anchors to the matching safe-area inset so the ornament
  // never falls under a device notch, camera cutout, or home indicator.
  // Flip horizontally/vertically via scale transforms so one SVG serves
  // all four corners.
  const edgeTop = 'max(env(safe-area-inset-top), 0.25rem)';
  const edgeRight = 'max(env(safe-area-inset-right), 0.25rem)';
  const edgeBottom = 'max(env(safe-area-inset-bottom), 0.25rem)';
  const edgeLeft = 'max(env(safe-area-inset-left), 0.25rem)';
  const styles: Record<typeof corner, React.CSSProperties> = {
    'top-left': { top: edgeTop, left: edgeLeft },
    'top-right': { top: edgeTop, right: edgeRight, transform: 'scaleX(-1)' },
    'bottom-left': {
      bottom: edgeBottom,
      left: edgeLeft,
      transform: 'scaleY(-1)',
    },
    'bottom-right': {
      bottom: edgeBottom,
      right: edgeRight,
      transform: 'scale(-1, -1)',
    },
  };
  return (
    <svg
      viewBox="0 0 40 40"
      className="absolute w-10 h-10"
      style={styles[corner]}
      fill="none"
      stroke="#c4a747"
      strokeWidth="1.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {/* L-shaped bracket with decorative fleur bud */}
      <path d="M4 20 L4 4 L20 4" strokeOpacity="0.85" />
      <path d="M8 8 Q8 8, 12 12" strokeOpacity="0.7" />
      <circle cx="6" cy="6" r="1.8" fill="#c4a747" fillOpacity="0.8" stroke="none" />
      <path d="M10 4 Q14 2, 16 4" strokeOpacity="0.55" />
      <path d="M4 10 Q2 14, 4 16" strokeOpacity="0.55" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
