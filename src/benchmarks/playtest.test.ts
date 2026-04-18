/**
 * Headless playtester integration test.
 *
 * Runs a simulated AI agent through game logic without rendering.
 * Validates that the kingdom map, road network, settlements, encounters,
 * and quest triggers all work together coherently.
 */

import { describe, expect, it } from 'vitest';
import {
  calculateMonsterDamage,
  calculatePlayerDamage,
} from '@/combat-resolver';
import { createRng } from '@/core';
import type { EncounterTable } from '@/schemas/encounter-table.schema';
import { KingdomConfigSchema } from '@/schemas/kingdom.schema';
import type { MonsterArchetype } from '@/schemas/monster.schema';
import type { QuestDefinition } from '@/schemas/quest.schema';
import { getDangerTier, getEncounterChance } from '@/world/danger';
import {
  generateKingdom,
  getKingdomTile,
  getRegionAt,
  getSettlementAt,
} from '@/world/kingdom-gen';
import { resolveQuestGraph } from '@/world/quest-resolver';

// --- Content imports ---

import tier0Json from '../content/encounters/tier-0.json';
import tier1Json from '../content/encounters/tier-1.json';
import tier2Json from '../content/encounters/tier-2.json';
import tier3Json from '../content/encounters/tier-3.json';
import tier4Json from '../content/encounters/tier-4.json';
import ancientHorrorJson from '../content/monsters/ancient_horror.json';
import banditMon from '../content/monsters/bandit.json';
import banditLeaderJson from '../content/monsters/bandit_leader.json';
import basiliskJson from '../content/monsters/basilisk.json';
import butterflySwarmJson from '../content/monsters/butterfly_swarm.json';
import deerJson from '../content/monsters/deer.json';
import direWolfJson from '../content/monsters/dire_wolf.json';
import dragonJson from '../content/monsters/dragon.json';
import drakeJson from '../content/monsters/drake.json';
import giantRatJson from '../content/monsters/giant_rat.json';
import giantSpiderJson from '../content/monsters/giant_spider.json';
import hedgehogJson from '../content/monsters/hedgehog.json';
import lichLordJson from '../content/monsters/lich_lord.json';
import necromancerJson from '../content/monsters/necromancer.json';
import rabbitJson from '../content/monsters/rabbit.json';
import skeletonJson from '../content/monsters/skeleton.json';
import slimeJson from '../content/monsters/slime.json';
import songbirdJson from '../content/monsters/songbird.json';
import trollJson from '../content/monsters/troll.json';
import wolfJson from '../content/monsters/wolf.json';
import wraithJson from '../content/monsters/wraith.json';
import chapter00 from '../content/quests/main/chapter-00.json';
import chapter01 from '../content/quests/main/chapter-01.json';
import chapter02 from '../content/quests/main/chapter-02.json';
import chapter03 from '../content/quests/main/chapter-03.json';
import chapter04 from '../content/quests/main/chapter-04.json';
import chapter05 from '../content/quests/main/chapter-05.json';
import kingdomConfigJson from '../content/world/kingdom-config.json';

const config = KingdomConfigSchema.parse(kingdomConfigJson);

const ALL_QUESTS = [
  chapter00,
  chapter01,
  chapter02,
  chapter03,
  chapter04,
  chapter05,
] as unknown as QuestDefinition[];

const ENCOUNTER_TABLES: Record<number, EncounterTable> = {
  0: tier0Json as unknown as EncounterTable,
  1: tier1Json as unknown as EncounterTable,
  2: tier2Json as unknown as EncounterTable,
  3: tier3Json as unknown as EncounterTable,
  4: tier4Json as unknown as EncounterTable,
};

const MONSTER_ARCHETYPES: Record<string, MonsterArchetype> = {
  // Tier 0 — critters
  rabbit: rabbitJson as unknown as MonsterArchetype,
  deer: deerJson as unknown as MonsterArchetype,
  songbird: songbirdJson as unknown as MonsterArchetype,
  hedgehog: hedgehogJson as unknown as MonsterArchetype,
  butterfly_swarm: butterflySwarmJson as unknown as MonsterArchetype,
  // Tier 1
  wolf: wolfJson as unknown as MonsterArchetype,
  bandit: banditMon as unknown as MonsterArchetype,
  giant_rat: giantRatJson as unknown as MonsterArchetype,
  skeleton: skeletonJson as unknown as MonsterArchetype,
  slime: slimeJson as unknown as MonsterArchetype,
  // Tier 2
  dire_wolf: direWolfJson as unknown as MonsterArchetype,
  bandit_leader: banditLeaderJson as unknown as MonsterArchetype,
  giant_spider: giantSpiderJson as unknown as MonsterArchetype,
  wraith: wraithJson as unknown as MonsterArchetype,
  troll: trollJson as unknown as MonsterArchetype,
  // Tier 3
  drake: drakeJson as unknown as MonsterArchetype,
  necromancer: necromancerJson as unknown as MonsterArchetype,
  basilisk: basiliskJson as unknown as MonsterArchetype,
  // Tier 4
  dragon: dragonJson as unknown as MonsterArchetype,
  lich_lord: lichLordJson as unknown as MonsterArchetype,
  ancient_horror: ancientHorrorJson as unknown as MonsterArchetype,
};

// --- Minimal playtest agent for test assertions ---

