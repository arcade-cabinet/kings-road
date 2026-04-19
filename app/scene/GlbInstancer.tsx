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
    let material: THREE.Material = materialOverride ?? (mesh.material as THREE.Material);

    // Tint default-white untextured PSX-mega materials by asset type so
    // they read as trees/ruins instead of fog-coloured blobs. The shipped
    // GLBs have no baseColorTexture; their authored material is just
    // "Bark" / "Rock" with a [1,1,1,1] baseColor. Without this tint,
    // instanced meshes blend into the biome fog once they're past ~50 m.
    if (
      !materialOverride &&
      material instanceof THREE.MeshStandardMaterial &&
      !material.map &&
      material.color.r === 1 &&
      material.color.g === 1 &&
      material.color.b === 1
    ) {
      const cloned = material.clone();
      if (glb.includes('burnt-tree') || glb.includes('dead-tree')) {
        cloned.color.setHex(0x3a2a1c); // charred bark
        cloned.roughness = 0.95;
      } else if (glb.includes('forest-tree') || glb.includes('birtch')) {
        cloned.color.setHex(0x4a3520); // warm bark
        cloned.roughness = 0.9;
      } else if (glb.includes('fir-tree')) {
        cloned.color.setHex(0x2a3420); // dark evergreen
        cloned.roughness = 0.9;
      } else if (glb.includes('bush')) {
        cloned.color.setHex(0x3a4a28); // mossy green
        cloned.roughness = 0.85;
      } else if (glb.includes('grass') || glb.includes('weed')) {
        cloned.color.setHex(0x5a6a3a); // sage
        cloned.roughness = 0.9;
      } else if (glb.includes('yellow-flowers')) {
        cloned.color.setHex(0xd4b450);
        cloned.roughness = 0.8;
      } else if (glb.includes('red-flowers')) {
        cloned.color.setHex(0xa04030);
        cloned.roughness = 0.8;
      } else if (glb.includes('white-flowers')) {
        cloned.color.setHex(0xd8cca0);
        cloned.roughness = 0.8;
      } else if (glb.includes('ruins/')) {
        cloned.color.setHex(0x6b625a); // weathered limestone
        cloned.roughness = 0.95;
      }
      material = cloned;
    }

    return { geometry: mesh.geometry, material };
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
