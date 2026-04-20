import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  getEncounterTable,
  getMonster,
  isContentStoreReady,
} from '@/db/content-queries';
import { Monster } from '@app/scene/Monster';
import { useTrait } from 'koota/react';
import {
  addDamagePopup,
  clearExpiredPopups,
  dismissCombatSummary,
  setAttackCooldown,
  setRecentDamageTaken,
  showCombatSummary,
  startCombatUI,
} from '@/ecs/actions/combat-ui';
import { CombatUI } from '@/ecs/traits/session-combat';
import { getSessionEntity } from '@/ecs/world';
import { inputManager } from '@/input/InputManager';
import {
  die,
  endCombat,
  getPlayer,
  setHealth,
  startCombat,
} from '@/ecs/actions/game';
import {
  useCombatSession,
  useChunkState,
  useFlags,
  useSeed,
} from '@/ecs/hooks/useGameSession';
import { recordCombatVictory } from '@/ecs/actions/quest';
import { useWorldSession } from '@/ecs/hooks/useWorldSession';
import type { ActiveEncounter, SpawnedMonster } from '@/types/game';
import { createRng } from '@/core';
import { CHUNK_SIZE } from '@/utils/worldGen';
import { getDangerTier, getEncounterChance } from '@/world/danger';
import {
  clearCombat,
  getCombatMonsters,
  initCombat,
  isCombatOver,
  monstersTurn,
  playerAttack,
  resolveCombat,
} from '@/combat-resolver';
import { pickMeleeTarget, type HitTarget } from '@/combat/hit-test';

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
  const { gameActive, inCombat, inDialogue, paused, isDead } = useFlags();
  const { seedPhrase } = useSeed();
  const { activeEncounter } = useCombatSession();
  const { currentChunkType } = useChunkState();
  const kingdomMap = useWorldSession().kingdomMap;
  // Camera is needed for forward-cone hit detection; the swing originates
  // at the player body but aim direction is the camera's forward vector.
  const { camera } = useThree();
  // Scratch vector reused every swing — allocating a Vector3 per frame
  // would slow combat on mobile.
  const forwardRef = useRef(new THREE.Vector3());

  const combatUI = useTrait(getSessionEntity(), CombatUI);
  const combatPhase = combatUI?.phase ?? 'idle';
  const playerAttackDamage = combatUI?.playerAttackDamage ?? 8;

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
  }, [inCombat, activeEncounter, seedPhrase]);

  // Handle attack — swing the sword and damage the monster in the forward
  // cone, if any. Before the bug #19 fix this called playerAttackNearest()
  // which applied damage every PLAYER_ATTACK_INTERVAL regardless of aim;
  // now the swing only connects on a real spatial hit so the player has
  // to face their target.
  const doPlayerAttack = useCallback(() => {
    if (!combatRngRef.current || !activeEncounter) return;

    const { playerPosition } = getPlayer();
    const forward = camera.getWorldDirection(forwardRef.current);

    // Only alive monsters are valid hit candidates. Radius derives from
    // the archetype `size` (0.3–5.0m) scaled by 0.5 to approximate a
    // torso radius — size is the full body diameter-ish.
    const alive = new Set(
      getCombatMonsters()
        .filter((m) => m.currentHp > 0)
        .map((m) => m.id),
    );
    const targets: HitTarget[] = activeEncounter.monsters
      .filter((m) => alive.has(m.id))
      .map((m) => ({
        id: m.id,
        position: m.position,
        radius: Math.max(0.4, (m.archetype.size ?? 1) * 0.5),
      }));

    const hitId = pickMeleeTarget(playerPosition, forward, targets);
    if (!hitId) return;

    const result = playerAttack(
      hitId,
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
    addDamagePopup(text, color, popupX, popupY, result.isCritical, true);

    if (result.isDead) {
      addDamagePopup('Defeated!', '#66bb6a', popupX, popupY - 0.05, false, true);
    }
  }, [activeEncounter, camera, playerAttackDamage]);

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
          dismissCombatSummary();
          clearCombat();
          cooldownRef.current = 0;
          endCombat();
        }
        return;
      }

      // Check if combat is over (all monsters dead)
      if (isCombatOver()) {
        const result = resolveCombat(rng);
        showCombatSummary({
          xpGained: result.totalXp,
          loot: result.allLoot,
          monstersKilled: result.monstersKilled.length,
        });
        summaryTimerRef.current = 0;
        // Record victory for quest system immediately (no frame-delay)
        recordCombatVictory(null, result.monstersKilled.length);
        return;
      }

      // Player attacks on cooldown when the attack key is held. `interact`
      // was historically folded in here but that let E-to-interact double
      // as an attack trigger during combat, so a player reaching for a
      // dialogue/pickup mid-fight would mash swings. Attack is bound
      // specifically to the attack input; interact should only interact.
      const input = inputManager.poll(0);
      if (input.attack) {
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
            const { health: currentHealth } = getPlayer();
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

    const { playerPosition } = getPlayer();
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
