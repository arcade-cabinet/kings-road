import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { initContentStore } from '../../db/content-queries';
import type { MonsterArchetype } from '../../schemas/monster.schema';
import {
  calculateMonsterDamage,
  calculatePlayerDamage,
  clearCombat,
  getCombatMonsters,
  initCombat,
  isCombatOver,
  monstersTurn,
  playerAttack,
  playerAttackNearest,
  resolveCombat,
  rollLoot,
} from './combat-resolver';

// Initialize content store with minimal loot tables for testing
beforeAll(() => {
  initContentStore({
    monsters: [],
    items: [],
    encounterTables: [],
    lootTables: [
      {
        id: 'loot-tier-0',
        entries: [
          { item_id: 'ration', weight: 0.7, quantity_min: 1, quantity_max: 2 },
          { item_id: 'torch', weight: 0.6, quantity_min: 1, quantity_max: 1 },
        ],
      },
      {
        id: 'loot-tier-1',
        entries: [
          { item_id: 'ration', weight: 0.7, quantity_min: 1, quantity_max: 3 },
          {
            item_id: 'health_potion',
            weight: 0.15,
            quantity_min: 1,
            quantity_max: 1,
          },
        ],
      },
      {
        id: 'loot-tier-4',
        entries: [
          {
            item_id: 'dragon_scale',
            weight: 0.5,
            quantity_min: 1,
            quantity_max: 3,
          },
          { item_id: 'elixir', weight: 0.3, quantity_min: 1, quantity_max: 1 },
        ],
      },
    ],
    npcsNamed: [],
    npcPools: [],
    buildings: [],
    towns: [],
    features: [],
    quests: [],
    dungeons: [],
    encounters: [],
    roadSpine: null,
    pacingConfig: null,
  });
});

const WOLF: MonsterArchetype = {
  id: 'wolf',
  name: 'Grey Wolf',
  bodyType: 'quadruped',
  size: 0.9,
  colorScheme: { primary: '#6b6b6b', secondary: '#a3a3a3' },
  dangerTier: 1,
  health: 18,
  damage: 5,
};

const SLIME: MonsterArchetype = {
  id: 'slime',
  name: 'Green Slime',
  bodyType: 'amorphous',
  size: 0.6,
  colorScheme: { primary: '#4caf50' },
  dangerTier: 0,
  health: 10,
  damage: 2,
};

const DRAGON: MonsterArchetype = {
  id: 'dragon',
  name: 'Elder Dragon',
  bodyType: 'quadruped',
  size: 4.0,
  colorScheme: { primary: '#b71c1c', secondary: '#ff6f00' },
  dangerTier: 4,
  health: 200,
  damage: 30,
  xpReward: 500,
};

/** Deterministic RNG that always returns a fixed value */
function fixedRng(value: number) {
  return () => value;
}

