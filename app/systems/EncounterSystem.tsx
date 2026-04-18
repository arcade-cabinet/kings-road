import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';
import {
  getEncounterTable,
  getMonster,
  isContentStoreReady,
} from '@/db/content-queries';
import { Monster } from '@app/scene/Monster';
import { inputManager } from '@/input/InputManager';
import { useCombatStore } from '@/stores/combatStore';
import { useGameStore } from '@/stores/gameStore';
import { useQuestStore } from '@/stores/questStore';
import { useWorldStore } from '@/stores/worldStore';
import type { ActiveEncounter, SpawnedMonster } from '@/types/game';
import { createRng } from '@/utils/random';
import { CHUNK_SIZE } from '@/utils/worldGen';
import { getDangerTier, getEncounterChance } from '@/world/danger';
import {
  clearCombat,
  getCombatMonsters,
  initCombat,
  isCombatOver,
  monstersTurn,
  playerAttackNearest,
  resolveCombat,
} from '@/combat-resolver';

// --- Constants ---

/** Minimum seconds between encounter rolls after the last encounter ended */
const ENCOUNTER_COOLDOWN = 15;

/** Seconds of walking before first encounter can trigger (grace period) */
const INITIAL_GRACE_PERIOD = 5;

/** Seconds between player auto-attacks when holding attack */
const PLAYER_ATTACK_INTERVAL = 0.8;

/** Seconds between monster attack waves */
const MONSTER_ATTACK_INTERVAL = 1.5;

/** Seconds to display the loot summary before auto-dismissing */
const SUMMARY_DISPLAY_TIME = 3;

// --- Encounter rolling logic ---

/**
 * Roll an encounter from the tier table using seeded RNG.
 * Monsters and encounter tables come from the content DB
 * (populated at startup by load-content-db.ts).
 */
