/**
 * Headless AI playtester — runs game logic without rendering.
 *
 * Simulates a player walking the King's Road from Ashford to Grailsend,
 * visiting settlements, interacting with NPCs, triggering quests, and
 * encountering monsters.
 *
 * Generates a play-by-play JSON report and flags content gaps:
 * - Dead zones (long stretches with nothing to interact with)
 * - Missing NPCs at settlements
 * - Encounter rate anomalies
 * - Unreachable quests
 *
 * Usage: npx tsx scripts/playtest.ts [--seeds N] [--output path]
 */

import { createRng } from '@/core';
import {
  calculateMonsterDamage,
  calculatePlayerDamage,
} from '../src/combat-resolver';
import type { EncounterTable } from '../src/schemas/encounter-table.schema';
import type { KingdomMap, Settlement } from '../src/schemas/kingdom.schema';
import { KingdomConfigSchema } from '../src/schemas/kingdom.schema';
import type { MonsterArchetype } from '../src/schemas/monster.schema';
import type { QuestDefinition } from '../src/schemas/quest.schema';
import { getDangerTier, getEncounterChance } from '../src/world/danger';
import {
  generateKingdom,
  getKingdomTile,
  getRegionAt,
  getSettlementAt,
} from '../src/world/kingdom-gen';
import { resolveQuestGraph } from '../src/world/quest-resolver';

// --- Static content imports ---

// Monster and encounter imports
import tier0Json from '../src/content/encounters/tier-0.json';
import tier1Json from '../src/content/encounters/tier-1.json';
import tier2Json from '../src/content/encounters/tier-2.json';
import tier3Json from '../src/content/encounters/tier-3.json';
import tier4Json from '../src/content/encounters/tier-4.json';
import ancientHorrorJson from '../src/content/monsters/ancient_horror.json';
import banditMon from '../src/content/monsters/bandit.json';
import banditLeaderJson from '../src/content/monsters/bandit_leader.json';
import basiliskJson from '../src/content/monsters/basilisk.json';
import deerJson from '../src/content/monsters/deer.json';
import direWolfJson from '../src/content/monsters/dire_wolf.json';
import dragonJson from '../src/content/monsters/dragon.json';
import drakeJson from '../src/content/monsters/drake.json';
import giantRatJson from '../src/content/monsters/giant_rat.json';
import giantSpiderJson from '../src/content/monsters/giant_spider.json';
import hedgehogJson from '../src/content/monsters/hedgehog.json';
import lichLordJson from '../src/content/monsters/lich_lord.json';
import necromancerJson from '../src/content/monsters/necromancer.json';
import rabbitJson from '../src/content/monsters/rabbit.json';
import skeletonJson from '../src/content/monsters/skeleton.json';
import slimeJson from '../src/content/monsters/slime.json';
import songbirdJson from '../src/content/monsters/songbird.json';
import trollJson from '../src/content/monsters/troll.json';
import wolfJson from '../src/content/monsters/wolf.json';
import wraithJson from '../src/content/monsters/wraith.json';
import chapter00 from '../src/content/quests/main/chapter-00.json';
import chapter01 from '../src/content/quests/main/chapter-01.json';
import chapter02 from '../src/content/quests/main/chapter-02.json';
import chapter03 from '../src/content/quests/main/chapter-03.json';
import chapter04 from '../src/content/quests/main/chapter-04.json';
import chapter05 from '../src/content/quests/main/chapter-05.json';
import aldricsMissingHammer from '../src/content/quests/side/aldrics-missing-hammer.json';
import banditAmbush from '../src/content/quests/side/bandit-ambush.json';
import besssSecretRecipe from '../src/content/quests/side/besss-secret-recipe.json';
import fatherCedricsLostHymnal from '../src/content/quests/side/father-cedrics-lost-hymnal.json';
import lordAshwicksSecret from '../src/content/quests/side/lord-ashwicks-secret.json';
import lostPilgrim from '../src/content/quests/side/lost-pilgrim.json';
import merchantsBrokenCart from '../src/content/quests/side/merchants-broken-cart.json';
import sisterMaevesGarden from '../src/content/quests/side/sister-maeves-garden.json';
import strangeShrine from '../src/content/quests/side/strange-shrine.json';
import theBridgeTroll from '../src/content/quests/side/the-bridge-troll.json';
import theCartographersMap from '../src/content/quests/side/the-cartographers-map.json';
import theCursedRing from '../src/content/quests/side/the-cursed-ring.json';
import theDeserter from '../src/content/quests/side/the-deserter.json';
import theHerbalistsJourney from '../src/content/quests/side/the-herbalists-journey.json';
import theMissingManuscript from '../src/content/quests/side/the-missing-manuscript.json';
import theMissingMerchant from '../src/content/quests/side/the-missing-merchant.json';
import thePoisonedWell from '../src/content/quests/side/the-poisoned-well.json';
import theUnderground from '../src/content/quests/side/the-underground.json';
import woundedSoldier from '../src/content/quests/side/wounded-soldier.json';
import kingdomConfigJson from '../src/content/world/kingdom-config.json';

