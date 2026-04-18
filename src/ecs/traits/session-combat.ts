import { trait } from 'koota';
import type { LootDrop } from '@/combat-resolver';

export type CombatPhase = 'idle' | 'active' | 'summary';

export interface DamagePopup {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
  createdAt: number;
  isCritical: boolean;
}

export interface CombatSummary {
  xpGained: number;
  loot: LootDrop[];
  monstersKilled: number;
}

export const POPUP_LIFETIME_MS = 1200;

/**
 * Session-scoped combat UI state. Attached to the singleton session entity.
 *
 * Hot-path: popups, cooldown, feedback timestamps updated every frame by
 * EncounterSystem + CombatFeedback. Readers use useTrait(session, CombatUI).
 */
export const CombatUI = trait(() => ({
  phase: 'idle' as CombatPhase,
  damagePopups: [] as DamagePopup[],
  recentDamageTaken: 0,
  lastDamageTime: 0,
  lastHitTime: 0,
  summary: null as CombatSummary | null,
  attackCooldown: 0,
  playerAttackDamage: 8,
}));
