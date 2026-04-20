import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  type MetaballBurst,
  createBloodMetaballsMaterial,
  tickBloodMetaballs,
} from '@/combat/vfx';

interface BloodMetaballsEffectProps {
  bursts: MetaballBurst[];
}

/**
 * Raymarched blood metaballs — N=16 point-masses with gravity on a hull sphere.
 * Pool of 3 simultaneous bursts; each burst renders on its own 1m bounding sphere
 * (the raymarch is bounded to the hull, never full-screen).
 */
export function BloodMetaballsEffect({ bursts }: BloodMetaballsEffectProps) {
  const POOL_SIZE = 3;
  const meshRefs = useRef<(THREE.Mesh | null)[]>(Array(POOL_SIZE).fill(null));
  const materials = useMemo(
    () => Array.from({ length: POOL_SIZE }, () => createBloodMetaballsMaterial()),
    [],
  );
  // Hull sphere — raymarch is bounded to ~1m radius
  const geo = useMemo(() => new THREE.SphereGeometry(1.0, 8, 6), []);

  // Release pooled geometry + materials on unmount so repeated
  // encounter lifecycles don't accumulate GPU resources.
  useEffect(() => {
    return () => {
      geo.dispose();
      for (const mat of materials) mat.dispose();
    };
  }, [geo, materials]);

  useFrame(() => {
    const now = performance.now();
    const active = bursts.slice(0, POOL_SIZE);

    for (let i = 0; i < POOL_SIZE; i++) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const burst = active[i];
      if (!burst) {
        mesh.visible = false;
        continue;
      }
      const alive = tickBloodMetaballs(materials[i], burst, now, burst.id * 1337);
      if (!alive) {
        mesh.visible = false;
      } else {
        mesh.visible = true;
        mesh.position.copy(burst.origin);
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
