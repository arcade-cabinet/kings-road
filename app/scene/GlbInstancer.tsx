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

  const { geometry, material, materialIsClone } = useMemo(() => {
    const mesh = findFirstMesh(gltf.scene);
    if (!mesh) {
      throw new Error(
        `GlbInstancer: no mesh found in ${glb} — check the GLB contents`,
      );
    }
    let material: THREE.Material = materialOverride ?? (mesh.material as THREE.Material);
    let materialIsClone = false;

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
        // Warmer, brighter charred bark — previous 0x5a3a24 (R90,G58,B36)
        // was too dark against warm goldenrod fog on Thornfield cb=131;
        // trees read as pure black silhouettes with no form. Lifting to
        // 0x8a6a48 (warm driftwood, R138,G106,B72) gives the HDRI
        // something to shade against so tree volume reads at 80m+.
        tint = 0x8a6a48;
      } else if (glb.includes('dead-tree')) {
        tint = 0x9a7858; // sun-weathered grey-brown
      } else if (glb.includes('forest-tree') || glb.includes('birtch')) {
        tint = 0x8c6a45; // warm bark
      } else if (glb.includes('fir-tree')) {
        tint = 0x4a5832; // dark evergreen (lifted from 0x3a4825)
      } else if (glb.includes('bush')) {
        tint = 0x607844; // mossy green (lifted)
        roughness = 0.85;
      } else if (glb.includes('grass') || glb.includes('weed')) {
        tint = 0x889a58; // sage (lifted)
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
        materialIsClone = true;
      }
    }

    return { geometry: mesh.geometry, material, materialIsClone };
  }, [gltf.scene, glb, materialOverride]);

  // Dispose the tint clone when the chunk unmounts or when the memoized
  // material changes. The clone owns no textures of its own — `.clone()`
  // shares texture refs with the drei-cached source, so we must NOT dispose
  // those. Only the clone's GPU program + uniforms leak if we skip this.
  useEffect(() => {
    if (!materialIsClone) return;
    return () => {
      material.dispose();
    };
  }, [material, materialIsClone]);

  const itemCount = items?.length ?? 0;

  useEffect(() => {
    if (!meshRef.current || itemCount === 0) return;
    // R3F has a known gotcha: the `frustumCulled={false}` JSX prop on
    // <instancedMesh> doesn't always propagate through the reconciler
    // to the underlying THREE.InstancedMesh (observed live: 263
    // instanced meshes all still reported frustumCulled=true on the
    // Pages deploy). Set it imperatively here. Necessary because the
    // shared geometry bounds are ~1 m but instances span 120 m chunks,
    // so auto-culling throws away thousands of visible instances.
    meshRef.current.frustumCulled = false;

    const dummy = new THREE.Object3D();
    // Deterministic per-instance colour jitter so 31k grass tufts or
    // 500 trees don't all read as identical stamped clones — small
    // ±8% HSV shift against the base tint keeps the biome palette
    // cohesive while restoring variety the PSX-mega pack lacks (only
    // 2-3 GLB variants per species). Seeded off the instance index so
    // placements stay deterministic for regression tests.
    const baseColor = new THREE.Color();
    if ((material as THREE.MeshStandardMaterial).color) {
      baseColor.copy((material as THREE.MeshStandardMaterial).color);
    } else {
      baseColor.setHex(0xffffff);
    }
    const instanceColor = new THREE.Color();
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
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

      // Deterministic hash from index — no per-frame rng needed.
      const r = ((i * 2654435761) >>> 0) / 0xffffffff;
      const r2 = ((i * 1140671485 + 12345) >>> 0) / 0xffffffff;
      const hueShift = (r - 0.5) * 0.04; // ±2% hue
      const lumShift = (r2 - 0.5) * 0.16; // ±8% lightness
      instanceColor.setHSL(
        (hsl.h + hueShift + 1) % 1,
        hsl.s,
        Math.max(0, Math.min(1, hsl.l + lumShift)),
      );
      meshRef.current.setColorAt(i, instanceColor);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [items, itemCount, baseScale, material]);

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
