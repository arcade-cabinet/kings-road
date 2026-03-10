import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MonsterArchetype } from '../../schemas/monster.schema';
import {
  buildMonsterRenderData,
  type MonsterGeometry,
} from '../factories/monster-factory';

interface MonsterProps {
  archetype: MonsterArchetype;
  position: [number, number, number];
}

const BASE_URL = (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');
const SKELETON_PATH = `${BASE_URL}/assets/monsters/Skeleton_warrior-transformed.glb`;
const BAT_PATH = `${BASE_URL}/assets/monsters/Bat-transformed.glb`;

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
      if (archetype.id === 'butterfly_swarm' || archetype.id === 'wraith') {
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
    // 1. Skeletons & Undead Knights
    if (['skeleton', 'shadow_knight', 'lich_lord'].includes(archetype.id)) {
      if (skeleton.scene) {
        const cloned = skeleton.scene.clone();
        return <primitive object={cloned} />;
      }
    }
    
    // 2. Flying / Hovering entities
    if (['butterfly_swarm', 'wraith', 'bat'].includes(archetype.id)) {
      if (bat.scene) {
        const cloned = bat.scene.clone();
        return <primitive object={cloned} />;
      }
    }
    
    // 3. Fallback Primitives
    return bodyParts.map((part) => (
      <GeometryMesh
        key={`${part.type}-${part.position.join(',')}`}
        part={part}
        color={part === bodyParts[0] ? primaryColor : secondaryColor}
      />
    ));
  }, [archetype.id, skeleton.scene, bat.scene, bodyParts, primaryColor, secondaryColor]);

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>

      <group ref={modelRef}>
        {modelContent}
      </group>
    </group>
  );
}

useGLTF.preload(SKELETON_PATH);
useGLTF.preload(BAT_PATH);
