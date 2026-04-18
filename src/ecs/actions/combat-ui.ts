import {
  type CombatPhase,
  type CombatSummary,
  CombatUI,
  type DamagePopup,
  POPUP_LIFETIME_MS,
} from '@/ecs/traits/session-combat';
import { getSessionEntity } from '@/ecs/world';

type CombatState = {
  phase: CombatPhase;
  damagePopups: DamagePopup[];
  recentDamageTaken: number;
  lastDamageTime: number;
  lastHitTime: number;
  summary: CombatSummary | null;
  attackCooldown: number;
  playerAttackDamage: number;
};

type SessionProxy = {
  has: (t: typeof CombatUI) => boolean;
  add: (t: typeof CombatUI) => void;
  get: (t: typeof CombatUI) => CombatState;
  set: (t: typeof CombatUI, value: CombatState) => void;
};

let nextPopupId = 0;

function session(): SessionProxy {
  const proxy = getSessionEntity() as unknown as SessionProxy;
  if (!proxy.has(CombatUI)) proxy.add(CombatUI);
  return proxy;
}

function patch(update: Partial<CombatState>): void {
  const s = session();
  s.set(CombatUI, { ...s.get(CombatUI), ...update });
}

export function getCombatUI(): CombatState {
  return session().get(CombatUI);
}

export function startCombatUI(): void {
  patch({
    phase: 'active',
    damagePopups: [],
    recentDamageTaken: 0,
    lastDamageTime: 0,
    lastHitTime: 0,
    summary: null,
  });
}

export function addDamagePopup(
  text: string,
  color: string,
  x: number,
  y: number,
  isCritical: boolean,
): void {
  const s = session();
  const cur = s.get(CombatUI);
  const now = performance.now();
  const isHeal = text.startsWith('+');
  const isDealt = color === '#ffffff' || color === '#ffcc00';

  s.set(CombatUI, {
    ...cur,
    damagePopups: [
      ...cur.damagePopups,
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
    lastHitTime: isDealt && !isHeal ? now : cur.lastHitTime,
    lastDamageTime: !isDealt && !isHeal ? now : cur.lastDamageTime,
  });
}

export function clearExpiredPopups(now: number): void {
  const s = session();
  const cur = s.get(CombatUI);
  const fresh = cur.damagePopups.filter(
    (p) => now - p.createdAt < POPUP_LIFETIME_MS,
  );
  if (fresh.length !== cur.damagePopups.length) {
    s.set(CombatUI, { ...cur, damagePopups: fresh });
  }
}

export function setRecentDamageTaken(amount: number): void {
  patch({ recentDamageTaken: amount });
}

export function showCombatSummary(summary: CombatSummary): void {
  patch({ phase: 'summary', summary });
}

export function dismissCombatSummary(): void {
  patch({ phase: 'idle', summary: null, damagePopups: [] });
}

export function setAttackCooldown(cd: number): void {
  patch({ attackCooldown: cd });
}

export function setPlayerAttackDamage(damage: number): void {
  patch({ playerAttackDamage: damage });
}

export function resetCombatUI(): void {
  patch({
    phase: 'idle',
    damagePopups: [],
    recentDamageTaken: 0,
    summary: null,
    attackCooldown: 0,
  });
}
