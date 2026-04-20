import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { assetUrl } from '@/lib/assets';
import type { MonsterArchetype } from '@/schemas/monster.schema';
import { hashString } from '@/core';
import { getPlayer } from '@/ecs/actions/game';
import { turnTowardsYaw } from '@/utils/turn-towards-yaw';

// Turn speed (rad/s) when the player is far away — monsters slowly scan.
const TURN_SPEED_SCAN = 1.5;
// Turn speed (rad/s) when the player is within combat range — more aggressive.
const TURN_SPEED_ENGAGE = 3.5;
// Distance threshold (world units) that switches between scan and engage rates.
const ENGAGE_DISTANCE = 8;

interface MonsterProps {
  archetype: MonsterArchetype;
  position: [number, number, number];
}

const SKELETON_PATH = assetUrl('/assets/monsters/Skeleton_warrior-transformed.glb');
const BAT_PATH = assetUrl('/assets/monsters/Bat-transformed.glb');
const WEREWOLF_PATH = assetUrl('/assets/monsters/werewolf-transformed.glb');
const BLOODWRAITH_PATH = assetUrl('/assets/monsters/bloodwraith-transformed.glb');
const PLAGUE_DOCTOR_PATH = assetUrl('/assets/monsters/plague_doctor-transformed.glb');
const DEVIL_DEMON_PATH = assetUrl('/assets/monsters/devil_demon.glb');
const ABOMINATION_PATH = assetUrl('/assets/monsters/abomination-2.glb');
const GOLIATH_PATH = assetUrl('/assets/monsters/green-goliath.glb');
const BUTCHER_PATH = assetUrl('/assets/monsters/black-butcher.glb');
const BIGFOOT_PATH = assetUrl('/assets/monsters/bigfoot.glb');
const ELK_DEMON_PATH = assetUrl('/assets/monsters/elk-demon.glb');
const EYE_HEAD_PATH = assetUrl('/assets/monsters/eye-head.glb');

const HOVER_ARCHETYPES = new Set([
  'butterfly_swarm',
  'wraith',
  'bat',
  'bloodwraith',
]);

/**
 * Skeleton_warrior ships `Idle_1` / `Idle_2` / `Idle_1_break` and the Bat
 * pack ships `Bat_Idle`. Walk a preference list and return the first
 * matching clip. Anything else returns null and the monster just stands
 * in the bind pose.
 */
function pickMonsterIdleClip(clipNames: string[]): string | null {
  const preferences = ['Idle_1', 'Bat_Idle', 'Idle_2', 'Idle_1_break'];
  for (const pref of preferences) {
    if (clipNames.includes(pref)) return pref;
  }
  return (
    clipNames.find((n) => n.toLowerCase().includes('idle')) ?? null
  );
}

