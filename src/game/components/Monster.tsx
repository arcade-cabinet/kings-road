import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import type { MonsterArchetype } from '../../schemas/monster.schema';
import {
  buildMonsterRenderData,
  type MonsterGeometry,
} from '../factories/monster-factory';

interface MonsterProps {
  archetype: MonsterArchetype;
  position: [number, number, number];
}

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
  const elapsedRef = useRef(0);

  const renderData = useMemo(
    () => buildMonsterRenderData(archetype),
    [archetype],
  );

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    elapsedRef.current += delta;
    const t = elapsedRef.current;
    groupRef.current.rotation.y = Math.sin(t * 0.6) * 0.08;
    groupRef.current.position.y = Math.sin(t * 1.2) * 0.03;
  });

  const { bodyParts, primaryColor, secondaryColor, scale } = renderData;

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>

      {bodyParts.map((part) => (
        <GeometryMesh
          key={`${part.type}-${part.position.join(',')}`}
          part={part}
          color={part === bodyParts[0] ? primaryColor : secondaryColor}
        />
      ))}
    </group>
  );
}