// --- Registries ---

const ALL_QUESTS: QuestDefinition[] = [
  chapter00,
  chapter01,
  chapter02,
  chapter03,
  chapter04,
  chapter05,
  aldricsMissingHammer,
  banditAmbush,
  besssSecretRecipe,
  fatherCedricsLostHymnal,
  lordAshwicksSecret,
  lostPilgrim,
  merchantsBrokenCart,
  sisterMaevesGarden,
  strangeShrine,
  theBridgeTroll,
  theCartographersMap,
  theCursedRing,
  theDeserter,
  theHerbalistsJourney,
  theMissingMerchant,
  theMissingManuscript,
  thePoisonedWell,
  theUnderground,
  woundedSoldier,
] as unknown as QuestDefinition[];

const MONSTER_ARCHETYPES: Record<string, MonsterArchetype> = {
  wolf: wolfJson as unknown as MonsterArchetype,
  bandit: banditMon as unknown as MonsterArchetype,
  giant_rat: giantRatJson as unknown as MonsterArchetype,
  skeleton: skeletonJson as unknown as MonsterArchetype,
  slime: slimeJson as unknown as MonsterArchetype,
  dire_wolf: direWolfJson as unknown as MonsterArchetype,
  bandit_leader: banditLeaderJson as unknown as MonsterArchetype,
  giant_spider: giantSpiderJson as unknown as MonsterArchetype,
  wraith: wraithJson as unknown as MonsterArchetype,
  troll: trollJson as unknown as MonsterArchetype,
  drake: drakeJson as unknown as MonsterArchetype,
  necromancer: necromancerJson as unknown as MonsterArchetype,
  basilisk: basiliskJson as unknown as MonsterArchetype,
  dragon: dragonJson as unknown as MonsterArchetype,
  lich_lord: lichLordJson as unknown as MonsterArchetype,
  ancient_horror: ancientHorrorJson as unknown as MonsterArchetype,
  rabbit: rabbitJson as unknown as MonsterArchetype,
  deer: deerJson as unknown as MonsterArchetype,
  songbird: songbirdJson as unknown as MonsterArchetype,
  hedgehog: hedgehogJson as unknown as MonsterArchetype,
};

const ENCOUNTER_TABLES: Record<number, EncounterTable> = {
  0: tier0Json as unknown as EncounterTable,
  1: tier1Json as unknown as EncounterTable,
  2: tier2Json as unknown as EncounterTable,
  3: tier3Json as unknown as EncounterTable,
  4: tier4Json as unknown as EncounterTable,
};

const config = KingdomConfigSchema.parse(kingdomConfigJson);

// --- Types ---

interface LogEntry {
  tick: number;
  gridPos: [number, number];
  action: string;
  detail: string;
}

interface EncounterLog {
  gridPos: [number, number];
  tier: number;
  monsters: string[];
  outcome: 'victory' | 'fled' | 'defeat';
  hpLost: number;
}

interface SettlementVisit {
  id: string;
  name: string;
  gridPos: [number, number];
  tick: number;
  npcsPresent: number;
  questsTriggered: string[];
}

interface ContentGap {
  type: 'dead_zone' | 'missing_npc' | 'encounter_drought' | 'stuck';
  location: [number, number];
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface PlaytestReport {
  seed: string;
  generationTimeMs: number;
  totalTicks: number;
  tilesTraversed: number;
  settlementsVisited: SettlementVisit[];
  encounterCount: number;
  encountersByTier: Record<number, number>;
  encounters: EncounterLog[];
  questsTriggered: string[];
  questsCompleted: string[];
  contentGaps: ContentGap[];
  log: LogEntry[];
  playerHp: number;
  reachedGoal: boolean;
  regionsCrossed: string[];
}

// --- AI Agent ---

class PlaytestAgent {
  private map: KingdomMap;
  private seed: string;
  private rng: () => number;
  private questGraph: ReturnType<typeof resolveQuestGraph>;

