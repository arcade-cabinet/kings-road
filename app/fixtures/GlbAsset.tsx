/**
 * GlbAsset — minimal GLB loader for fixture tests.
 *
 * Loads a single GLB path and mounts it as a cloned primitive. Every mesh
 * in the cloned scene has `castShadow` + `receiveShadow` enabled so the
 * FixtureStage directional light models the asset volumetrically.
 *
 * Pure asset-load sanity check — no tinting, no per-instance magic, no
 * shadow frustum tweaks. If this component can't render an asset, either:
 *   - the GLB file is missing / malformed
 *   - the asset pipeline (copy-runtime-assets) didn't copy it
 *   - useGLTF threw during parsing
 *
 * All three manifest as a thrown error → visible in the fixture test.
 */
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { assetUrl } from '@/lib/assets';

interface GlbAssetProps {
  /** Path relative to /assets/, e.g. '/assets/ruins/wall-broken.glb'. */
  path: string;
  /** Uniform scale factor. Default 1. */
  scale?: number;
}

export function GlbAsset({ path, scale = 1 }: GlbAssetProps) {
  const { scene } = useGLTF(assetUrl(path)) as unknown as {
    scene: THREE.Group;
  };

  // Clone so two fixtures mounting the same GLB don't share transforms
  // from the useGLTF cache.
  const cloned = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return copy;
  }, [scene]);

  return <primitive object={cloned} scale={scale} />;
}
