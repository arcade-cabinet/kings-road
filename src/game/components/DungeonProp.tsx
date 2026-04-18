import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { hashString } from '../factories/chibi-generator';

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, '');
const MINE_PROPS_PATH = `${BASE_URL}/assets/dungeon/MineProps-transformed.glb`;
const CRATES_PATH = `${BASE_URL}/assets/dungeon/Crates_and_barrels-transformed.glb`;

interface DungeonPropProps {
  id: string; // Used for seeding
  type: 'crystal' | 'rope' | 'crate' | 'barrel' | 'random';
  position: [number, number, number];
  rotation?: number;
}

export function DungeonProp({
  id,
  type,
  position,
  rotation = 0,
}: DungeonPropProps) {
  const mineProps = useGLTF(MINE_PROPS_PATH) as any;
  const crates = useGLTF(CRATES_PATH) as any;

  const seed = useMemo(() => hashString(id), [id]);

  const variant = useMemo(() => {
    let resolvedType = type;

    if (resolvedType === 'random') {
      const types = ['crystal', 'rope', 'crate', 'barrel'];
      resolvedType = types[seed % types.length] as any;
    }

    switch (resolvedType) {
      case 'crystal':
        return {
          geometry: mineProps.nodes?.Crystal?.geometry,
          material: mineProps.materials?.Crystals,
          scale: 1.5 + (seed % 10) * 0.1,
        };
      case 'rope':
        return {
          geometry: mineProps.nodes?.Rope_pile?.geometry,
          material: mineProps.materials?.CaveProps,
          scale: 1.2 + (seed % 5) * 0.1,
        };
      case 'crate':
        return {
          geometry: crates.nodes?.Crate_1?.geometry,
          material: crates.materials?.Crates_and_Barrels,
          scale: 1.0 + (seed % 4) * 0.1,
        };
      case 'barrel':
        return {
          geometry: crates.nodes?.Barrel_1?.geometry,
          material: crates.materials?.Crates_and_Barrels_2,
          scale: 1.0 + (seed % 4) * 0.1,
        };
      default:
        return null;
    }
  }, [type, seed, mineProps, crates]);

  if (!variant || !variant.geometry) return null;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh
        geometry={variant.geometry}
        material={variant.material}
        scale={[variant.scale, variant.scale, variant.scale]}
        castShadow
        receiveShadow
      />
    </group>
  );
}

useGLTF.preload(MINE_PROPS_PATH);
useGLTF.preload(CRATES_PATH);