function rollEncounterTable(
  tier: number,
  playerX: number,
  playerZ: number,
  rng: () => number,
): ActiveEncounter | null {
  const table = getEncounterTable(tier);
  if (!table || table.entries.length === 0) return null;

  // Weighted random selection
  const totalWeight = table.entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng() * totalWeight;

  for (const entry of table.entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      const archetype = getMonster(entry.monsterId);
      if (!archetype) return null;

      // Determine count from range
      const [minCount, maxCount] = entry.count;
      const count = minCount + Math.floor(rng() * (maxCount - minCount + 1));

      // Spawn monsters in a semicircle in front of the player
      const monsters: SpawnedMonster[] = [];
      for (let i = 0; i < count; i++) {
        const angle = ((i - (count - 1) / 2) * Math.PI) / 4;
        const dist = 6 + rng() * 3;
        monsters.push({
          id: `enc-${Math.floor(rng() * 0xffffffff).toString(36)}-${i}`,
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
  const seedPhrase = useGameStore((s) => s.seedPhrase);
  const inCombat = useGameStore((s) => s.inCombat);
  const inDialogue = useGameStore((s) => s.inDialogue);
  const paused = useGameStore((s) => s.paused);
  const activeEncounter = useGameStore((s) => s.activeEncounter);
  const currentChunkType = useGameStore((s) => s.currentChunkType);
  const startCombat = useGameStore((s) => s.startCombat);
  const endCombat = useGameStore((s) => s.endCombat);
  const setHealth = useGameStore((s) => s.setHealth);
  const isDead = useGameStore((s) => s.isDead);
  const die = useGameStore((s) => s.die);
  const kingdomMap = useWorldStore((s) => s.kingdomMap);

  const combatPhase = useCombatStore((s) => s.phase);
  const startCombatUI = useCombatStore((s) => s.startCombatUI);
  const addDamagePopup = useCombatStore((s) => s.addDamagePopup);
  const clearExpiredPopups = useCombatStore((s) => s.clearExpiredPopups);
  const setRecentDamageTaken = useCombatStore((s) => s.setRecentDamageTaken);
  const showSummary = useCombatStore((s) => s.showSummary);
  const dismissSummary = useCombatStore((s) => s.dismissSummary);
  const setAttackCooldown = useCombatStore((s) => s.setAttackCooldown);
  const playerAttackDamage = useCombatStore((s) => s.playerAttackDamage);

  const cooldownRef = useRef(INITIAL_GRACE_PERIOD);
  const playerAttackTimerRef = useRef(0);
  const monsterAttackTimerRef = useRef(0);
  const summaryTimerRef = useRef(0);
  const rollCountRef = useRef(0);
  const combatRngRef = useRef<(() => number) | null>(null);
  const combatInitializedRef = useRef(false);

  // Initialize combat-resolver when a new encounter starts
  useEffect(() => {
    if (inCombat && activeEncounter && !combatInitializedRef.current) {
      initCombat(
        activeEncounter.monsters.map((m) => ({
          id: m.id,
          archetype: m.archetype,
        })),
      );
      combatInitializedRef.current = true;
      playerAttackTimerRef.current = 0;
      monsterAttackTimerRef.current = 0;
      summaryTimerRef.current = 0;
      combatRngRef.current = createRng(
        `${seedPhrase}-combat-${rollCountRef.current}`,
      );
      startCombatUI();
    }
    if (!inCombat) {
      combatInitializedRef.current = false;
    }
  }, [inCombat, activeEncounter, seedPhrase, startCombatUI]);

  // Handle attack — player attacks nearest alive monster
  const doPlayerAttack = useCallback(() => {
    if (!combatRngRef.current) return;

    const result = playerAttackNearest(
      playerAttackDamage,
      combatRngRef.current,
    );
    if (!result) return;

    // Show damage popup (randomize position slightly for visual variety)
    const popupX = 0.45 + Math.random() * 0.1;
    const popupY = 0.3 + Math.random() * 0.1;
    const color = result.isCritical ? '#ffd700' : '#ffffff';
    const text = result.isCritical
      ? `${result.damage} CRIT!`
      : `${result.damage}`;
    addDamagePopup(text, color, popupX, popupY, result.isCritical);

    if (result.isDead) {
      addDamagePopup('Defeated!', '#66bb6a', popupX, popupY - 0.05, false);
    }
  }, [playerAttackDamage, addDamagePopup]);

  useFrame((_, delta) => {
    if (!gameActive || inDialogue || paused || !kingdomMap || isDead) return;
    if (!isContentStoreReady()) return;

    const dt = Math.min(delta, 0.1);

    // Clean up expired damage popups
    clearExpiredPopups(performance.now());

    // ── Active combat loop ──────────────────────────────────────────
    if (inCombat && activeEncounter && combatInitializedRef.current) {
      const rng = combatRngRef.current;
      if (!rng) return;

      // Show loot summary phase — auto-dismiss after timer
      if (combatPhase === 'summary') {
        summaryTimerRef.current += dt;
        if (summaryTimerRef.current >= SUMMARY_DISPLAY_TIME) {
          dismissSummary();
          clearCombat();
          cooldownRef.current = 0;
          endCombat();
        }
        return;
      }

      // Check if combat is over (all monsters dead)
      if (isCombatOver()) {
        const result = resolveCombat(rng);
        showSummary({
          xpGained: result.totalXp,
          loot: result.allLoot,
          monstersKilled: result.monstersKilled.length,
        });
        summaryTimerRef.current = 0;
        // Record victory for quest system immediately (no frame-delay)
        useQuestStore
          .getState()
          .recordCombatVictory(null, result.monstersKilled.length);
        return;
      }

      // Player attacks on cooldown when action key is held
      const input = inputManager.poll(0);
      if (input.attack || input.interact) {
        playerAttackTimerRef.current += dt;
        if (playerAttackTimerRef.current >= PLAYER_ATTACK_INTERVAL) {
          playerAttackTimerRef.current = 0;
          doPlayerAttack();
        }
        setAttackCooldown(
          Math.max(0, PLAYER_ATTACK_INTERVAL - playerAttackTimerRef.current),
        );
      } else {
        // Reset so first press triggers immediately
        playerAttackTimerRef.current = PLAYER_ATTACK_INTERVAL;
        setAttackCooldown(0);
      }

      // Monsters attack on their own timer
      monsterAttackTimerRef.current += dt;
      if (monsterAttackTimerRef.current >= MONSTER_ATTACK_INTERVAL) {
        monsterAttackTimerRef.current = 0;
        const aliveMonsters = getCombatMonsters().filter(
          (m) => m.currentHp > 0,
        );
        if (aliveMonsters.length > 0) {
          const { totalDamage, attacks } = monstersTurn(rng);
          if (totalDamage > 0) {
            const currentHealth = useGameStore.getState().health;
            setHealth(currentHealth - totalDamage);
            setRecentDamageTaken(totalDamage);

            // Show monster damage popups
            for (const atk of attacks) {
              const popupX = 0.45 + Math.random() * 0.1;
              const popupY = 0.55 + Math.random() * 0.1;
              addDamagePopup(
                `-${atk.damage}`,
                '#ff4444',
                popupX,
                popupY,
                false,
              );
            }

            // Check for player death
            if (currentHealth - totalDamage <= 0) {
              clearCombat();
              die();
              return;
            }
          }
        }
      }

      return;
    }

    // ── Encounter rolling (out of combat) ───────────────────────────
    if (cooldownRef.current < ENCOUNTER_COOLDOWN) {
      cooldownRef.current += dt;
      return;
    }

    const playerPosition = useGameStore.getState().playerPosition;
    const cx = Math.floor(playerPosition.x / CHUNK_SIZE);
    const cz = Math.floor(playerPosition.z / CHUNK_SIZE);
    const tier = getDangerTier(cx, cz, currentChunkType, kingdomMap);

    const chance = getEncounterChance(tier);
    if (chance <= 0) return;

    const rollSeed = `${seedPhrase}-enc-${cx}-${cz}-${rollCountRef.current}`;
    const rng = createRng(rollSeed);
    rollCountRef.current += 1;

    if (rng() < chance) {
      const encounter = rollEncounterTable(
        tier,
        playerPosition.x,
        playerPosition.z,
        rng,
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
