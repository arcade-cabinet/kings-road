import { useAnimations, useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import type * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

export type GltfResult = {
  scene: THREE.Group;
  nodes: Record<string, THREE.Object3D>;
  animations: THREE.AnimationClip[];
};

/** Clone a GLTF scene preserving skeleton bindings across shared instances. */
export function cloneGltf(scene: THREE.Group): THREE.Group {
  return SkeletonUtils.clone(scene) as THREE.Group;
}

/**
 * Load a GLB and clone its scene so multiple instances each get independent
 * skeleton references. Returns the cloned group and animation clips.
 */
export function useGltfClone(url: string): {
  clone: THREE.Group;
  animations: THREE.AnimationClip[];
} {
  const gltf = useGLTF(url) as unknown as GltfResult;
  const clone = useMemo(() => cloneGltf(gltf.scene), [gltf.scene]);
  return { clone, animations: gltf.animations };
}

/**
 * Attach animations to a group ref, play the first clip matching `clipName`,
 * and fade in/out on mount/unmount. Returns the useAnimations result.
 */
export function useIdleAnimation(
  animations: THREE.AnimationClip[],
  groupRef: React.RefObject<THREE.Group | null>,
  clipName: string | null,
): ReturnType<typeof useAnimations> {
  const result = useAnimations(animations, groupRef);
  const { actions } = result;

  useEffect(() => {
    if (!clipName) return;
    const action = actions[clipName];
    if (!action) return;
    action.reset().fadeIn(0.3).play();
    return () => {
      action.fadeOut(0.3);
    };
  }, [actions, clipName]);

  return result;
}
