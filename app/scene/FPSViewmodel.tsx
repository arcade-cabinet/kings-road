/**
 * FPSViewmodel — renders the currently equipped weapon as a first-person
 * viewmodel attached to the camera. Reads `ItemDefinition.viewmodel.glb`
 * from the equipped weapon id so authors control exactly which GLB
 * appears in-hand.
 *
 * Hand poses translate to fixed local transforms relative to the
 * camera:
 *   grip   — one-handed pistol-style grip, lower right
 *   hold   — two-handed polearm hold, centered
 *   pinch  — small tool pinched between fingers, slightly lower
 *   palm   — flat-palm (torch, shield), held out in front
 *   open   — open-palm (books, flat items), lowered and tilted up
 *
 * No procedural bob yet — that can layer on later via useFrame. The
 * goal of this pass is to SHOW the authored weapon in the player's
 * hand, which previously was invisible despite every equipment item
 * declaring a viewmodel GLB.
 */
import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import type * as THREE from 'three';
import { useTrait } from 'koota/react';
import { InventoryUI } from '@/ecs/traits/session-inventory';
import { useFlags } from '@/ecs/hooks/useGameSession';
import { getSessionEntity } from '@/ecs/world';
import { assetUrl } from '@/lib/assets';
import { isContentStoreReady, getItem } from '@/db/content-queries';
import type { HandPose } from '@/schemas/item.schema';

/** Local offsets + rotations per hand pose, camera-relative. */
const POSE_TRANSFORMS: Record<
  HandPose,
  { position: [number, number, number]; rotation: [number, number, number]; scale: number }
> = {
  grip: { position: [0.35, -0.4, -0.6], rotation: [0, -0.25, 0.1], scale: 1.0 },
  hold: { position: [0, -0.4, -0.8], rotation: [-0.1, 0, 0], scale: 1.0 },
  pinch: { position: [0.25, -0.35, -0.5], rotation: [0, -0.3, 0.2], scale: 0.8 },
  palm: { position: [0.3, -0.35, -0.55], rotation: [0, -0.2, -0.1], scale: 1.0 },
  open: { position: [0.3, -0.45, -0.55], rotation: [-0.4, -0.15, 0], scale: 1.0 },
};

function WeaponMesh({ glb, pose }: { glb: string; pose: HandPose }) {
  const { nodes } = useGLTF(assetUrl(glb)) as unknown as {
    nodes: Record<string, { isMesh?: boolean; geometry?: THREE.BufferGeometry }>;
  };
  const mesh = useMemo(
    () => Object.values(nodes).find((n) => n?.isMesh || n?.geometry),
    [nodes],
  );
  if (!mesh?.geometry) {
    throw new Error(
      `FPS viewmodel GLB ${glb} has no mesh nodes — cannot render weapon.`,
    );
  }

  const transform = POSE_TRANSFORMS[pose];

  return (
    <mesh
      geometry={mesh.geometry}
      position={transform.position}
      rotation={transform.rotation}
      scale={transform.scale}
      castShadow
    >
      <meshStandardMaterial color="#c4a747" roughness={0.3} metalness={0.8} />
    </mesh>
  );
}

export function FPSViewmodel() {
  const { camera } = useThree();
  const { gameActive } = useFlags();
  const ui = useTrait(getSessionEntity(), InventoryUI);

  const weaponId = ui?.equipped?.weapon ?? null;

  const viewmodelConfig = useMemo(() => {
    if (!weaponId) return null;
    if (!isContentStoreReady()) return null;
    const def = getItem(weaponId);
    if (!def?.viewmodel?.glb) return null;
    return def.viewmodel;
  }, [weaponId]);

  if (!gameActive || !viewmodelConfig) return null;

  // Parent the weapon group to the camera so it stays pinned to the
  // viewport in first-person. The camera itself is already in the R3F
  // tree; attaching this `primitive` makes the weapon ride along.
  return (
    <primitive object={camera}>
      <WeaponMesh
        glb={viewmodelConfig.glb}
        pose={viewmodelConfig.handPose}
      />
    </primitive>
  );
}
