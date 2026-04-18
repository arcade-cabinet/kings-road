/**
 * Diegetic HUD layer — in-world feedback, zero UI chrome.
 *
 * Rendered inside GameplayFrame so it respects safe-area insets. Everything
 * here communicates state through atmosphere + body-sense metaphors:
 *
 *   - Health       → wound vignette on edges; red pulse + heartbeat on hit
 *   - Stamina      → peripheral breath fog at low wind
 *   - Combat hit   → gold flash + muzzle-flare burn at center
 *   - Damage taken → screen shake + crimson bloom radiating from hit side
 *   - Inventory    → belt pip (bottom-left, low-opacity) tap-to-open
 *   - Quest log    → journal pip (bottom-right, low-opacity) tap-to-open
 *
 * No bars, no gauges, no numeric read-outs. If the player wants detail they
 * open the inventory or pause menu explicitly. Everything here is
 * peripheral-vision signal so the player feels state rather than reads it.
 */

import { useEffect, useState } from 'react';
import { useTrait } from 'koota/react';
import { CombatUI } from '@/ecs/traits/session-combat';
import { InventoryUI } from '@/ecs/traits/session-inventory';
import { QuestLog } from '@/ecs/traits/session-quest';
import { openInventory } from '@/ecs/actions/inventory-ui';
import { getSessionEntity } from '@/ecs/world';
import { useGameStore } from '@/stores/gameStore';
import { cn } from '@/lib/utils';

const LOW_HEALTH_THRESHOLD = 0.4;
const CRITICAL_HEALTH_THRESHOLD = 0.2;
const LOW_STAMINA_THRESHOLD = 0.3;

export function DiegeticLayer({
  onOpenQuests,
}: {
  onOpenQuests?: () => void;
}) {
  const gameActive = useGameStore((s) => s.gameActive);
  const inCombat = useGameStore((s) => s.inCombat);
  const inDialogue = useGameStore((s) => s.inDialogue);
  const paused = useGameStore((s) => s.paused);
  const isDead = useGameStore((s) => s.isDead);
  const health = useGameStore((s) => s.health);
  const stamina = useGameStore((s) => s.stamina);
  // Health / stamina are stored as 0-100 scalars today; dividing by 100 keeps
  // the pct math identical to when these become bounded Koota traits.
  const maxHealth = 100;
  const maxStamina = 100;

  const session = getSessionEntity();
  const combat = useTrait(session, CombatUI);
  const inventoryUI = useTrait(session, InventoryUI);
  const questLog = useTrait(session, QuestLog);

  const questCount = questLog?.activeQuests.length ?? 0;
  const inventoryOpen = inventoryUI?.isOpen ?? false;

  if (!gameActive || isDead) return null;

  const healthPct = Math.max(0, Math.min(1, health / maxHealth));
  const staminaPct = Math.max(0, Math.min(1, stamina / maxStamina));
  const lowHealth = healthPct < LOW_HEALTH_THRESHOLD;
  const criticalHealth = healthPct < CRITICAL_HEALTH_THRESHOLD;
  const lowStamina = staminaPct < LOW_STAMINA_THRESHOLD;

  // Hide peripheral UI while modals are up so they don't layer over panels.
  const suppressPips = inventoryOpen || inDialogue || paused;

  return (
    <>
      <WoundVignette
        healthPct={healthPct}
        criticalHealth={criticalHealth}
        lastDamageTime={combat?.lastDamageTime ?? 0}
      />
      {lowStamina && <BreathFog staminaPct={staminaPct} />}
      {inCombat && combat && (
        <CombatImpactFlash
          lastHitTime={combat.lastHitTime}
          lastDamageTime={combat.lastDamageTime}
        />
      )}
      <Heartbeat active={lowHealth} critical={criticalHealth} />
      {!suppressPips && (
        <>
          <InventoryBeltPip onTap={() => openInventory()} />
          <QuestJournalPip count={questCount} onTap={onOpenQuests} />
        </>
      )}
    </>
  );
}

// ── Wound vignette — constant under low health, spike on damage ─────────────

function WoundVignette({
  healthPct,
  criticalHealth,
  lastDamageTime,
}: {
  healthPct: number;
  criticalHealth: boolean;
  lastDamageTime: number;
}) {
  const [flashIntensity, setFlashIntensity] = useState(0);
  const [flashKey, setFlashKey] = useState(0);

  // Trigger a flash whenever lastDamageTime advances.
  useEffect(() => {
    if (lastDamageTime <= 0) return;
    setFlashIntensity(1);
    setFlashKey((k) => k + 1);
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const age = (performance.now() - start) / 600;
      if (age >= 1) {
        setFlashIntensity(0);
        return;
      }
      setFlashIntensity(1 - age);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lastDamageTime]);

  // Baseline vignette opacity scales with missing health. At full HP it is
  // invisible; at 0 HP a deep crimson ring frames the screen.
  const baseline = (1 - healthPct) * 0.55;
  const intensity = Math.min(1, baseline + flashIntensity * 0.5);
  const radius = criticalHealth ? '30%' : '55%';

  return (
    <div
      key={flashKey}
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, transparent ${radius}, rgba(110, 20, 20, ${intensity}) 100%)`,
        mixBlendMode: 'multiply',
        transition: 'background 120ms ease-out',
      }}
      aria-hidden="true"
    />
  );
}

// ── Breath fog — low stamina ────────────────────────────────────────────────

function BreathFog({ staminaPct }: { staminaPct: number }) {
  const intensity = (1 - staminaPct / 0.3) * 0.35;
  return (
    <div
      className="absolute inset-0 pointer-events-none animate-kr-breath"
      style={{
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(220, 230, 240, ${intensity}) 100%)`,
        mixBlendMode: 'screen',
      }}
      aria-hidden="true"
    />
  );
}