export function Monster({ archetype, position }: MonsterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);
  // Accumulated facing yaw — initialised toward the player spawn direction
  // so the monster doesn't do a full 360 on first frame.
  const facingYawRef = useRef<number | null>(null);

  const skeleton = useGLTF(SKELETON_PATH);
  const bat = useGLTF(BAT_PATH);
  const werewolf = useGLTF(WEREWOLF_PATH);
  const bloodwraith = useGLTF(BLOODWRAITH_PATH);
  const plagueDoctor = useGLTF(PLAGUE_DOCTOR_PATH);
  const devilDemon = useGLTF(DEVIL_DEMON_PATH);
  const abomination = useGLTF(ABOMINATION_PATH);
  const goliath = useGLTF(GOLIATH_PATH);
  const butcher = useGLTF(BUTCHER_PATH);
  const bigfoot = useGLTF(BIGFOOT_PATH);
  const elkDemon = useGLTF(ELK_DEMON_PATH);
  const eyeHead = useGLTF(EYE_HEAD_PATH);

  // Use the archetype's declared size as the uniform scale.
  const scale = archetype.size;

  // Identify which rigged pack supplies this archetype's mesh. Only the
  // Skeleton_warrior and Bat packs ship non-trivial animation clips; the
  // horror monster packs export T-pose only, so there is nothing to
  // drive for them. `useAnimations` is bound to the top-level group and
  // references the animations from whichever pack is active. Passing an
  // empty array when no pack has clips is a safe no-op.
  const animationClips: THREE.AnimationClip[] = useMemo(() => {
    if (['skeleton', 'shadow_knight', 'lich_lord'].includes(archetype.id)) {
      return (skeleton.animations ?? []) as THREE.AnimationClip[];
    }
    if (['butterfly_swarm', 'bat', 'songbird'].includes(archetype.id)) {
      return (bat.animations ?? []) as THREE.AnimationClip[];
    }
    return [];
  }, [archetype.id, skeleton.animations, bat.animations]);

  const { actions, names } = useAnimations(animationClips, modelRef);
  useEffect(() => {
    const clipName = pickMonsterIdleClip(names);
    if (!clipName) return;
    const action = actions[clipName];
    if (!action) return;
    action.reset().fadeIn(0.3).play();
    return () => {
      action.fadeOut(0.3);
    };
  }, [actions, names]);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    elapsedRef.current += delta;
    const t = elapsedRef.current;

    // ── Slow-turn facing toward player ──────────────────────────────
    const { playerPosition } = getPlayer();
    const dx = playerPosition.x - position[0];
    const dz = playerPosition.z - position[2];
    const targetYaw = Math.atan2(dx, dz);

    // Initialise facing yaw on first frame to avoid a snap from 0.
    if (facingYawRef.current === null) {
      facingYawRef.current = targetYaw;
    }

    const dist = Math.sqrt(dx * dx + dz * dz);
    const turnSpeed =
      dist <= ENGAGE_DISTANCE ? TURN_SPEED_ENGAGE : TURN_SPEED_SCAN;

    facingYawRef.current = turnTowardsYaw(
      facingYawRef.current,
      targetYaw,
      turnSpeed,
      Math.min(delta, 0.1),
    );

    // Apply facing yaw plus a gentle idle sway on top.
    groupRef.current.rotation.y =
      facingYawRef.current + Math.sin(t * 0.6) * 0.08;

    // ── Idle bob / hover ────────────────────────────────────────────
    if (modelRef.current) {
      if (HOVER_ARCHETYPES.has(archetype.id)) {
        // Hover/Fluttering movement
        modelRef.current.position.y = 1.0 + Math.sin(t * 4) * 0.2;
        modelRef.current.rotation.z = Math.sin(t * 10) * 0.1;
      } else {
        // Standard breathing bob
        modelRef.current.position.y = Math.sin(t * 1.2) * 0.03;
      }
    } else {
      groupRef.current.position.y = Math.sin(t * 1.2) * 0.03;
    }
  });

  // --- Hybrid Model Selection ---

  const modelContent = useMemo(() => {
    const seed = hashString(archetype.id + position.join(','));

    // 1. Skeletons & Undead Knights
    if (['skeleton', 'shadow_knight', 'lich_lord'].includes(archetype.id)) {
      if (skeleton.scene) {
        const cloned = SkeletonUtils.clone(skeleton.scene) as THREE.Group;

        // Procedural Armor Variety for Skeletons
        cloned.traverse((child) => {
          if (
            child.name.startsWith('Chest_Armor_') ||
            child.name.startsWith('Helmet_')
          ) {
            const variantNum = parseInt(child.name.split('_').pop() || '1', 10);
            const targetChest = (seed % 3) + 1;
            const targetHelmet = ((seed >> 2) % 3) + 1;

            if (child.name.startsWith('Chest_Armor_')) {
              child.visible = variantNum === targetChest;
            } else if (child.name.startsWith('Helmet_')) {
              child.visible = variantNum === targetHelmet;
            }
          }
        });

        return <primitive object={cloned} />;
      }
    }

    // 2. Flying / Hovering entities
    if (['butterfly_swarm', 'bat', 'songbird'].includes(archetype.id)) {
      if (bat.scene) {
        const cloned = SkeletonUtils.clone(bat.scene) as THREE.Group;
        return <primitive object={cloned} />;
      }
    }

    // 3. New Horror Monsters
    if (archetype.id === 'wolf' || archetype.id === 'werewolf') {
      if (werewolf.scene) {
        const cloned = SkeletonUtils.clone(werewolf.scene) as THREE.Group;
        return <primitive object={cloned} />;
      }
    }

    if (
      ['wraith', 'grail_wraith', 'bloodwraith', 'ancient_horror'].includes(
        archetype.id,
      )
    ) {
      if (bloodwraith.scene) {
        const cloned = SkeletonUtils.clone(bloodwraith.scene) as THREE.Group;
        return <primitive object={cloned} />;
      }
    }

    if (['necromancer', 'plague_doctor', 'cultist'].includes(archetype.id)) {
      if (plagueDoctor.scene) {
        const cloned = SkeletonUtils.clone(plagueDoctor.scene) as THREE.Group;
        return <primitive object={cloned} />;
      }
    }

    if (['dragon', 'drake', 'wyvern', 'basilisk'].includes(archetype.id)) {
      if (devilDemon.scene) {
        const cloned = SkeletonUtils.clone(devilDemon.scene) as THREE.Group;
        return <primitive object={cloned} />;
      }
    }

    // 4. Humanoid bandits / brigands — use butcher model
    if (['bandit', 'bandit_leader'].includes(archetype.id)) {
      if (butcher.scene) {
        return <primitive object={SkeletonUtils.clone(butcher.scene) as THREE.Group} />;
      }
    }

    // 5. Large beasts — trolls / goliaths / bigfoot kin
    if (['troll', 'stone_golem'].includes(archetype.id)) {
      if (goliath.scene) {
        return <primitive object={SkeletonUtils.clone(goliath.scene) as THREE.Group} />;
      }
    }

    // 6. Shaggy wild beasts — dire wolf, thornbeast use bigfoot as stand-in
    if (['dire_wolf', 'thornbeast'].includes(archetype.id)) {
      if (bigfoot.scene) {
        return <primitive object={SkeletonUtils.clone(bigfoot.scene) as THREE.Group} />;
      }
    }

    // 7. Deer — elk-demon variant (antlered quadruped silhouette)
    if (archetype.id === 'deer') {
      if (elkDemon.scene) {
        return <primitive object={SkeletonUtils.clone(elkDemon.scene) as THREE.Group} />;
      }
    }

    // 8. Slimes / eye-head — use eye_head model as a formless entity
    if (['slime', 'giant_spider', 'giant_rat'].includes(archetype.id)) {
      if (eyeHead.scene) {
        return <primitive object={SkeletonUtils.clone(eyeHead.scene) as THREE.Group} />;
      }
    }

    // 9. Small critters (rabbit / hedgehog) — reuse abomination-2 small-scale
    if (['rabbit', 'hedgehog'].includes(archetype.id)) {
      if (abomination.scene) {
        return <primitive object={SkeletonUtils.clone(abomination.scene) as THREE.Group} />;
      }
    }

    // Every archetype should map to an authored GLB. If we fall through here
    // it means a monster id was added without a rendering mapping — hard-fail
    // to ErrorOverlay so it gets noticed at content-author time.
    throw new Error(
      `Monster archetype "${archetype.id}" has no GLB mapping in Monster.tsx ` +
        `(add it to the Hybrid Model Selection block).`,
    );
  }, [
    archetype.id,
    skeleton.scene,
    bat.scene,
    werewolf.scene,
    bloodwraith.scene,
    plagueDoctor.scene,
    devilDemon.scene,
    abomination.scene,
    goliath.scene,
    butcher.scene,
    bigfoot.scene,
    elkDemon.scene,
    eyeHead.scene,
  ]);

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>

      <group ref={modelRef}>{modelContent}</group>
    </group>
  );
}

useGLTF.preload(SKELETON_PATH);
useGLTF.preload(BAT_PATH);
useGLTF.preload(WEREWOLF_PATH);
useGLTF.preload(BLOODWRAITH_PATH);
useGLTF.preload(PLAGUE_DOCTOR_PATH);
useGLTF.preload(DEVIL_DEMON_PATH);
useGLTF.preload(ABOMINATION_PATH);
useGLTF.preload(GOLIATH_PATH);
useGLTF.preload(BUTCHER_PATH);
useGLTF.preload(BIGFOOT_PATH);
useGLTF.preload(ELK_DEMON_PATH);
useGLTF.preload(EYE_HEAD_PATH);
