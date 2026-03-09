import { useMemo } from 'react';
import type { BuildingArchetype } from '../../schemas/building.schema';
import { generateBuildingGeometry } from '../factories/building-factory';
import { getMaterials } from '../utils/textures';

interface BuildingProps {
  archetype: BuildingArchetype;
  position: [number, number, number];
  rotation?: number;
  label?: string;
}

export function Building({ archetype, position, rotation = 0, label }: BuildingProps) {
  const materials = useMemo(() => getMaterials(), []);
  const geometry = useMemo(() => generateBuildingGeometry(archetype), [archetype]);

  const wallMaterial = useMemo(() => {
    switch (archetype.wallMaterial) {
      case 'stone': return materials.dungeonWall;
      case 'timber_frame': return materials.wood;
      case 'brick': return materials.dungeonWall;
      default: return materials.townWall;
    }
  }, [archetype.wallMaterial, materials]);

  const roofMaterial = useMemo(() => {
    switch (archetype.roofStyle) {
      case 'slate': return materials.dungeonWall;
      case 'flat': return materials.wood;
      default: return materials.roof;
    }
  }, [archetype.roofStyle, materials]);

  return (
    <group position={position} rotation={[0, (rotation * Math.PI) / 180, 0]}>
      {/* Wall segments */}
      {geometry.walls.map((seg, i) => (
        <mesh
          key={`wall-${seg.wall}-${i}`}
          position={[seg.x, seg.y, seg.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[seg.sx, seg.sy, seg.sz]} />
          <primitive object={wallMaterial} attach="material" />
        </mesh>
      ))}

      {/* Floor plates */}
      {geometry.floors.map((floor, i) => (
        <mesh
          key={`floor-${i}`}
          position={[floor.x, floor.y, floor.z]}
          receiveShadow
        >
          <boxGeometry args={[floor.sx, floor.sy, floor.sz]} />
          <primitive object={materials.wood} attach="material" />
        </mesh>
      ))}

      {/* Stairs */}
      {geometry.stairs.map((step, i) => (
        <mesh
          key={`stair-${i}`}
          position={[step.x, step.y, step.z]}
          castShadow
        >
          <boxGeometry args={[step.sx, step.sy, step.sz]} />
          <primitive object={materials.wood} attach="material" />
        </mesh>
      ))}

      {/* Doors */}
      {geometry.doors.map((door, i) => (
        <mesh
          key={`door-${i}`}
          position={[door.x, door.y, door.z]}
          rotation={[0, door.rotY, 0]}
        >
          <boxGeometry args={[1.4, 2.4, 0.1]} />
          <primitive object={materials.door} attach="material" />
        </mesh>
      ))}

      {/* Windows */}
      {geometry.windows.map((win, i) => (
        <mesh
          key={`win-${i}`}
          position={[win.x, win.y, win.z]}
          rotation={[0, win.rotY, 0]}
        >
          <boxGeometry args={[1.4, 0.9, 0.05]} />
          <primitive object={materials.windowGlow} attach="material" />
        </mesh>
      ))}

      {/* Roof */}
      <mesh
        position={[geometry.roofCenter.x, geometry.roofCenter.y, geometry.roofCenter.z]}
        castShadow
      >
        {archetype.roofStyle === 'flat' ? (
          <boxGeometry args={[geometry.roofSize.width + 0.4, 0.3, geometry.roofSize.depth + 0.4]} />
        ) : (
          <coneGeometry
            args={[
              Math.max(geometry.roofSize.width, geometry.roofSize.depth) * 0.7,
              archetype.stories * 1.5,
              4,
            ]}
          />
        )}
        <primitive object={roofMaterial} attach="material" />
      </mesh>
    </group>
  );
}
