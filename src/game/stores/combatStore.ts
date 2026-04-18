/**
 * Combat UI store — transient state for combat feedback.
 *
 * Holds floating damage numbers, the loot summary, and combat phase.
 * Consumed by CombatHUD for rendering overlays. Cleared when combat ends.
 */

import { create } from 'zustand';
import type { LootDrop } from '../systems/combat-resolver';

/** A floating damage number to display */
export interface DamagePopup {
  id: number;
  text: string;
  color: string;
  /** Screen-relative X (0-1) */
  x: number;
  /** Screen-relative Y (0-1) — floats upward */
  y: number;
  /** Timestamp when created (for fade-out timing) */
  createdAt: number;
  isCritical: boolean;
}

/** The post-combat summary shown after all monsters die */
export interface CombatSummary {
  xpGained: number;
  loot: LootDrop[];
  monstersKilled: number;
}

type CombatPhase = 'idle' | 'active' | 'summary';

interface CombatUIState {
  phase: CombatPhase;
  damagePopups: DamagePopup[];
  /** Accumulated damage taken this combat (for shake intensity) */
  recentDamageTaken: number;
  /** Timestamp of last damage taken (for feedback triggers) */
  lastDamageTime: number;
  /** Timestamp of last player hit dealt (for feedback triggers) */
  lastHitTime: number;
  /** Post-combat loot/XP summary */
  summary: CombatSummary | null;
  /** Attack cooldown (seconds remaining) */
  attackCooldown: number;
  /** Player's effective attack damage (base + equipment) */
  playerAttackDamage: number;

  // Actions
  startCombatUI: () => void;
  addDamagePopup: (
    text: string,
    color: string,
    x: number,
    y: number,
    isCritical: boolean,
  ) => void;
  clearExpiredPopups: (now: number) => void;
  setRecentDamageTaken: (amount: number) => void;
  showSummary: (summary: CombatSummary) => void;
  dismissSummary: () => void;
  setAttackCooldown: (cd: number) => void;
  setPlayerAttackDamage: (damage: number) => void;
  resetCombatUI: () => void;
}

let nextPopupId = 0;

/** Duration in ms before a damage popup expires */
export const POPUP_LIFETIME_MS = 1200;

export const useCombatStore = create<CombatUIState>((set) => ({
  phase: 'idle',
  damagePopups: [],
  recentDamageTaken: 0,
  lastDamageTime: 0,
  lastHitTime: 0,
  summary: null,
  attackCooldown: 0,
  playerAttackDamage: 8,

  startCombatUI: () =>
    set({
      phase: 'active',
      damagePopups: [],
      recentDamageTaken: 0,
      lastDamageTime: 0,
      lastHitTime: 0,
      summary: null,
    }),

  addDamagePopup: (text, color, x, y, isCritical) =>
    set((state) => {
      const now = performance.now();
      const isHeal = text.startsWith('+');
      const isDealt = color === '#ffffff' || color === '#ffcc00'; // Critical or white = player hit

      return {
        damagePopups: [
          ...state.damagePopups,
          {
            id: nextPopupId++,
            text,
            color,
            x,
            y,
            createdAt: now,
            isCritical,
          },
        ],
        lastHitTime: isDealt && !isHeal ? now : state.lastHitTime,
        lastDamageTime: !isDealt && !isHeal ? now : state.lastDamageTime,
      };
    }),

  clearExpiredPopups: (now) =>
    set((state) => ({
      damagePopups: state.damagePopups.filter(
        (p) => now - p.createdAt < POPUP_LIFETIME_MS,
      ),
    })),

  setRecentDamageTaken: (amount) => set({ recentDamageTaken: amount }),

  showSummary: (summary) => set({ phase: 'summary', summary }),

  dismissSummary: () => set({ phase: 'idle', summary: null, damagePopups: [] }),

  setAttackCooldown: (cd) => set({ attackCooldown: cd }),

  setPlayerAttackDamage: (damage) => set({ playerAttackDamage: damage }),

  resetCombatUI: () =>
    set({
      phase: 'idle',
      damagePopups: [],
      recentDamageTaken: 0,
      summary: null,
      attackCooldown: 0,
    }),
}));
