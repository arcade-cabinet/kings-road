import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { createWraithSdfMaterial, tickWraithSdf } from '@/combat/vfx';

interface WraithSdfBodyProps {
  position: THREE.Vector3Like;
  /** Elapsed seconds since this wraith spawned. */
  elapsed: number;
  /** Elapsed seconds at which dissipation begins (e.g. on death). */
  dissipateStart?: number;
  /** Elapsed seconds at which dissipation completes. */
  dissipateEnd?: number;
  onDissipated?: () => void;
}

/**
 * Raymarched wraith SDF body — rendered on a bounded hull sphere (BackSide).
 * The fragment shader marches through the hull from the inside, so the
 * draw cost scales with hull pixel coverage, not scene resolution.
 *
 * dissipateStart/End control the death fade. When fully dissipated,
 * onDissipated() fires so the parent can unmount.
 */
export function WraithSdfBody({
  position,
  elapsed,
  dissipateStart = Infinity,
  dissipateEnd = Infinity,
  onDissipated,
}: WraithSdfBodyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(createWraithSdfMaterial());

  useFrame(() => {
    if (!meshRef.current) return;
    const alive = tickWraithSdf(matRef.current, elapsed, dissipateStart, dissipateEnd);
    if (!alive) {
      meshRef.current.visible = false;
      onDissipated?.();
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      material={matRef.current}
    >
      {/* Hull sphere: 0.6m radius matches wraith body size */}
      <sphereGeometry args={[0.6, 16, 12]} />
    </mesh>
  );
}
