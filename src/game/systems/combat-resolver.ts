import { getLootTableByTier } from '../../db/content-queries';
import type { MonsterArchetype } from '../../schemas/monster.schema';

// --- Types ---

/** Result of a single player attack against a monster */
export interface AttackResult {
  targetId: string;
  damage: number;
  isCritical: boolean;
  remainingHp: number;
  isDead: boolean;
}

/** A single item drop from a loot roll */
export interface LootDrop {
  itemId: string;
  quantity: number;
}

/** Result of resolving a monster's death */
export interface MonsterDeathResult {
  monsterId: string;
  xpReward: number;
  loot: LootDrop[];
}

/** Full result of an encounter resolution */
export interface CombatResult {
  monstersKilled: MonsterDeathResult[];
  totalXp: number;
  allLoot: LootDrop[];
}

/** State for a single monster during combat */
export interface CombatMonster {
  id: string;
  archetype: MonsterArchetype;
  currentHp: number;
}

// --- Combat state ---

let activeCombatMonsters: CombatMonster[] = [];

/** Initialize combat state from spawned monsters */
export function initCombat(
  monsters: Array<{ id: string; archetype: MonsterArchetype }>,
): void {
  activeCombatMonsters = monsters.map((m) => ({
    id: m.id,
    archetype: m.archetype,
    currentHp: m.archetype.health,
  }));
}

/** Get current combat monsters (for rendering HP bars, etc.) */
export function getCombatMonsters(): readonly CombatMonster[] {
  return activeCombatMonsters;
}

/** Check if all monsters are dead */
export function isCombatOver(): boolean {
  return (
    activeCombatMonsters.length > 0 &&
    activeCombatMonsters.every((m) => m.currentHp <= 0)
  );
}

/** Clear combat state */
export function clearCombat(): void {
  activeCombatMonsters = [];
}

// --- Damage calculation ---

/** Base player damage (will be augmented by equipment stats later) */
const BASE_PLAYER_DAMAGE = 8;
const CRIT_CHANCE = 0.15;
const CRIT_MULTIPLIER = 2;
const DAMAGE_VARIANCE = 0.2;

/**
 * Calculate damage the player deals to a monster.
 * Takes optional playerDamage to support equipment bonuses.
 */
export function calculatePlayerDamage(
  playerDamage = BASE_PLAYER_DAMAGE,
  rng = Math.random,
): { damage: number; isCritical: boolean } {
  const isCritical = rng() < CRIT_CHANCE;
  const variance = 1 + (rng() * 2 - 1) * DAMAGE_VARIANCE;
  let damage = Math.round(playerDamage * variance);
  if (isCritical) {
    damage = Math.round(damage * CRIT_MULTIPLIER);
  }
  return { damage: Math.max(1, damage), isCritical };
}

/**
 * Calculate damage a monster deals to the player.
 */
export function calculateMonsterDamage(
  archetype: MonsterArchetype,
  rng = Math.random,
): number {
  const variance = 1 + (rng() * 2 - 1) * DAMAGE_VARIANCE;
  return Math.max(1, Math.round(archetype.damage * variance));
}

// --- Attack resolution ---

/**
 * Player attacks a specific monster.
 * Returns the attack result and updates internal combat state.
 */
export function playerAttack(
  targetId: string,
  playerDamage?: number,
  rng = Math.random,
): AttackResult | null {
  const monster = activeCombatMonsters.find((m) => m.id === targetId);
  if (!monster || monster.currentHp <= 0) return null;

  const { damage, isCritical } = calculatePlayerDamage(playerDamage, rng);
  monster.currentHp = Math.max(0, monster.currentHp - damage);

  return {
    targetId,
    damage,
    isCritical,
    remainingHp: monster.currentHp,
    isDead: monster.currentHp <= 0,
  };
}

/**
 * Player attacks the first alive monster (convenience for auto-target).
 */
export function playerAttackNearest(
  playerDamage?: number,
  rng = Math.random,
): AttackResult | null {
  const target = activeCombatMonsters.find((m) => m.currentHp > 0);
  if (!target) return null;
  return playerAttack(target.id, playerDamage, rng);
}

/**
 * All alive monsters attack the player.
 * Returns total damage and per-monster breakdown.
 */
export function monstersTurn(rng = Math.random): {
  totalDamage: number;
  attacks: Array<{ monsterId: string; damage: number }>;
} {
  const attacks: Array<{ monsterId: string; damage: number }> = [];
  let totalDamage = 0;

  for (const monster of activeCombatMonsters) {
    if (monster.currentHp <= 0) continue;
    const damage = calculateMonsterDamage(monster.archetype, rng);
    attacks.push({ monsterId: monster.id, damage });
    totalDamage += damage;
  }

  return { totalDamage, attacks };
}

// --- Loot ---

/**
 * Roll loot drops for a defeated monster.
 */
export function rollLoot(
  archetype: MonsterArchetype,
  rng = Math.random,
): LootDrop[] {
  const tier = archetype.dangerTier;
  const table = getLootTableByTier(tier);
  if (!table || table.entries.length === 0) return [];

  const drops: LootDrop[] = [];

  for (const entry of table.entries) {
    if (rng() < entry.weight) {
      const [minQty, maxQty] = entry.quantity;
      const quantity = minQty + Math.floor(rng() * (maxQty - minQty + 1));
      drops.push({ itemId: entry.itemId, quantity });
    }
  }

  return drops;
}

// --- Full resolution ---

/**
 * Resolve the entire combat encounter.
 * Collects death results and loot for all defeated monsters.
 */
export function resolveCombat(rng = Math.random): CombatResult {
  const monstersKilled: MonsterDeathResult[] = [];
  const allLoot: LootDrop[] = [];
  let totalXp = 0;

  for (const monster of activeCombatMonsters) {
    if (monster.currentHp <= 0) {
      const loot = rollLoot(monster.archetype, rng);
      const xp = monster.archetype.xpReward ?? monster.archetype.health;
      monstersKilled.push({
        monsterId: monster.id,
        xpReward: xp,
        loot,
      });
      totalXp += xp;
      allLoot.push(...loot);
    }
  }

  return { monstersKilled, totalXp, allLoot };
}