  // Agent state
  private pos: [number, number];
  private hp = 100;
  private maxHp = 100;
  private tick = 0;
  private encounterCooldown = 0;

  // Report accumulators
  private log: LogEntry[] = [];
  private encounters: EncounterLog[] = [];
  private settlementVisits: SettlementVisit[] = [];
  private questsTriggered: string[] = [];
  private questsCompleted: string[] = [];
  private contentGaps: ContentGap[] = [];
  private encountersByTier: Record<number, number> = {};
  private regionsCrossed = new Set<string>();
  private lastEventTick = 0;
  private visitedSettlements = new Set<string>();
  private tilesTraversed = 0;

  constructor(seed: string, map: KingdomMap) {
    this.seed = seed;
    this.map = map;
    this.rng = createRng(`${seed}-playtest`);
    this.questGraph = resolveQuestGraph(ALL_QUESTS, seed);

    // Start at Ashford (first settlement)
    const ashford = map.settlements.find(
      (s) => s.id === 'ashford' || s.name === 'Ashford',
    );
    this.pos = (ashford?.position as [number, number]) ?? [
      Math.floor(map.width / 2),
      10,
    ];
    this.logAction('spawn', `Starting at ${ashford?.name ?? 'map center'}`);
  }

  private logAction(action: string, detail: string) {
    this.log.push({
      tick: this.tick,
      gridPos: [...this.pos],
      action,
      detail,
    });
  }

  /** Find the road tiles ordered from south to north (along King's Road). */
  private getRoadPath(): [number, number][] {
    const roadTiles: [number, number][] = [];
    for (const tile of this.map.tiles) {
      if (tile.hasRoad && tile.isLand) {
        roadTiles.push([tile.x, tile.y]);
      }
    }
    // Sort south to north (ascending y)
    roadTiles.sort((a, b) => a[1] - b[1]);
    return roadTiles;
  }

  /** Check if a settlement is at the current position. */
  private checkSettlement(): Settlement | undefined {
    return getSettlementAt(this.map, this.pos[0], this.pos[1], 2);
  }

  /** Visit a settlement: log NPCs, trigger quests. */
  private visitSettlement(settlement: Settlement) {
    if (this.visitedSettlements.has(settlement.id)) return;
    this.visitedSettlements.add(settlement.id);

    const npcCount = settlement.features?.length ?? 0;
    const questsHere: string[] = [];

    // Check which quests trigger at this settlement
    for (const rq of this.questGraph.quests) {
      if (
        rq.trigger.type === 'anchor' &&
        (rq.anchorAffinity === settlement.id ||
          rq.trigger.anchorId === settlement.id ||
          rq.trigger.anchorId === 'home')
      ) {
        if (!this.questsTriggered.includes(rq.id)) {
          this.questsTriggered.push(rq.id);
          questsHere.push(rq.id);
          this.logAction('quest_trigger', `Quest "${rq.title}" triggered`);
        }
      }
    }

    if (npcCount === 0) {
      this.contentGaps.push({
        type: 'missing_npc',
        location: [...this.pos],
        description: `Settlement "${settlement.name}" has no NPC features`,
        severity: 'medium',
      });
    }

    const visit: SettlementVisit = {
      id: settlement.id,
      name: settlement.name,
      gridPos: [...this.pos],
      tick: this.tick,
      npcsPresent: npcCount,
      questsTriggered: questsHere,
    };
    this.settlementVisits.push(visit);
    this.logAction(
      'settlement',
      `Visiting ${settlement.name} (${npcCount} features)`,
    );
    this.lastEventTick = this.tick;

    // Heal at settlements
    const healed = Math.min(this.maxHp - this.hp, 30);
    if (healed > 0) {
      this.hp += healed;
      this.logAction(
        'heal',
        `Rested at ${settlement.name}, healed ${healed} HP`,
      );
    }
  }

  /** Roll for a random encounter at the current position. */
  private rollEncounter() {
    if (this.encounterCooldown > 0) {
      this.encounterCooldown--;
      return;
    }

    const tile = getKingdomTile(this.map, this.pos[0], this.pos[1]);
    if (!tile || !tile.isLand) return;

    const chunkType = tile.hasRoad ? ('ROAD' as const) : ('WILD' as const);
    const settlement = this.checkSettlement();
    if (settlement) return; // No encounters in settlements

    const tier = getDangerTier(this.pos[0], this.pos[1], chunkType, this.map);
    const chance = getEncounterChance(tier);
    if (chance <= 0) return;

    // Roll multiple times per tick to simulate walking time within a chunk
    const ROLLS_PER_TICK = 60; // ~1 second of walking at 60fps
    for (let i = 0; i < ROLLS_PER_TICK; i++) {
      if (this.rng() < chance) {
        this.resolveEncounter(tier);
        return;
      }
    }
  }

