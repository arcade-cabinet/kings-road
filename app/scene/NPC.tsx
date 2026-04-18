import { Billboard, Float, Text, useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { assetUrl, npcLabelFontUrl } from '@/lib/assets';
import type { NPCBlueprint } from '@/schemas/npc-blueprint.schema';
import { getPlayer } from '@/ecs/actions/game';
import { useInteraction } from '@/ecs/hooks/useGameSession';
import type { Interactable } from '@/types/game';

// Reusable vector — avoids per-NPC per-frame allocation
const _toPlayer = new THREE.Vector3();

interface NPCProps {
  interactable: Interactable;
  blueprint?: NPCBlueprint;
}

// Map game types to the 3DPSX models
const MODEL_MAPPING: Record<string, string> = {
  guard: 'knight',
  knight: 'knight',
  captain: 'knight',
  merchant: 'merchant',
  innkeeper: 'merchant',
  healer: 'student',
  scholar: 'student',
  priest: 'student',
  hermit: 'villagers',
  farmer: 'villagers',
  noble: 'merchant',
  pilgrim: 'villagers',
  wanderer: 'villagers',
  villager: 'villagers',
  blacksmith: 'villagers',
  bandit: 'ninja',
  ninja: 'ninja',
  archer: 'archer',
  herbalist: 'student',
  lord: 'merchant',
  miller: 'villagers',
  jailer: 'knight',
  stablehand: 'villagers',
  watchman: 'knight',
};

// Sub-node mapping for the villagers mega-pack
const VILLAGER_NODES: Record<string, string> = {
  villager: 'Woman_2',
  wanderer: 'Male_2',
  blacksmith: 'Male_1', // Armored male
  peasant: 'Male_3',
  hermit: 'Male_3',
  farmer: 'Male_3',
  pilgrim: 'Male_2',
  miller: 'Male_1',
  stablehand: 'Male_2',
};

// Display titles for all archetypes
const DISPLAY_TITLES: Record<string, string> = {
  blacksmith: 'Master Smith',
  innkeeper: 'Innkeeper',
  merchant: 'Merchant',
  wanderer: 'Wanderer',
  healer: 'Healer',
  knight: 'Knight',
  hermit: 'Hermit',
  farmer: 'Farmer',
  priest: 'Priest',
  noble: 'Noble',
  bandit: 'Bandit',
  scholar: 'Scholar',
  pilgrim: 'Pilgrim',
  captain: 'Guard Captain',
  guard: 'Town Guard',
  herbalist: 'Herbalist',
  lord: 'Lord',
  miller: 'Miller',
  jailer: 'Jailer',
  stablehand: 'Stablehand',
  watchman: 'Watchman',
};

// Type-specific accent colors for highlight ring
const TYPE_ACCENTS: Record<string, string> = {
  blacksmith: '#ff8844',
  innkeeper: '#88cc44',
  merchant: '#cc88ff',
  wanderer: '#88aacc',
  healer: '#44ccaa',
  knight: '#ccaa44',
  guard: '#8888cc',
  priest: '#cccc88',
};

/**
 * Each NPC pack has a rigged armature with differently-named idle clips.
 * Return the first matching clip name found in the pack, so we can drive
 * the character at rest instead of just bobbing a static mesh.
 *
 * - 3DPSX packs (archer/basemesh/merchant/ninja/student/allinone) use
 *   `anim_iddle` (the pack author's sic spelling).
 * - The knight pack uses `Idle_1`.
 * - The villagers pack uses `Idle_1`.
 */
function pickIdleClip(clipNames: string[]): string | null {
  const preferences = [
    'Idle_1',
    'anim_iddle',
    'iddleanim_',       // ninja pack suffix style
    'Idle_2',
    'anim_iddle.001',
  ];
  for (const pref of preferences) {
    if (clipNames.includes(pref)) return pref;
  }
  // Last resort: any clip whose name contains "idle" (case-insensitive)
  return (
    clipNames.find((n) => n.toLowerCase().includes('idle') || n.toLowerCase().includes('iddle')) ??
    null
  );
}

export function NPC({ interactable, blueprint }: NPCProps) {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);

  const { currentInteractable } = useInteraction();

  const [highlightIntensity, setHighlightIntensity] = useState(0);

  const npcId = interactable?.id ?? '';
  const npcType = blueprint?.archetype ?? interactable?.type ?? 'wanderer';
  const npcPosition = interactable?.position;
  const npcName = blueprint?.name ?? interactable?.name ?? 'Stranger';

  const isHighlighted = currentInteractable?.id === npcId && npcId !== '';
  const accentColor = TYPE_ACCENTS[npcType] ?? '#88aacc';

  // Determine model path based on archetype
  const modelName = MODEL_MAPPING[npcType] || 'basemesh';
  const isMegaPack = modelName === 'villagers';

  // useGLTF return type is dynamic based on GLB node names — no static
  // shape available. `animations` is an AnimationClip[] co-shipped with
  // every rigged pack.
  const gltf = useGLTF(assetUrl(`/assets/npcs/${modelName}.glb`)) as unknown as {
    scene: THREE.Group;
    nodes: Record<string, THREE.Object3D>;
    animations: THREE.AnimationClip[];
  };
  const { scene, nodes, animations } = gltf;

  // Clone scene or extract specific node from mega-pack. Uses
  // SkeletonUtils.clone so the cloned SkinnedMesh keeps a working
  // skeleton reference (plain Object3D.clone shares the skeleton across
  // instances and breaks animation when multiple NPCs of the same
  // archetype coexist).
  const clonedScene = useMemo(() => {
    const sceneClone = SkeletonUtils.clone(scene) as THREE.Group;

    if (isMegaPack) {
      const nodeName = VILLAGER_NODES[npcType] || VILLAGER_NODES.wanderer;
      const targetNode = nodes[nodeName];
      if (targetNode) {
        sceneClone.traverse((child) => {
          if ((child as THREE.Mesh).isMesh || (child as THREE.SkinnedMesh).isSkinnedMesh) {
            child.visible = child.name === nodeName;
          }
        });
      }
    }
    return sceneClone;
  }, [scene, nodes, isMegaPack, npcType]);

  // Drive the rigged idle animation. Each pack uses different clip names;
  // pickIdleClip resolves the first match. Fading in on mount makes the
  // transition from scene-load → idle smooth.
  const animatedGroupRef = useRef<THREE.Group>(null);
  const { actions, names } = useAnimations(animations, animatedGroupRef);
  useEffect(() => {
    const clipName = pickIdleClip(names);
    if (!clipName) return;
    const action = actions[clipName];
    if (!action) return;
    action.reset().fadeIn(0.3).play();
    return () => {
      action.fadeOut(0.3);
    };
  }, [actions, names]);

  const elapsedRef = useRef(0);

  // Animation
  useFrame((_state, delta) => {
    const playerPosition = getPlayer().playerPosition;
    if (!groupRef.current || !npcPosition || !playerPosition) return;
    elapsedRef.current += delta;

    const t = elapsedRef.current;
    const idleOffset = npcId.charCodeAt(0) * 0.1;

    // Smooth highlight transition
    const targetIntensity = isHighlighted ? 1 : 0;
    setHighlightIntensity(
      (prev) => prev + (targetIntensity - prev) * delta * 5,
    );

    // Face player when close
    _toPlayer.set(
      playerPosition.x - npcPosition.x,
      0,
      playerPosition.z - npcPosition.z,
    );
    const distToPlayer = _toPlayer.length();
    if (distToPlayer < 8 && distToPlayer > 2) {
      const targetAngle = Math.atan2(_toPlayer.x, _toPlayer.z);
      const currentAngle = groupRef.current.rotation.y;
      const angleDiff =
        ((targetAngle - currentAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      groupRef.current.rotation.y += angleDiff * delta * 2;
    }

    // The rigged idle clip drives breathing/sway — no procedural bob.
    // `idleOffset` is retained in scope (used by future facing/turn logic).
    void idleOffset;
    void t;
  });

  if (!npcPosition) return null;

  return (
    <group ref={groupRef} position={[npcPosition.x, 0, npcPosition.z]}>
      <Float speed={1.5} rotationIntensity={0} floatIntensity={0.1}>
        <group ref={modelRef} scale={[1, 1, 1]}>
          {/* Shadow */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.02, 0]}
            receiveShadow
          >
            <circleGeometry args={[0.4, 16]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.3} />
          </mesh>

          {/* The 3DPSX Model — wrapped in a group so useAnimations can
              bind its mixer to a stable node, while the SkinnedMesh lives
              inside the cloned scene subtree. */}
          <group ref={animatedGroupRef}>
            <primitive object={clonedScene} />
          </group>
        </group>
      </Float>

      {/* Name tag when highlighted */}
      {highlightIntensity > 0.1 && (
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          <group position={[0, 2.5, 0]}>
            <mesh>
              <planeGeometry args={[2.2, 0.5]} />
              <meshBasicMaterial
                color="#0a0805"
                transparent
                opacity={0.9 * highlightIntensity}
              />
            </mesh>
            <mesh position={[0, 0, -0.001]}>
              <planeGeometry args={[2.25, 0.55]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0.5 * highlightIntensity}
              />
            </mesh>
            <Text
              position={[0, 0.05, 0.01]}
              fontSize={0.2}
              color="#c4a747"
              anchorX="center"
              anchorY="middle"
               font={npcLabelFontUrl}
              outlineWidth={0.015}
              outlineColor="#000"
            >
              {npcName}
            </Text>
            <Text
              position={[0, -0.15, 0.01]}
              fontSize={0.1}
              color={accentColor}
              anchorX="center"
              anchorY="middle"
               font={npcLabelFontUrl}
            >
              {DISPLAY_TITLES[npcType] ?? npcType}
            </Text>
          </group>
        </Billboard>
      )}

      {/* Highlight effects */}
      {highlightIntensity > 0.1 && (
        <>
          <pointLight
            position={[0, 1.2, 0]}
            intensity={0.8 * highlightIntensity}
            distance={4}
            color={accentColor}
          />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
            <ringGeometry args={[0.6, 0.7, 32]} />
            <meshBasicMaterial
              color={accentColor}
              transparent
              opacity={0.4 * highlightIntensity}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

// Preload common models
const MODELS_TO_PRELOAD = new Set(Object.values(MODEL_MAPPING));
MODELS_TO_PRELOAD.add('basemesh');

for (const model of MODELS_TO_PRELOAD) {
  useGLTF.preload(assetUrl(`/assets/npcs/${model}.glb`));
}
