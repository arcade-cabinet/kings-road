import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  type ImpactPoint,
  createImpactDeformerMaterial,
  tickImpactDeformer,
} from '@/combat/vfx';

interface ImpactDeformerEffectProps {
  impacts: ImpactPoint[];
}

/**
 * Renders active SDF impact deformations on a shared hull sphere.
 * One hull mesh per active impact — deactivated and hidden when the impact expires.
 * Bounded to the skeleton's approximate torso radius (0.4 world units).
 */
export function ImpactDeformerEffect({ impacts }: ImpactDeformerEffectProps) {
  // Pre-allocate a pool of hull meshes (max 4 simultaneous impacts)
  const POOL_SIZE = 4;
  const meshRefs = useRef<(THREE.Mesh | null)[]>(Array(POOL_SIZE).fill(null));
  const materials = useMemo(
    () => Array.from({ length: POOL_SIZE }, () => createImpactDeformerMaterial()),
    [],
  );
  const geo = useMemo(() => new THREE.SphereGeometry(0.45, 24, 16), []);

  useFrame(() => {
    const now = performance.now();
    const active = impacts.slice(0, POOL_SIZE);

    for (let i = 0; i < POOL_SIZE; i++) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const impact = active[i];
      if (!impact) {
        mesh.visible = false;
        continue;
      }
      const alive = tickImpactDeformer(materials[i], impact, now);
      if (!alive) {
        mesh.visible = false;
      } else {
        mesh.visible = true;
        mesh.position.copy(impact.worldPos);
      }
    }
  });

  return (
    <>
      {Array.from({ length: POOL_SIZE }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
          geometry={geo}
          material={materials[i]}
          visible={false}
        />
      ))}
    </>
  );
}