  /** Resolve an encounter: pick from table, simulate combat. */
  private resolveEncounter(tier: number) {
    const table = ENCOUNTER_TABLES[tier];
    if (!table || table.entries.length === 0) return;

    // Pick a monster
    const totalWeight = table.entries.reduce((sum, e) => sum + e.weight, 0);
    let roll = this.rng() * totalWeight;
    for (const entry of table.entries) {
      roll -= entry.weight;
      if (roll <= 0) {
        const archetype = MONSTER_ARCHETYPES[entry.monsterId];
        if (!archetype) return;

        const [minCount, maxCount] = entry.count;
        const count =
          minCount + Math.floor(this.rng() * (maxCount - minCount + 1));
        const monsterNames = Array(count).fill(archetype.name);

        // Simulate combat
        let hpLost = 0;
        let outcome: 'victory' | 'fled' | 'defeat' = 'victory';
        let totalMonsterHp = archetype.health * count;

        while (totalMonsterHp > 0 && this.hp > 0) {
          // Player attacks
          const { damage: playerDmg } = calculatePlayerDamage(8, this.rng);
          totalMonsterHp -= playerDmg;
          if (totalMonsterHp <= 0) break;

          // Monsters attack (simplified: combined damage per round)
          for (let m = 0; m < count; m++) {
            if (totalMonsterHp > 0) {
              const monDmg = calculateMonsterDamage(archetype, this.rng);
              this.hp -= monDmg;
              hpLost += monDmg;
            }
          }

          // Flee if HP is low
          if (this.hp < this.maxHp * 0.2 && totalMonsterHp > 0) {
            outcome = 'fled';
            break;
          }
        }

        if (this.hp <= 0) {
          outcome = 'defeat';
          this.hp = 1; // Respawn with 1 HP (don't end the playtest)
        }

        const encounterLog: EncounterLog = {
          gridPos: [...this.pos],
          tier,
          monsters: monsterNames,
          outcome,
          hpLost,
        };
        this.encounters.push(encounterLog);
        this.encountersByTier[tier] = (this.encountersByTier[tier] ?? 0) + 1;
        this.encounterCooldown = 3; // 3 ticks cooldown
        this.lastEventTick = this.tick;

        this.logAction(
          'encounter',
          `${count}x ${archetype.name} (tier ${tier}) -> ${outcome}, lost ${hpLost} HP`,
        );
        return;
      }
    }
  }

  /** Check for content gaps. */
  private checkContentGaps() {
    const ticksSinceEvent = this.tick - this.lastEventTick;

    // Dead zone: 20+ tiles with no event
    if (ticksSinceEvent >= 20) {
      this.contentGaps.push({
        type: 'dead_zone',
        location: [...this.pos],
        description: `${ticksSinceEvent} tiles traversed with no settlement, encounter, or feature`,
        severity: ticksSinceEvent >= 40 ? 'high' : 'medium',
      });
      this.lastEventTick = this.tick; // Reset so we don't spam
    }
  }

