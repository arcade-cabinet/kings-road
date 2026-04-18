import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { WaterConfig } from '@/shaders/gerstner-water';
import { createWaterMaterial } from '@/shaders/gerstner-water';
import { useWorldSession } from '@/ecs/hooks/useWorldSession';
import {
  clearWorld,
  generateWorld,
  getFeaturesAt,
  getTileAtGrid,
  getTileAtWorld,
  getWorldState,
  setWorldState,
} from '@/ecs/actions/world';

/** Sea level Y position — water surface sits just below the shoreline */
const SEA_LEVEL_Y = -0.5;

/** Size of the ocean plane (should cover the visible horizon) */
const OCEAN_SIZE = 2000;

/** Segment count for wave mesh subdivisions */
const OCEAN_SEGMENTS = 64;

/** Ocean water preset — deeper blue with slower, wider waves than rivers */
const OCEAN_CONFIG: WaterConfig = {
  color: '#1a4d8a',
  opacity: 0.88,
  waveLayers: [
    { amplitude: 0.3, wavelength: 12.0, speed: 0.6, direction: [0.7, 0.7] },
    { amplitude: 0.15, wavelength: 6.0, speed: 0.9, direction: [-0.3, 0.95] },
    { amplitude: 0.08, wavelength: 3.0, speed: 1.2, direction: [0.9, -0.4] },
  ],
  foamThreshold: 0.7,
  celShaded: true,
};

/**
 * A single large water plane that follows the camera and renders at sea level.
 *
 * Only renders when the kingdom map is active (ocean tiles exist).
 * The plane is always centered under the camera so the horizon looks continuous.
 * Uses the Gerstner water shader for animated waves.
 */
export function OceanPlane() {
  const kingdomMap = useWorldSession().kingdomMap;
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const waterMaterial = useMemo(() => createWaterMaterial(OCEAN_CONFIG), []);

  const geometry = useMemo(
    () =>
      new THREE.PlaneGeometry(
        OCEAN_SIZE,
        OCEAN_SIZE,
        OCEAN_SEGMENTS,
        OCEAN_SEGMENTS,
      ),
    [],
  );

  useFrame((_, delta) => {
    // Animate waves
    if (waterMaterial.uniforms.uTime) {
      waterMaterial.uniforms.uTime.value += delta;
    }

    // Follow camera horizontally
    if (meshRef.current) {
      meshRef.current.position.x = camera.position.x;
      meshRef.current.position.z = camera.position.z;
    }
  });

  // Only render when kingdom map is active (ocean tiles exist)
  if (!kingdomMap) return null;

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, SEA_LEVEL_Y, 0]}
      material={waterMaterial}
      geometry={geometry}
      renderOrder={-1}
    />
  );
}