// ── Combat impact flash — dealt vs taken ───────────────────────────────────

function CombatImpactFlash({
  lastHitTime,
  lastDamageTime,
}: {
  lastHitTime: number;
  lastDamageTime: number;
}) {
  const [hitFlash, setHitFlash] = useState(0);
  const [damageFlash, setDamageFlash] = useState(0);

  useEffect(() => {
    if (lastHitTime <= 0) return;
    setHitFlash(1);
    const id = setTimeout(() => setHitFlash(0), 140);
    return () => clearTimeout(id);
  }, [lastHitTime]);

  useEffect(() => {
    if (lastDamageTime <= 0) return;
    setDamageFlash(1);
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const age = (performance.now() - start) / 350;
      if (age >= 1) {
        setDamageFlash(0);
        return;
      }
      setDamageFlash(1 - age);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lastDamageTime]);

  if (hitFlash <= 0 && damageFlash <= 0) return null;

  return (
    <>
      {hitFlash > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, rgba(255, 215, 120, ${hitFlash * 0.35}), transparent 40%)`,
            mixBlendMode: 'screen',
          }}
          aria-hidden="true"
        />
      )}
      {damageFlash > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, rgba(190, 30, 30, ${damageFlash * 0.55}) 0%, transparent 30%, transparent 70%, rgba(190, 30, 30, ${damageFlash * 0.55}) 100%)`,
            mixBlendMode: 'multiply',
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
}

// ── Heartbeat — pulsing vignette rim when health drops ─────────────────────

function Heartbeat({
  active,
  critical,
}: {
  active: boolean;
  critical: boolean;
}) {
  if (!active) return null;
  const period = critical ? 680 : 1100;
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        animation: `kr-heartbeat ${period}ms ease-in-out infinite`,
        background:
          'radial-gradient(ellipse at center, transparent 55%, rgba(170, 30, 30, 0.18) 95%, rgba(170, 30, 30, 0.32) 100%)',
        mixBlendMode: 'multiply',
      }}
      aria-hidden="true"
    />
  );
}

// ── Belt pips — low-opacity tappable affordances ───────────────────────────

function InventoryBeltPip({ onTap }: { onTap: () => void }) {
  return (
    <button
      type="button"
      aria-label="Open inventory"
      onClick={onTap}
      className={cn(
        'absolute pointer-events-auto',
        'bottom-[max(env(safe-area-inset-bottom),0.75rem)]',
        'left-[max(env(safe-area-inset-left),0.75rem)]',
        'w-11 h-11 flex items-center justify-center',
        'opacity-35 hover:opacity-90 active:opacity-100',
        'active:scale-95 transition-all duration-200',
      )}
    >
      <SatchelIcon />
    </button>
  );
}

function QuestJournalPip({
  count,
  onTap,
}: {
  count: number;
  onTap?: () => void;
}) {
  if (count <= 0) return null;
  return (
    <button
      type="button"
      aria-label={`Open quest journal (${count} active)`}
      onClick={onTap}
      className={cn(
        'absolute pointer-events-auto',
        'bottom-[max(env(safe-area-inset-bottom),0.75rem)]',
        'right-[max(env(safe-area-inset-right),0.75rem)]',
        'w-11 h-11 flex items-center justify-center',
        'opacity-35 hover:opacity-90 active:opacity-100',
        'active:scale-95 transition-all duration-200',
      )}
    >
      <JournalIcon />
      <span
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center font-lora text-[9px] font-bold text-[#f5f0e8] bg-[#8b6f47]"
        aria-hidden="true"
      >
        {count > 9 ? '9+' : count}
      </span>
    </button>
  );
}

function SatchelIcon() {
  // A leather satchel silhouette — pastoral pilgrim's pouch, no fantasy swords.
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6 text-[#4a3820]"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        d="M7 9c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v2h1.5c.83 0 1.5.67 1.5 1.5v6c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2v-6c0-.83.67-1.5 1.5-1.5H7V9zm2 0v2h6V9H9zm-3 4v6h12v-6h-1v1c0 .55-.45 1-1 1s-1-.45-1-1v-1H9v1c0 .55-.45 1-1 1s-1-.45-1-1v-1H6z"
        fillOpacity="0.85"
      />
    </svg>
  );
}

function JournalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6 text-[#4a3820]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 4h12a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 0 1 2-2z" />
      <path d="M9 8h6" />
      <path d="M9 11h6" />
      <path d="M9 14h4" />
    </svg>
  );
}
