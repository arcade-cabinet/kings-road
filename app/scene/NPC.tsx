import { Billboard, Float, Text, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { NPCBlueprint } from '@/schemas/npc-blueprint.schema';
import { useGameStore } from '@/stores/gameStore';
import type { Interactable } from '@/types/game';

// Reusable vector — avoids per-NPC per-frame allocation
const _toPlayer = new THREE.Vector3();

// Troika-three-text needs a direct URL to a woff2 font file
const FONT_URL =
  'https://fonts.gstatic.com/s/lora/v36/0QIvMX1D_JOuMwf7I-NP.woff2';

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
  wanderer: 'villagers',
  villager: 'villagers',
  blacksmith: 'villagers',
  bandit: 'ninja',
  ninja: 'ninja',
  archer: 'archer',
};

// Sub-node mapping for the villagers mega-pack
const VILLAGER_NODES: Record<string, string> = {
  villager: 'Woman_2',
  wanderer: 'Male_2',
  blacksmith: 'Male_1', // Armored male
  peasant: 'Male_3',
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

export function NPC({ interactable, blueprint: _blueprint }: NPCProps) {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);

  const currentInteractable = useGameStore(
    (state) => state.currentInteractable,
  );

  const [highlightIntensity, setHighlightIntensity] = useState(0);

  const npcId = interactable?.id ?? '';
  const npcType = interactable?.type ?? 'wanderer';
  const npcPosition = interactable?.position;
  const npcName = interactable?.name ?? 'Stranger';

  const isHighlighted = currentInteractable?.id === npcId && npcId !== '';
  const accentColor = TYPE_ACCENTS[npcType] ?? '#88aacc';

  const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, '');

  // Determine model path based on archetype
  const modelName = MODEL_MAPPING[npcType] || 'basemesh';
  const isMegaPack = modelName === 'villagers';

  const { scene, nodes } = useGLTF(
    `${BASE_URL}/assets/npcs/${modelName}.glb`,
  ) as any; // useGLTF return type is dynamic based on GLB node names — no static shape available

  // Clone scene or extract specific node from mega-pack
  const clonedScene = useMemo(() => {
    if (isMegaPack) {
      const nodeName = VILLAGER_NODES[npcType] || VILLAGER_NODES.wanderer;
      const targetNode = nodes[nodeName];
      if (targetNode) {
        // If it's a SkinnedMesh, we need its group structure or at least a clone
        // For simplicity in this hybrid approach, we clone the scene but hide other nodes
        const sceneClone = scene.clone();
        sceneClone.traverse((child: any) => {
          if (child.isMesh || child.isSkinnedMesh) {
            child.visible = child.name === nodeName;
          }
        });
        return sceneClone;
      }
    }
    return scene.clone();
  }, [scene, nodes, isMegaPack, npcType]);

  const elapsedRef = useRef(0);

  // Animation
  useFrame((_state, delta) => {
    const playerPosition = useGameStore.getState().playerPosition;
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

    // Breathing bob for the 3DPSX models
    if (modelRef.current) {
      modelRef.current.position.y = Math.sin(t * 2 + idleOffset) * 0.05;

      // Slight "sway" for extra character
      modelRef.current.rotation.z = Math.sin(t * 1.5 + idleOffset) * 0.02;
    }
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

          {/* The 3DPSX Model */}
          <primitive object={clonedScene} />
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
              font={FONT_URL}
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
              font={FONT_URL}
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
const PRELOAD_BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, '');
const MODELS_TO_PRELOAD = new Set(Object.values(MODEL_MAPPING));
MODELS_TO_PRELOAD.add('basemesh');

for (const model of MODELS_TO_PRELOAD) {
  useGLTF.preload(`${PRELOAD_BASE_URL}/assets/npcs/${model}.glb`);
}
