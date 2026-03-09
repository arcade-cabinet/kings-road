import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { EncounterTable } from '../../schemas/encounter-table.schema';
import type { MonsterArchetype } from '../../schemas/monster.schema';
import { Monster } from '../components/Monster';
import { useGameStore } from '../stores/gameStore';
import type { ActiveEncounter, SpawnedMonster } from '../types';
import { CHUNK_SIZE } from '../utils/worldGen';
import { getDangerTier, getEncounterChance } from '../world/danger';

// --- Static content imports (bundled by Vite) ---

import tier0Json from '../../../content/encounters/tier-0.json';
import tier1Json from '../../../content/encounters/tier-1.json';
import tier2Json from '../../../content/encounters/tier-2.json';
import tier3Json from '../../../content/encounters/tier-3.json';
import tier4Json from '../../../content/encounters/tier-4.json';
import ancientHorrorJson from '../../../content/monsters/ancient_horror.json';
import banditJson from '../../../content/monsters/bandit.json';
import banditLeaderJson from '../../../content/monsters/bandit_leader.json';
import basiliskJson from '../../../content/monsters/basilisk.json';
import direWolfJson from '../../../content/monsters/dire_wolf.json';
import dragonJson from '../../../content/monsters/dragon.json';
import drakeJson from '../../../content/monsters/drake.json';
import giantRatJson from '../../../content/monsters/giant_rat.json';
import giantSpiderJson from '../../../content/monsters/giant_spider.json';
import lichLordJson from '../../../content/monsters/lich_lord.json';
import necromancerJson from '../../../content/monsters/necromancer.json';
import skeletonJson from '../../../content/monsters/skeleton.json';
import slimeJson from '../../../content/monsters/slime.json';
import trollJson from '../../../content/monsters/troll.json';
import wolfJson from '../../../content/monsters/wolf.json';
import wraith from '../../../content/monsters/wraith.json';

// --- Registries ---

const MONSTER_ARCHETYPES: Record<string, MonsterArchetype> = {
  wolf: wolfJson as unknown as MonsterArchetype,
  bandit: banditJson as unknown as MonsterArchetype,
  giant_rat: giantRatJson as unknown as MonsterArchetype,
  skeleton: skeletonJson as unknown as MonsterArchetype,
  slime: slimeJson as unknown as MonsterArchetype,
  dire_wolf: direWolfJson as unknown as MonsterArchetype,
  bandit_leader: banditLeaderJson as unknown as MonsterArchetype,
  giant_spider: giantSpiderJson as unknown as MonsterArchetype,
  wraith: wraith as unknown as MonsterArchetype,
  troll: trollJson as unknown as MonsterArchetype,
  drake: drakeJson as unknown as MonsterArchetype,
  necromancer: necromancerJson as unknown as MonsterArchetype,
  basilisk: basiliskJson as unknown as MonsterArchetype,
  dragon: dragonJson as unknown as MonsterArchetype,
  lich_lord: lichLordJson as unknown as MonsterArchetype,
  ancient_horror: ancientHorrorJson as unknown as MonsterArchetype,
};

const ENCOUNTER_TABLES: Record<number, EncounterTable> = {
  0: tier0Json as unknown as EncounterTable,
  1: tier1Json as unknown as EncounterTable,
  2: tier2Json as unknown as EncounterTable,
  3: tier3Json as unknown as EncounterTable,
  4: tier4Json as unknown as EncounterTable,
};

// --- Constants ---

/** Minimum seconds between encounter rolls after the last encounter ended */
const ENCOUNTER_COOLDOWN = 15;

/** Seconds of walking before first encounter can trigger (grace period) */
const INITIAL_GRACE_PERIOD = 5;

// --- Encounter rolling logic ---

function rollEncounterTable(
  tier: number,
  playerX: number,
  playerZ: number,
): ActiveEncounter | null {
  const table = ENCOUNTER_TABLES[tier];
  if (!table || table.entries.length === 0) return null;

  // Weighted random selection
  const totalWeight = table.entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of table.entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      const archetype = MONSTER_ARCHETYPES[entry.monsterId];
      if (!archetype) return null;

      // Determine count from range
      const [minCount, maxCount] = entry.count;
      const count =
        minCount + Math.floor(Math.random() * (maxCount - minCount + 1));

      // Spawn monsters in a semicircle in front of the player
      const monsters: SpawnedMonster[] = [];
      for (let i = 0; i < count; i++) {
        const angle = ((i - (count - 1) / 2) * Math.PI) / 4;
        const dist = 6 + Math.random() * 3;
        monsters.push({
          id: `enc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
          archetype,
          position: [
            playerX + Math.sin(angle) * dist,
            0,
            playerZ + Math.cos(angle) * dist,
          ],
        });
      }

      return { tier, monsters };
    }
  }

  return null;
}

// --- Component ---

export function EncounterSystem() {
  const gameActive = useGameStore((s) => s.gameActive);
  const inCombat = useGameStore((s) => s.inCombat);
  const inDialogue = useGameStore((s) => s.inDialogue);
  const activeEncounter = useGameStore((s) => s.activeEncounter);
  const playerPosition = useGameStore((s) => s.playerPosition);
  const currentChunkType = useGameStore((s) => s.currentChunkType);
  const startCombat = useGameStore((s) => s.startCombat);
  const endCombat = useGameStore((s) => s.endCombat);

  const cooldownRef = useRef(INITIAL_GRACE_PERIOD);
  const combatTimerRef = useRef(0);

  useFrame((_, delta) => {
    if (!gameActive || inDialogue) return;

    const dt = Math.min(delta, 0.1);

    // If in combat, tick a basic auto-resolve timer
    if (inCombat && activeEncounter) {
      combatTimerRef.current += dt;
      // Auto-resolve combat after 3 seconds (placeholder until full combat system)
      if (combatTimerRef.current >= 3) {
        combatTimerRef.current = 0;
        cooldownRef.current = 0;
        endCombat();
      }
      return;
    }

    // Tick cooldown
    if (cooldownRef.current < ENCOUNTER_COOLDOWN) {
      cooldownRef.current += dt;
      return;
    }

    // Determine danger tier from player chunk position
    const cx = Math.floor(playerPosition.x / CHUNK_SIZE);
    const cz = Math.floor(playerPosition.z / CHUNK_SIZE);
    const tier = getDangerTier(cx, cz, currentChunkType);

    // Roll for encounter
    const chance = getEncounterChance(tier);
    if (chance <= 0) return;

    if (Math.random() < chance) {
      const encounter = rollEncounterTable(
        tier,
        playerPosition.x,
        playerPosition.z,
      );
      if (encounter) {
        startCombat(encounter);
      }
    }
  });

  // Render spawned monsters
  if (!activeEncounter) return null;

  return (
    <>
      {activeEncounter.monsters.map((m) => (
        <Monster key={m.id} archetype={m.archetype} position={m.position} />
      ))}
    </>
  );
}
