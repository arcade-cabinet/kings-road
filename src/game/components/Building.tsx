import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import type { BuildingArchetype } from '../../schemas/building.schema';
import { hashString } from '../factories/chibi-generator';

interface BuildingProps {
  archetype: BuildingArchetype;
  position: [number, number, number];
  rotation?: number;
  label?: string;
}

// Ensure the GLB is loaded. This should match the path we copied the file to.
const BASE_URL = (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');
const GLB_PATH = `${BASE_URL}/assets/buildings/Village_Buildings-transformed.glb`;

export function Building({
  archetype,
  position,
  rotation = 0,
  label = '',
}: BuildingProps) {
  const { nodes, materials } = useGLTF(GLB_PATH) as any;

  // Use a deterministic seed based on position and label to pick a building variant
  const seed = useMemo(() => {
    return hashString(`${label}-${position[0]}-${position[2]}`);
  }, [label, position]);

  // The Village_Buildings pack has several pre-assembled "Cubes" that act as complete houses.
  // We'll pick one of them deterministically.
  const buildingVariants = useMemo(() => {
    if (!nodes) return [];
    return [
      { base: nodes.Cube001, win: nodes.Cube001_1, door: nodes.Cube001_2 },
      { base: nodes.Cube002, win: nodes.Cube002_1, door: nodes.Cube002_2 },
      { base: nodes.Cube005, win: nodes.Cube005_1, door: nodes.Cube005_2 },
      { base: nodes.Cube009, win: nodes.Cube009_2, door: nodes.Cube009_1 },
      { base: nodes.Cube016, win: nodes.Cube016_1, door: nodes.Cube016_2 },
    ].filter((v) => v.base && v.win && v.door);
  }, [nodes]);

  const variant = useMemo(() => {
    if (buildingVariants.length === 0) return null;
    return buildingVariants[seed % buildingVariants.length];
  }, [buildingVariants, seed]);

  // Adjust scaling and positioning to match the game's unit scale (1 unit = 1 meter).
  // The PSX models might be scaled differently, so we apply a uniform scale.
  // We also want to rotate the building to face the road (passed via `rotation`).
  const modelScale = 1.0;
  const rotY = (rotation * Math.PI) / 180;

  // Fallback to a simple box if the model fails to load
  if (!variant) {
    return (
      <group position={position} rotation={[0, rotY, 0]}>
        <mesh position={[0, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[4, 4, 4]} />
          <meshStandardMaterial color="#8B5A2B" />
        </mesh>
      </group>
    );
  }

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* We group the extracted meshes and apply a generic scale. 
          The origin of these meshes in the GLB might be offset, so we center them. */}
      <group scale={[modelScale, modelScale, modelScale]}>
        <mesh
          geometry={variant.base.geometry}
          material={materials.House_Wood}
          castShadow
          receiveShadow
        />
        <mesh geometry={variant.win.geometry} material={materials.Window} />
        <mesh geometry={variant.door.geometry} material={materials.Door} />
        {/* If the building is an inn or tavern, maybe add the Chimny or Gazeebo? */}
        {(archetype.id === 'inn' || archetype.id === 'tavern') &&
          nodes.Chimny && (
            <mesh
              geometry={nodes.Chimny.geometry}
              material={materials.House_Plaster}
              position={[0, 2, 0]} // rough offset
              castShadow
            />
          )}
      </group>
    </group>
  );
}

useGLTF.preload(GLB_PATH);