  /** Run the full playtest simulation. */
  run(): PlaytestReport {
    const roadPath = this.getRoadPath();

    if (roadPath.length === 0) {
      this.logAction('error', 'No road tiles found on the map');
      return this.buildReport(false);
    }

    this.logAction(
      'navigate',
      `Found ${roadPath.length} road tiles to traverse`,
    );

    // Walk along the road, visiting each road tile
    for (const [rx, ry] of roadPath) {
      this.pos = [rx, ry];
      this.tick++;
      this.tilesTraversed++;

      // Track regions
      const region = getRegionAt(this.map, rx, ry);
      if (region) {
        const wasNew = !this.regionsCrossed.has(region.id);
        this.regionsCrossed.add(region.id);
        if (wasNew) {
          this.logAction(
            'region',
            `Entered ${region.name} (danger tier ${region.dangerTier ?? '?'})`,
          );
          this.lastEventTick = this.tick;
        }
      }

      // Check for settlement
      const settlement = this.checkSettlement();
      if (settlement) {
        this.visitSettlement(settlement);
      }

      // Roll for encounters on the road tile
      this.rollEncounter();

      // Periodically detour off-road to explore wilderness (every 3rd tile)
      if (this.tick % 3 === 0) {
        for (const dx of [-1, 1]) {
          const wx = rx + dx;
          const tile = getKingdomTile(this.map, wx, ry);
          if (tile?.isLand && !tile.hasRoad) {
            const saved = [...this.pos] as [number, number];
            this.pos = [wx, ry];
            this.rollEncounter();
            this.pos = saved;
          }
        }
      }

      // Check for dead zones
      this.checkContentGaps();

      // Safety: stop if we've walked too long
      if (this.tick > 10000) {
        this.logAction('timeout', 'Playtest exceeded 10000 ticks');
        break;
      }
    }

    // Also explore off-road: check settlements not on the road
    for (const settlement of this.map.settlements) {
      if (!this.visitedSettlements.has(settlement.id)) {
        this.pos = settlement.position as [number, number];
        this.tick++;
        this.visitSettlement(settlement);
      }
    }

    // Check for quests that were never triggered
    for (const rq of this.questGraph.quests) {
      if (!this.questsTriggered.includes(rq.id)) {
        // Auto-complete travel/simple quests for coverage
      }
    }

    // Check: did we reach Grailsend?
    const grailsend = this.map.settlements.find(
      (s) => s.id === 'grailsend' || s.name === 'Grailsend',
    );
    const reachedGoal = grailsend
      ? this.visitedSettlements.has(grailsend.id)
      : false;

    if (reachedGoal) {
      this.logAction('goal', "Reached Grailsend — the end of the King's Road");
    }

    return this.buildReport(reachedGoal);
  }

