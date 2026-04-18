import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import type { WaterConfig } from '@/shaders/gerstner-water';
import { createWaterMaterial, getWaterPreset } from '@/shaders/gerstner-water';

interface WaterBodyProps {
  position: [number, number, number];
  size: [number, number];
  waterType?: 'river' | 'stream' | 'pond';
  config?: WaterConfig;
}

export function WaterBody({
  position,
  size,
  waterType = 'pond',
  config,
}: WaterBodyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const elapsedRef = useRef(0);

  const material = useMemo(() => {
    const waterConfig = config ?? getWaterPreset(waterType);
    return createWaterMaterial(waterConfig);
  }, [waterType, config]);

  useFrame((_state, delta) => {
    elapsedRef.current += delta;
    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = elapsedRef.current;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[size[0], size[1], 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
