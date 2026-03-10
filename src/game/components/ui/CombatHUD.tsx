/**
 * Combat HUD overlay — floating damage numbers, combat prompt,
 * monster HP summary, and post-combat loot/XP summary.
 *
 * Renders as an HTML overlay on top of the 3D canvas.
 * Reads from combatStore for all transient combat UI state.
 */

import { useEffect, useState } from 'react';
import {
  type DamagePopup,
  POPUP_LIFETIME_MS,
  useCombatStore,
} from '../../stores/combatStore';
import { useGameStore } from '../../stores/gameStore';
import { getCombatMonsters } from '../../systems/combat-resolver';

// ── Design tokens (matching GameHUD pastoral theme) ─────────────────

const PARCHMENT = 'rgba(245, 240, 232, 0.9)';
const PARCHMENT_BORDER = '#c4a747';
const GOLD_TEXT = '#8b6f47';

// ── Floating damage number ──────────────────────────────────────────

function DamageNumber({ popup }: { popup: DamagePopup }) {
  const age = (performance.now() - popup.createdAt) / POPUP_LIFETIME_MS;
  const opacity = Math.max(0, 1 - age);
  const yOffset = age * 60; // float upward 60px over lifetime

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        left: `${popup.x * 100}%`,
        top: `${popup.y * 100}%`,
        transform: `translate(-50%, -50%) translateY(-${yOffset}px)`,
        opacity,
        fontSize: popup.isCritical ? '28px' : '20px',
        fontFamily: 'Lora, serif',
        fontWeight: 700,
        color: popup.color,
        textShadow: '0 2px 4px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.3)',
        letterSpacing: '0.02em',
      }}
    >
      {popup.text}
    </div>
  );
}

// ── Monster HP bars ─────────────────────────────────────────────────

function MonsterHPBars() {
  const [monsters, setMonsters] = useState(getCombatMonsters());

  useEffect(() => {
    const interval = setInterval(() => {
      setMonsters([...getCombatMonsters()]);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const alive = monsters.filter((m) => m.currentHp > 0);
  if (alive.length === 0) return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col gap-1 items-center">
      {alive.map((m) => {
        const pct = Math.max(0, m.currentHp / m.archetype.health);
        return (
          <div
            key={m.id}
            className="flex items-center gap-2"
            style={{ minWidth: '160px' }}
          >
            <span
              className="text-xs font-semibold truncate"
              style={{
                color: GOLD_TEXT,
                fontFamily: 'Lora, serif',
                minWidth: '60px',
                textAlign: 'right',
              }}
            >
              {m.archetype.name}
            </span>
            <div
              className="relative flex-1 h-2 rounded-full overflow-hidden"
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: `1px solid ${PARCHMENT_BORDER}`,
                minWidth: '80px',
              }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
                style={{
                  width: `${pct * 100}%`,
                  background:
                    pct > 0.5 ? '#4a7a3a' : pct > 0.25 ? '#b8860b' : '#a03030',
                }}
              />
            </div>
            <span
              className="text-xs tabular-nums"
              style={{ color: GOLD_TEXT, fontFamily: 'Lora, serif' }}
            >
              {m.currentHp}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Combat action prompt ────────────────────────────────────────────

function CombatPrompt() {
  const attackCooldown = useCombatStore((s) => s.attackCooldown);
  const ready = attackCooldown <= 0;

  return (
    <div
      className="absolute bottom-32 left-1/2 -translate-x-1/2 px-5 py-2 text-center"
      style={{
        background: PARCHMENT,
        border: `1px solid ${PARCHMENT_BORDER}`,
        fontFamily: 'Lora, serif',
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center w-7 h-7 text-sm font-bold rounded"
          style={{
            background: ready ? 'rgba(196, 167, 71, 0.3)' : 'rgba(0,0,0,0.1)',
            border: `1px solid ${PARCHMENT_BORDER}`,
            color: ready ? GOLD_TEXT : 'rgba(139, 111, 71, 0.4)',
          }}
        >
          E
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: ready ? GOLD_TEXT : 'rgba(139, 111, 71, 0.4)' }}
        >
          {ready ? 'Attack' : 'Ready...'}
        </span>
      </div>
    </div>
  );
}

// ── Camera shake via CSS transform ──────────────────────────────────

function useScreenShake() {
  const recentDamage = useCombatStore((s) => s.recentDamageTaken);
  const [shake, setShake] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (recentDamage <= 0) return;

    const intensity = Math.min(recentDamage * 0.5, 8);
    let frame = 0;
    const maxFrames = 6;

    const animate = () => {
      if (frame >= maxFrames) {
        setShake({ x: 0, y: 0 });
        useCombatStore.getState().setRecentDamageTaken(0);
        return;
      }
      const decay = 1 - frame / maxFrames;
      setShake({
        x: (Math.random() * 2 - 1) * intensity * decay,
        y: (Math.random() * 2 - 1) * intensity * decay,
      });
      frame++;
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [recentDamage]);

  return shake;
}

// ── Loot summary ────────────────────────────────────────────────────

function LootSummary() {
  const summary = useCombatStore((s) => s.summary);
  if (!summary) return null;

  return (
    <div
      className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-6 text-center"
      style={{
        background: PARCHMENT,
        border: `2px solid ${PARCHMENT_BORDER}`,
        fontFamily: 'Lora, serif',
        minWidth: '240px',
      }}
    >
      <div className="text-lg font-bold mb-3" style={{ color: GOLD_TEXT }}>
        Victory!
      </div>
      <div className="text-sm mb-2" style={{ color: GOLD_TEXT }}>
        {summary.monstersKilled} foe{summary.monstersKilled !== 1 ? 's' : ''}{' '}
        vanquished
      </div>
      <div
        className="text-base font-semibold mb-3"
        style={{ color: '#b8860b' }}
      >
        +{summary.xpGained} XP
      </div>
      {summary.loot.length > 0 && (
        <div
          className="border-t pt-2"
          style={{ borderColor: PARCHMENT_BORDER }}
        >
          <div
            className="text-xs uppercase tracking-wider mb-1"
            style={{ color: 'rgba(139, 111, 71, 0.6)' }}
          >
            Spoils
          </div>
          {summary.loot.map((drop) => (
            <div
              key={`${drop.itemId}-${drop.quantity}`}
              className="text-sm"
              style={{ color: GOLD_TEXT }}
            >
              {drop.itemId.replace(/_/g, ' ')} x{drop.quantity}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main CombatHUD ──────────────────────────────────────────────────

export function CombatHUD() {
  const inCombat = useGameStore((s) => s.inCombat);
  const phase = useCombatStore((s) => s.phase);
  const popups = useCombatStore((s) => s.damagePopups);
  const shake = useScreenShake();

  if (!inCombat && phase === 'idle') return null;

  return (
    <div
      className="absolute inset-0 z-30 pointer-events-none"
      style={{
        transform: `translate(${shake.x}px, ${shake.y}px)`,
      }}
    >
      {/* Floating damage numbers */}
      {popups.map((p) => (
        <DamageNumber key={p.id} popup={p} />
      ))}

      {/* Monster HP bars */}
      {phase === 'active' && <MonsterHPBars />}

      {/* Attack prompt */}
      {phase === 'active' && <CombatPrompt />}

      {/* Post-combat loot summary */}
      {phase === 'summary' && <LootSummary />}
    </div>
  );
}