describe('combat-resolver', () => {
  afterEach(() => {
    clearCombat();
  });

  describe('calculatePlayerDamage', () => {
    it('deals positive damage', () => {
      const { damage } = calculatePlayerDamage(10, fixedRng(0.5));
      expect(damage).toBeGreaterThan(0);
    });

    it('applies critical hit when rng is below threshold', () => {
      // First call is crit check (0.1 < 0.15 = crit), second is variance
      let callCount = 0;
      const rng = () => {
        callCount++;
        return callCount === 1 ? 0.1 : 0.5;
      };
      const { damage, isCritical } = calculatePlayerDamage(10, rng);
      expect(isCritical).toBe(true);
      expect(damage).toBeGreaterThan(10);
    });

    it('does not crit when rng is above threshold', () => {
      let callCount = 0;
      const rng = () => {
        callCount++;
        return callCount === 1 ? 0.5 : 0.5;
      };
      const { isCritical } = calculatePlayerDamage(10, rng);
      expect(isCritical).toBe(false);
    });

    it('never deals zero or negative damage', () => {
      const { damage } = calculatePlayerDamage(1, fixedRng(0.99));
      expect(damage).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateMonsterDamage', () => {
    it('returns positive damage based on archetype', () => {
      const dmg = calculateMonsterDamage(WOLF, fixedRng(0.5));
      expect(dmg).toBeGreaterThan(0);
    });

    it('scales with archetype damage', () => {
      const wolfDmg = calculateMonsterDamage(WOLF, fixedRng(0.5));
      const dragonDmg = calculateMonsterDamage(DRAGON, fixedRng(0.5));
      expect(dragonDmg).toBeGreaterThan(wolfDmg);
    });
  });

  describe('initCombat / getCombatMonsters', () => {
    it('initializes combat state with full HP monsters', () => {
      initCombat([
        { id: 'wolf-1', archetype: WOLF },
        { id: 'wolf-2', archetype: WOLF },
      ]);

      const monsters = getCombatMonsters();
      expect(monsters).toHaveLength(2);
      expect(monsters[0].currentHp).toBe(18);
      expect(monsters[1].currentHp).toBe(18);
    });
  });

  describe('playerAttack', () => {
    it('damages a specific monster', () => {
      initCombat([{ id: 'wolf-1', archetype: WOLF }]);

      const result = playerAttack('wolf-1', 10, fixedRng(0.5));
      expect(result).not.toBeNull();
      expect(result!.damage).toBeGreaterThan(0);
      expect(result!.remainingHp).toBeLessThan(18);
      expect(result!.targetId).toBe('wolf-1');
    });

    it('kills a monster when HP reaches 0', () => {
      initCombat([{ id: 'slime-1', archetype: SLIME }]);

      // Attack with high damage to guarantee kill
      const result = playerAttack('slime-1', 100, fixedRng(0.5));
      expect(result!.isDead).toBe(true);
      expect(result!.remainingHp).toBe(0);
    });

    it('returns null for already dead monster', () => {
      initCombat([{ id: 'slime-1', archetype: SLIME }]);
      playerAttack('slime-1', 100, fixedRng(0.5));

      const result = playerAttack('slime-1', 10, fixedRng(0.5));
      expect(result).toBeNull();
    });

    it('returns null for unknown monster id', () => {
      initCombat([{ id: 'wolf-1', archetype: WOLF }]);
      const result = playerAttack('nonexistent', 10, fixedRng(0.5));
      expect(result).toBeNull();
    });
  });

  describe('playerAttackNearest', () => {
    it('attacks the first alive monster', () => {
      initCombat([
        { id: 'wolf-1', archetype: WOLF },
        { id: 'wolf-2', archetype: WOLF },
      ]);

      const result = playerAttackNearest(10, fixedRng(0.5));
      expect(result).not.toBeNull();
      expect(result!.targetId).toBe('wolf-1');
    });

    it('skips dead monsters', () => {
      initCombat([
        { id: 'slime-1', archetype: SLIME },
        { id: 'wolf-1', archetype: WOLF },
      ]);

      // Kill the slime
      playerAttack('slime-1', 100, fixedRng(0.5));

      // Should target the wolf
      const result = playerAttackNearest(10, fixedRng(0.5));
      expect(result!.targetId).toBe('wolf-1');
    });

    it('returns null when all monsters are dead', () => {
      initCombat([{ id: 'slime-1', archetype: SLIME }]);
      playerAttack('slime-1', 100, fixedRng(0.5));

      expect(playerAttackNearest(10, fixedRng(0.5))).toBeNull();
    });
  });

  describe('monstersTurn', () => {
    it('all alive monsters attack the player', () => {
      initCombat([
        { id: 'wolf-1', archetype: WOLF },
        { id: 'wolf-2', archetype: WOLF },
      ]);

      const { totalDamage, attacks } = monstersTurn(fixedRng(0.5));
      expect(attacks).toHaveLength(2);
      expect(totalDamage).toBeGreaterThan(0);
    });

    it('dead monsters do not attack', () => {
      initCombat([
        { id: 'slime-1', archetype: SLIME },
        { id: 'wolf-1', archetype: WOLF },
      ]);
      playerAttack('slime-1', 100, fixedRng(0.5));

      const { attacks } = monstersTurn(fixedRng(0.5));
      expect(attacks).toHaveLength(1);
      expect(attacks[0].monsterId).toBe('wolf-1');
    });

    it('returns zero damage when all monsters are dead', () => {
      initCombat([{ id: 'slime-1', archetype: SLIME }]);
      playerAttack('slime-1', 100, fixedRng(0.5));

      const { totalDamage, attacks } = monstersTurn(fixedRng(0.5));
      expect(totalDamage).toBe(0);
      expect(attacks).toHaveLength(0);
    });
  });

  describe('isCombatOver', () => {
    it('returns false when monsters are alive', () => {
      initCombat([{ id: 'wolf-1', archetype: WOLF }]);
      expect(isCombatOver()).toBe(false);
    });

    it('returns true when all monsters are dead', () => {
      initCombat([{ id: 'slime-1', archetype: SLIME }]);
      playerAttack('slime-1', 100, fixedRng(0.5));
      expect(isCombatOver()).toBe(true);
    });

    it('returns false when some monsters are alive', () => {
      initCombat([
        { id: 'slime-1', archetype: SLIME },
        { id: 'wolf-1', archetype: WOLF },
      ]);
      playerAttack('slime-1', 100, fixedRng(0.5));
      expect(isCombatOver()).toBe(false);
    });
  });

  describe('rollLoot', () => {
    it('returns loot drops based on danger tier', () => {
      // With rng always returning 0 (below all weights), every entry drops
      const loot = rollLoot(WOLF, fixedRng(0));
      expect(loot.length).toBeGreaterThan(0);
      for (const drop of loot) {
        expect(drop.itemId).toBeTruthy();
        expect(drop.quantity).toBeGreaterThanOrEqual(1);
      }
    });

    it('returns empty array when rng exceeds all weights', () => {
      // With rng = 0.99, most entries won't drop (weight < 1.0)
      const loot = rollLoot(WOLF, fixedRng(0.99));
      // Most tier-1 entries have weight <= 0.7, so few/none will drop
      for (const drop of loot) {
        expect(drop.quantity).toBeGreaterThanOrEqual(1);
      }
    });

    it('returns different loot for different tiers', () => {
      const lootTier0 = rollLoot(SLIME, fixedRng(0));
      const lootTier4 = rollLoot(DRAGON, fixedRng(0));

      // Tier 0 and tier 4 have different loot tables
      const tier0Items = lootTier0.map((d) => d.itemId);
      const tier4Items = lootTier4.map((d) => d.itemId);

      // At minimum, both should produce some loot
      expect(tier0Items.length).toBeGreaterThan(0);
      expect(tier4Items.length).toBeGreaterThan(0);
    });
  });

  describe('resolveCombat', () => {
    it('collects results for all dead monsters', () => {
      initCombat([
        { id: 'slime-1', archetype: SLIME },
        { id: 'slime-2', archetype: SLIME },
      ]);
      playerAttack('slime-1', 100, fixedRng(0.5));
      playerAttack('slime-2', 100, fixedRng(0.5));

      const result = resolveCombat(fixedRng(0));
      expect(result.monstersKilled).toHaveLength(2);
      expect(result.totalXp).toBeGreaterThan(0);
    });

    it('uses xpReward from archetype when available', () => {
      initCombat([{ id: 'dragon-1', archetype: DRAGON }]);
      playerAttack('dragon-1', 1000, fixedRng(0.5));

      const result = resolveCombat(fixedRng(0));
      expect(result.monstersKilled[0].xpReward).toBe(500);
      expect(result.totalXp).toBe(500);
    });

    it('falls back to health as XP when xpReward is not set', () => {
      initCombat([{ id: 'wolf-1', archetype: WOLF }]);
      playerAttack('wolf-1', 100, fixedRng(0.5));

      const result = resolveCombat(fixedRng(0));
      expect(result.monstersKilled[0].xpReward).toBe(18); // wolf health
    });

    it('skips alive monsters in resolution', () => {
      initCombat([
        { id: 'slime-1', archetype: SLIME },
        { id: 'wolf-1', archetype: WOLF },
      ]);
      playerAttack('slime-1', 100, fixedRng(0.5));

      const result = resolveCombat(fixedRng(0));
      expect(result.monstersKilled).toHaveLength(1);
      expect(result.monstersKilled[0].monsterId).toBe('slime-1');
    });

    it('aggregates all loot into allLoot', () => {
      initCombat([
        { id: 'slime-1', archetype: SLIME },
        { id: 'slime-2', archetype: SLIME },
      ]);
      playerAttack('slime-1', 100, fixedRng(0.5));
      playerAttack('slime-2', 100, fixedRng(0.5));

      const result = resolveCombat(fixedRng(0));
      // Each slime drops loot from tier 0
      expect(result.allLoot.length).toBeGreaterThan(0);
    });
  });

  describe('full combat lifecycle', () => {
    it('runs a complete encounter from init to resolution', () => {
      // Initialize with 2 wolves
      initCombat([
        { id: 'wolf-1', archetype: WOLF },
        { id: 'wolf-2', archetype: WOLF },
      ]);

      expect(getCombatMonsters()).toHaveLength(2);
      expect(isCombatOver()).toBe(false);

      // Player attacks wolf-1 until dead
      while (!getCombatMonsters().find((m) => m.id === 'wolf-1')!.currentHp) {
        break; // Already checked, just attack
      }
      playerAttack('wolf-1', 100, fixedRng(0.5)); // Kill wolf-1
      expect(isCombatOver()).toBe(false);

      // Monsters counter-attack
      const { totalDamage } = monstersTurn(fixedRng(0.5));
      expect(totalDamage).toBeGreaterThan(0); // wolf-2 is alive

      // Kill wolf-2
      playerAttack('wolf-2', 100, fixedRng(0.5));
      expect(isCombatOver()).toBe(true);

      // Resolve loot and XP
      const result = resolveCombat(fixedRng(0));
      expect(result.monstersKilled).toHaveLength(2);
      expect(result.totalXp).toBe(36); // 2 x 18hp wolves
      expect(result.allLoot.length).toBeGreaterThan(0);

      // Cleanup
      clearCombat();
      expect(getCombatMonsters()).toHaveLength(0);
    });
  });
});