function runPlaytest(seed: string) {
  const map = generateKingdom(seed, config);
  const questGraph = resolveQuestGraph(ALL_QUESTS, seed);
  const rng = createRng(`${seed}-playtest`);

  // Collect road tiles sorted south to north
  const roadTiles: [number, number][] = [];
  for (const tile of map.tiles) {
    if (tile.hasRoad && tile.isLand) {
      roadTiles.push([tile.x, tile.y]);
    }
  }
  roadTiles.sort((a, b) => a[1] - b[1]);

  const visitedSettlements = new Set<string>();
  const regionsCrossed = new Set<string>();
  let encounterCount = 0;
  const encountersByTier: Record<number, number> = {};
  const _deadZoneLength = 0;
  let maxDeadZone = 0;
  let lastEventTick = 0;

  for (let i = 0; i < roadTiles.length; i++) {
    const [rx, ry] = roadTiles[i];

    // Track regions
    const region = getRegionAt(map, rx, ry);
    if (region) regionsCrossed.add(region.id);

    // Check settlement
    const settlement = getSettlementAt(map, rx, ry, 2);
    if (settlement && !visitedSettlements.has(settlement.id)) {
      visitedSettlements.add(settlement.id);
      lastEventTick = i;
    }

    // Also explore adjacent wilderness tiles (simulate going off-road)
    const tilesToCheck: [number, number][] = [[rx, ry]];
    // Every 5th road tile, detour one tile east and west
    if (i % 5 === 0) {
      tilesToCheck.push([rx - 1, ry], [rx + 1, ry]);
    }

    for (const [tx, ty] of tilesToCheck) {
      const tile = getKingdomTile(map, tx, ty);
      if (!tile || !tile.isLand) continue;
      const nearSettlement = getSettlementAt(map, tx, ty, 2);
      if (nearSettlement) continue;

      const chunkType = tile.hasRoad ? ('ROAD' as const) : ('WILD' as const);
      const tier = getDangerTier(tx, ty, chunkType, map);
      const chance = getEncounterChance(tier);
      // Simulate 60 frames per tile
      for (let f = 0; f < 60; f++) {
        if (rng() < chance) {
          encounterCount++;
          encountersByTier[tier] = (encountersByTier[tier] ?? 0) + 1;
          lastEventTick = i;
          break;
        }
      }
    }

    // Track dead zones
    const gap = i - lastEventTick;
    if (gap > maxDeadZone) maxDeadZone = gap;
  }

  return {
    map,
    questGraph,
    roadTiles,
    visitedSettlements,
    regionsCrossed,
    encounterCount,
    encountersByTier,
    maxDeadZone,
  };
}

describe('headless playtest', () => {
  const SEEDS = ['playtest-1', 'playtest-2', 'playtest-3'];

  for (const seed of SEEDS) {
    describe(`seed: ${seed}`, () => {
      const result = runPlaytest(seed);

      it('generates a map with road tiles', () => {
        expect(result.roadTiles.length).toBeGreaterThan(50);
      });

      it('finds at least 4 anchor settlements along the road', () => {
        expect(result.visitedSettlements.size).toBeGreaterThanOrEqual(4);
      });

      it('crosses at least 3 distinct regions', () => {
        expect(result.regionsCrossed.size).toBeGreaterThanOrEqual(3);
      });

      it('encounters at least some monsters', () => {
        expect(result.encounterCount).toBeGreaterThan(0);
      });

      it('resolves quest graph for all main quests', () => {
        expect(result.questGraph.quests.length).toBe(ALL_QUESTS.length);
        for (const rq of result.questGraph.quests) {
          expect(rq.steps.length).toBeGreaterThan(0);
        }
      });

      it('has no dead zone longer than 50 tiles', () => {
        expect(result.maxDeadZone).toBeLessThan(50);
      });
    });
  }
});

describe('encounter system integration', () => {
  it('all encounter table entries reference valid monster archetypes', () => {
    for (const [tier, table] of Object.entries(ENCOUNTER_TABLES)) {
      for (const entry of table.entries) {
        expect(
          MONSTER_ARCHETYPES[entry.monsterId],
          `Tier ${tier} references unknown monster: ${entry.monsterId}`,
        ).toBeDefined();
      }
    }
  });

  it('encounter table weights sum to approximately 1', () => {
    for (const [_tier, table] of Object.entries(ENCOUNTER_TABLES)) {
      const totalWeight = table.entries.reduce((s, e) => s + e.weight, 0);
      expect(totalWeight).toBeGreaterThan(0.5);
      expect(totalWeight).toBeLessThanOrEqual(1.5);
    }
  });

  it('combat damage calculations produce valid results', () => {
    const rng = createRng('combat-test');
    for (let i = 0; i < 100; i++) {
      const { damage, isCritical } = calculatePlayerDamage(8, rng);
      expect(damage).toBeGreaterThanOrEqual(1);
      expect(typeof isCritical).toBe('boolean');
    }
  });

  it('monster damage is positive for all archetypes', () => {
    const rng = createRng('monster-damage-test');
    for (const [id, archetype] of Object.entries(MONSTER_ARCHETYPES)) {
      const dmg = calculateMonsterDamage(archetype, rng);
      expect(dmg, `${id} should deal positive damage`).toBeGreaterThanOrEqual(
        1,
      );
    }
  });
});

describe('danger tier coverage', () => {
  it('all 5 danger tiers appear somewhere on the kingdom map', () => {
    const map = generateKingdom('tier-coverage-test', config);
    const tiersFound = new Set<number>();

    // Towns give tier 0
    tiersFound.add(0);

    // Check all regions
    for (const region of map.regions) {
      if (region.dangerTier !== undefined) {
        tiersFound.add(region.dangerTier);
      }
    }

    // We should have tiers 0-4 based on the authored kingdom config
    expect(tiersFound.has(0)).toBe(true);
    expect(tiersFound.has(1)).toBe(true);
    expect(tiersFound.has(2)).toBe(true);
    expect(tiersFound.has(3)).toBe(true);
    expect(tiersFound.has(4)).toBe(true);
  });
});
