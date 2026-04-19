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

    // Re-tint untextured PSX-mega and ruin GLBs by asset class so they
    // read at distance instead of blending into biome fog. Applies
    // whenever the authored material has no baseColorTexture — earlier
    // revisions also required `color === (1,1,1)` but some shipped GLBs
    // have darker authored `baseColorFactor` values (e.g. burnt-tree-1
    // ships `0.16/0.16/0.12`) which are too muddy to read at 100+ m
    // against grey fog. Skip the tint only when there's a real texture.
    // Use duck-typing rather than `instanceof MeshStandardMaterial`. When
    // `three` is code-split across multiple bundle chunks (as Vite does
    // for R3F), the MeshStandardMaterial constructor imported here may
    // not be the same reference the GLTF loader uses, so the instanceof
    // check silently fails and the tint never fires. Checking for the
    // standard-material type string + color + roughness duck-avoids that.
    const isStandardMat =
      (material as THREE.MeshStandardMaterial)?.type ===
        'MeshStandardMaterial' &&
      !!(material as THREE.MeshStandardMaterial)?.color;
    if (
      !materialOverride &&
      isStandardMat &&
      !(material as THREE.MeshStandardMaterial).map
    ) {
      let tint: number | null = null;
      let roughness = 0.9;
      if (glb.includes('burnt-tree') || glb.includes('burn-tree')) {
        tint = 0x5a3a24; // charred-but-lit bark
        roughness = 0.95;
      } else if (glb.includes('dead-tree')) {
        tint = 0x6b5236; // weathered grey-brown deadwood
        roughness = 0.95;
      } else if (glb.includes('forest-tree') || glb.includes('birtch')) {
        tint = 0x7a5835; // warm bark
        roughness = 0.9;
      } else if (glb.includes('fir-tree')) {
        tint = 0x3a4825; // dark evergreen
      } else if (glb.includes('bush')) {
        tint = 0x506838; // mossy green
        roughness = 0.85;
      } else if (glb.includes('grass') || glb.includes('weed')) {
        tint = 0x788a48; // sage
      } else if (glb.includes('yellow-flowers')) {
        tint = 0xdcb850;
        roughness = 0.8;
      } else if (glb.includes('red-flowers')) {
        tint = 0xb44838;
        roughness = 0.8;
      } else if (glb.includes('white-flowers')) {
        tint = 0xe2d4a8;
        roughness = 0.8;
      } else if (glb.includes('ruins/')) {
        tint = 0x8a7e70; // light weathered limestone
        roughness = 0.95;
      }
      if (tint !== null) {
        const cloned = (material as THREE.MeshStandardMaterial).clone();
        cloned.color.setHex(tint);
        cloned.roughness = roughness;
        material = cloned;
      }
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

  // THREE's default frustum culling uses the geometry's bounding sphere
  // centered at the local origin — for an InstancedMesh that's wrong, the
  // instances are scattered across a ~120 m chunk but the shared geometry
  // bound sphere is ~1 m. Any instance more than one geometry-radius from
  // the camera's forward view got silently culled, which is why Thornfield
  // showed 31k vegetation instances in the scene graph but a visually
  // empty viewport. Disable frustum culling on the InstancedMesh so all
  // instances render regardless of the shared geometry's bounds. Cost is
  // negligible because InstancedMesh already batches to one draw call.
  return (
    <instancedMesh
      ref={meshRef}
      frustumCulled={false}
      args={[geometry, material as THREE.Material, itemCount]}
      castShadow
      receiveShadow
    />
  );
}
