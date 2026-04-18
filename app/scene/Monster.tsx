import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { assetUrl } from '@/lib/assets';
import type { MonsterArchetype } from '@/schemas/monster.schema';
import { hashString } from '@/utils/random';
import {
  buildMonsterRenderData,
  type MonsterGeometry,
} from '@/factories/monster-factory';

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

function GeometryMesh({
  part,
  color,
}: {
  part: MonsterGeometry;
  color: string;
}) {
  switch (part.type) {
    case 'box':
      return (
        <mesh position={part.position} castShadow>
          <boxGeometry args={part.args as [number, number, number]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      );
    case 'cylinder':
      return (
        <mesh position={part.position} castShadow>
          <cylinderGeometry args={part.args as [number, number, number]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      );
    case 'sphere':
      return (
        <mesh position={part.position} castShadow>
          <sphereGeometry args={part.args as [number]} />
          <meshStandardMaterial
            color={color}
            roughness={0.6}
            transparent
            opacity={0.85}
          />
        </mesh>
      );
  }
}

export function Monster({ archetype, position }: MonsterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);

  const skeleton = useGLTF(SKELETON_PATH) as any;
  const bat = useGLTF(BAT_PATH) as any;
  const werewolf = useGLTF(WEREWOLF_PATH) as any;
  const bloodwraith = useGLTF(BLOODWRAITH_PATH) as any;
  const plagueDoctor = useGLTF(PLAGUE_DOCTOR_PATH) as any;
  const devilDemon = useGLTF(DEVIL_DEMON_PATH) as any;
  const abomination = useGLTF(ABOMINATION_PATH) as any;
  const goliath = useGLTF(GOLIATH_PATH) as any;
  const butcher = useGLTF(BUTCHER_PATH) as any;
  const bigfoot = useGLTF(BIGFOOT_PATH) as any;
  const elkDemon = useGLTF(ELK_DEMON_PATH) as any;
  const eyeHead = useGLTF(EYE_HEAD_PATH) as any;

  const renderData = useMemo(
    () => buildMonsterRenderData(archetype),
    [archetype],
  );

  const { bodyParts, primaryColor, secondaryColor, scale } = renderData;

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    elapsedRef.current += delta;
    const t = elapsedRef.current;

    // Base idle rotation/bob
    groupRef.current.rotation.y = Math.sin(t * 0.6) * 0.08;

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
        const cloned = skeleton.scene.clone();

        // Procedural Armor Variety for Skeletons
        cloned.traverse((child: any) => {
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
        const cloned = bat.scene.clone();
        return <primitive object={cloned} />;
      }
    }

    // 3. New Horror Monsters
    if (archetype.id === 'wolf' || archetype.id === 'werewolf') {
      if (werewolf.scene) {
        const cloned = werewolf.scene.clone();
        return <primitive object={cloned} />;
      }
    }

    if (
      ['wraith', 'grail_wraith', 'bloodwraith', 'ancient_horror'].includes(
        archetype.id,
      )
    ) {
      if (bloodwraith.scene) {
        const cloned = bloodwraith.scene.clone();
        return <primitive object={cloned} />;
      }
    }

    if (['necromancer', 'plague_doctor', 'cultist'].includes(archetype.id)) {
      if (plagueDoctor.scene) {
        const cloned = plagueDoctor.scene.clone();
        return <primitive object={cloned} />;
      }
    }

    if (['dragon', 'drake', 'wyvern', 'basilisk'].includes(archetype.id)) {
      if (devilDemon.scene) {
        const cloned = devilDemon.scene.clone();
        return <primitive object={cloned} />;
      }
    }

    // 4. Humanoid bandits / brigands — use butcher model
    if (['bandit', 'bandit_leader'].includes(archetype.id)) {
      if (butcher.scene) {
        return <primitive object={butcher.scene.clone()} />;
      }
    }

    // 5. Large beasts — trolls / goliaths / bigfoot kin
    if (['troll', 'stone_golem'].includes(archetype.id)) {
      if (goliath.scene) {
        return <primitive object={goliath.scene.clone()} />;
      }
    }

    // 6. Shaggy wild beasts — dire wolf, thornbeast use bigfoot as stand-in
    if (['dire_wolf', 'thornbeast'].includes(archetype.id)) {
      if (bigfoot.scene) {
        return <primitive object={bigfoot.scene.clone()} />;
      }
    }

    // 7. Deer — elk-demon variant (antlered quadruped silhouette)
    if (archetype.id === 'deer') {
      if (elkDemon.scene) {
        return <primitive object={elkDemon.scene.clone()} />;
      }
    }

    // 8. Slimes / eye-head — use eye_head model as a formless entity
    if (['slime', 'giant_spider', 'giant_rat'].includes(archetype.id)) {
      if (eyeHead.scene) {
        return <primitive object={eyeHead.scene.clone()} />;
      }
    }

    // 9. Small critters (rabbit / hedgehog) — reuse abomination-2 small-scale
    if (['rabbit', 'hedgehog'].includes(archetype.id)) {
      if (abomination.scene) {
        return <primitive object={abomination.scene.clone()} />;
      }
    }

    // 10. Fallback Primitives
    return bodyParts.map((part) => (
      <GeometryMesh
        key={`${part.type}-${part.position.join(',')}`}
        part={part}
        color={part === bodyParts[0] ? primaryColor : secondaryColor}
      />
    ));
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
    bodyParts,
    primaryColor,
    secondaryColor,
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