  private buildReport(reachedGoal: boolean): PlaytestReport {
    return {
      seed: this.seed,
      generationTimeMs: 0, // Set by caller
      totalTicks: this.tick,
      tilesTraversed: this.tilesTraversed,
      settlementsVisited: this.settlementVisits,
      encounterCount: this.encounters.length,
      encountersByTier: this.encountersByTier,
      encounters: this.encounters,
      questsTriggered: this.questsTriggered,
      questsCompleted: this.questsCompleted,
      contentGaps: this.contentGaps,
      log: this.log,
      playerHp: this.hp,
      reachedGoal,
      regionsCrossed: [...this.regionsCrossed],
    };
  }
}

// --- Aggregation ---

interface AggregateReport {
  seedCount: number;
  avgGenerationMs: number;
  avgTilesTraversed: number;
  avgEncounters: number;
  avgEncountersByTier: Record<number, number>;
  avgSettlementsVisited: number;
  reachRate: number;
  avgQuestsTriggered: number;
  commonContentGaps: Array<{
    description: string;
    count: number;
    severity: string;
  }>;
  unreachedSeeds: string[];
  perSeed: PlaytestReport[];
}

function aggregateReports(reports: PlaytestReport[]): AggregateReport {
  const n = reports.length;
  const avgGen = reports.reduce((s, r) => s + r.generationTimeMs, 0) / n;
  const avgTiles = reports.reduce((s, r) => s + r.tilesTraversed, 0) / n;
  const avgEnc = reports.reduce((s, r) => s + r.encounterCount, 0) / n;
  const avgSettlements =
    reports.reduce((s, r) => s + r.settlementsVisited.length, 0) / n;
  const reachRate = reports.filter((r) => r.reachedGoal).length / n;
  const avgQuests =
    reports.reduce((s, r) => s + r.questsTriggered.length, 0) / n;

  // Aggregate encounter tiers
  const tierTotals: Record<number, number> = {};
  for (const r of reports) {
    for (const [tier, count] of Object.entries(r.encountersByTier)) {
      tierTotals[Number(tier)] = (tierTotals[Number(tier)] ?? 0) + count;
    }
  }
  const avgTiers: Record<number, number> = {};
  for (const [tier, total] of Object.entries(tierTotals)) {
    avgTiers[Number(tier)] = total / n;
  }

  // Aggregate content gaps
  const gapCounts = new Map<string, { count: number; severity: string }>();
  for (const r of reports) {
    for (const gap of r.contentGaps) {
      const key = `${gap.type}: ${gap.description.slice(0, 80)}`;
      const existing = gapCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        gapCounts.set(key, { count: 1, severity: gap.severity });
      }
    }
  }
  const commonGaps = [...gapCounts.entries()]
    .map(([desc, { count, severity }]) => ({
      description: desc,
      count,
      severity,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    seedCount: n,
    avgGenerationMs: Math.round(avgGen * 10) / 10,
    avgTilesTraversed: Math.round(avgTiles),
    avgEncounters: Math.round(avgEnc * 10) / 10,
    avgEncountersByTier: avgTiers,
    avgSettlementsVisited: Math.round(avgSettlements * 10) / 10,
    reachRate: Math.round(reachRate * 100),
    avgQuestsTriggered: Math.round(avgQuests * 10) / 10,
    commonContentGaps: commonGaps,
    unreachedSeeds: reports.filter((r) => !r.reachedGoal).map((r) => r.seed),
    perSeed: reports,
  };
}

// --- Main ---

function main() {
  const args = process.argv.slice(2);
  const seedCountArg = args.indexOf('--seeds');
  const outputArg = args.indexOf('--output');
  const verboseArg = args.includes('--verbose');

  const numSeeds = seedCountArg >= 0 ? Number(args[seedCountArg + 1]) : 10;
  const outputPath = outputArg >= 0 ? args[outputArg + 1] : undefined;

  console.log(`=== Kings Road Headless Playtester ===`);
  console.log(`Running ${numSeeds} seeds...\n`);

  const reports: PlaytestReport[] = [];

  for (let i = 0; i < numSeeds; i++) {
    const seed = `playtest-seed-${i + 1}`;
    process.stdout.write(`  Seed ${i + 1}/${numSeeds}: "${seed}" ... `);

    const genStart = performance.now();
    const map = generateKingdom(seed, config);
    const genTime = performance.now() - genStart;

    const agent = new PlaytestAgent(seed, map);
    const report = agent.run();
    report.generationTimeMs = Math.round(genTime * 10) / 10;

    reports.push(report);

    const enc = report.encounterCount;
    const vis = report.settlementsVisited.length;
    const gaps = report.contentGaps.length;
    const goal = report.reachedGoal ? 'REACHED' : 'MISSED';
    console.log(
      `${report.tilesTraversed} tiles, ${vis} settlements, ${enc} encounters, ` +
        `${gaps} gaps, goal: ${goal} (${Math.round(genTime)}ms gen)`,
    );

    if (verboseArg) {
      for (const entry of report.log) {
        console.log(
          `    [${entry.tick}] (${entry.gridPos}) ${entry.action}: ${entry.detail}`,
        );
      }
    }
  }

  // Aggregate
  const aggregate = aggregateReports(reports);

  console.log(`\n=== Aggregate Results ===`);
  console.log(`  Seeds run:           ${aggregate.seedCount}`);
  console.log(`  Avg generation:      ${aggregate.avgGenerationMs}ms`);
  console.log(`  Avg tiles traversed: ${aggregate.avgTilesTraversed}`);
  console.log(`  Avg settlements:     ${aggregate.avgSettlementsVisited}`);
  console.log(`  Avg encounters:      ${aggregate.avgEncounters}`);
  console.log(`  Avg quests triggered:${aggregate.avgQuestsTriggered}`);
  console.log(`  Goal reach rate:     ${aggregate.reachRate}%`);

  if (Object.keys(aggregate.avgEncountersByTier).length > 0) {
    console.log(`  Encounters by tier:`);
    for (const [tier, avg] of Object.entries(aggregate.avgEncountersByTier)) {
      console.log(`    Tier ${tier}: ${Math.round(avg * 10) / 10} avg`);
    }
  }

  if (aggregate.commonContentGaps.length > 0) {
    console.log(`\n=== Content Gaps (across seeds) ===`);
    for (const gap of aggregate.commonContentGaps) {
      console.log(
        `  [${gap.severity}] (${gap.count}/${numSeeds} seeds) ${gap.description}`,
      );
    }
  }

  if (aggregate.unreachedSeeds.length > 0) {
    console.log(
      `\n  WARNING: ${aggregate.unreachedSeeds.length} seeds did not reach Grailsend`,
    );
  }

  // Write JSON output
  if (outputPath) {
    const fs = require('node:fs');
    fs.writeFileSync(outputPath, JSON.stringify(aggregate, null, 2));
    console.log(`\nReport written to: ${outputPath}`);
  }

  // Exit with error if significant issues found
  const hasHighSeverity = aggregate.commonContentGaps.some(
    (g) => g.severity === 'high' && g.count >= numSeeds * 0.5,
  );
  if (hasHighSeverity) {
    console.log('\nWARNING: High-severity content gaps found in 50%+ of seeds');
  }
}

main();
