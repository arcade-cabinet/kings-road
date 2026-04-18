/**
 * GlbInstancer — renders many copies of an authored GLB as a single
 * THREE.InstancedMesh.
 *
 * Loads the GLB via useGLTF, walks the scene for the first Mesh it
 * finds, and uses that mesh's geometry + material as the InstancedMesh
 * source. Each `items` entry becomes one instance with its own
 * position/scale/rotation. If the GLB has multiple meshes, only the
 * first is rendered — author single-mesh GLBs for vegetation, or
 * composite them offline in Blender before export.
 *
 * Used by Chunk.tsx to replace the procedurally-sized primitive
 * cylinders/cones/spheres that used to stand in for trees/bushes/rocks.
 */

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { assetUrl } from '@/lib/assets';

export interface GlbInstancerItem {
  x: number;
  y: number;
  z: number;
  sx?: number;
  sy?: number;
  sz?: number;
  rotY?: number;
}

export interface GlbInstancerProps {
  /** Path under public/assets, e.g. "nature/tree15.glb". */
  glb: string;
  items: GlbInstancerItem[];
  /** Uniform scale baked into every instance before per-item sx/sy/sz. */
  baseScale?: number;
  /** Override the GLB's material — useful for tinting a shared mesh. */
  materialOverride?: THREE.Material;
}

function findFirstMesh(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((obj) => {
    if (!found && (obj as THREE.Mesh).isMesh) {
      found = obj as THREE.Mesh;
    }
  });
  return found;
}

export function GlbInstancer({
  glb,
  items,
  baseScale = 1,
  materialOverride,
}: GlbInstancerProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const gltf = useGLTF(assetUrl(`/assets/${glb}`));

  const { geometry, material } = useMemo(() => {
    const mesh = findFirstMesh(gltf.scene);
    if (!mesh) {
      throw new Error(
        `GlbInstancer: no mesh found in ${glb} — check the GLB contents`,
      );
    }
    return {
      geometry: mesh.geometry,
      material: materialOverride ?? mesh.material,
    };
  }, [gltf.scene, glb, materialOverride]);

  const itemCount = items?.length ?? 0;

  useEffect(() => {
    if (!meshRef.current || itemCount === 0) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < itemCount; i++) {
      const it = items[i];
      if (!it) continue;
      dummy.position.set(it.x ?? 0, it.y ?? 0, it.z ?? 0);
      dummy.scale.set(
        (it.sx ?? 1) * baseScale,
        (it.sy ?? 1) * baseScale,
        (it.sz ?? 1) * baseScale,
      );
      dummy.rotation.set(0, it.rotY ?? 0, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [items, itemCount, baseScale]);

  if (itemCount === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material as THREE.Material, itemCount]}
      castShadow
      receiveShadow
    />
  );
}
