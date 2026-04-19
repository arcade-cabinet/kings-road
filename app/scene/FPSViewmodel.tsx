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
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { useTrait } from 'koota/react';
import { InventoryUI } from '@/ecs/traits/session-inventory';
import { useFlags } from '@/ecs/hooks/useGameSession';
import { getSessionEntity } from '@/ecs/world';
import { assetUrl } from '@/lib/assets';
import { isContentStoreReady, getItem } from '@/db/content-queries';
import { getPlayer } from '@/ecs/actions/game';
import type { HandPose } from '@/schemas/item.schema';

const DEFAULT_HAND_GLB = '/assets/hands/hand.glb';

/**
 * Target on-screen size (world metres) for the viewmodel's longest axis —
 * roughly matches a real forearm-with-hand at camera distance. Authored
 * GLBs in pending-integration packs range from 15cm to 3m; without a
 * normalization step the `Villager NPCs` hand rig renders at 2.3m,
 * filling the viewport as a beige wall.
 */
const VIEWMODEL_TARGET_METRES = 0.24;
// Authored blade length at viewmodel distance. 0.35m at z=-0.45 reads as
// "holding a real sword" — big enough to feel weighty, small enough not to
// occlude the lower third of the viewport. The previous 0.6m filled half
// the screen vertically on desktop (and more on mobile foldables), which
// is the "T-post in the face" look from cb=131.
const WEAPON_TARGET_METRES = 0.35;

/**
 * Compute a uniform scale that fits `obj`'s authored bounding box into
 * `target` on its longest axis. Returns 1 when the box is zero-sized or
 * when the authored size is already <= target.
 */
function fitScale(
  obj: THREE.Object3D,
  target: number,
  THREE_: typeof THREE = THREE,
): number {
  const box = new THREE_.Box3().setFromObject(obj);
  const size = new THREE_.Vector3();
  box.getSize(size);
  const longest = Math.max(size.x, size.y, size.z);
  if (longest <= 0) return 1;
  return Math.min(1, target / longest);
}

/**
 * Local offsets + rotations per hand pose, camera-relative. Tuned for a
 * 1440×1024 desktop and ~500×844 mobile foldable viewport at 75° FOV so
 * the weapon sits in the classic FPS grip: hilt lower-right, blade
 * angled up-and-left across the viewport at ~30° off vertical, tip well
 * inside the frame.
 *
 * Orientation convention: authored weapon GLBs ship with blade along
 * local +Y (hilt at origin, blade pointing up). To render as a held
 * sword we pitch the blade forward-and-slightly-leftward and roll it a
 * bit toward the screen center so the flat of the blade catches light
 * rather than reading as an edge-on line.
 *
 * Previous revisions:
 *   [−0.15, −0.9, 0.2] → blade horizontal off to the right (unreadable)
 *   [0, −0.32, −0.6] rot [−1.4, 0, 0] → blade straight up, centered,
 *     filling half the vertical viewport (the cb=131 T-post look).
 *   This pass: hilt lower-right, blade angled up-and-left, smaller.
 */
const POSE_TRANSFORMS: Record<
  HandPose,
  { position: [number, number, number]; rotation: [number, number, number]; scale: number }
> = {
  // One-handed sword grip — classic FPS pose. Hilt in the lower-right,
  // blade angled up-and-left across the viewport. Roll (z rotation)
  // turns the flat of the blade toward the screen so it reads as a
  // 3D volume.
  grip: {
    position: [0.28, -0.38, -0.45],
    rotation: [-1.15, -0.25, -0.35],
    scale: 1.0,
  },
  // Two-handed polearm hold — still biased to the right of center but
  // pitched more vertical since the second hand implies bracing.
  hold: {
    position: [0.18, -0.4, -0.5],
    rotation: [-1.25, -0.15, -0.2],
    scale: 1.0,
  },
  // Small dagger/tanto — closer to the camera, tighter grip. Follows the
  // same angle convention as `grip` so it doesn't look out of place
  // when a dagger swaps in for a sword mid-combat.
  pinch: {
    position: [0.26, -0.34, -0.38],
    rotation: [-1.1, -0.3, -0.4],
    scale: 0.9,
  },
  // `palm` and `open` are documented as synonymous in item.schema.ts; they
  // MUST share a single transform so the same item rendered with either
  // pose shows identically in-hand. Flat-held items (torch, shield, book)
  // — lay near-flat toward the camera, pitched up slightly.
  palm: {
    position: [0.24, -0.32, -0.42],
    rotation: [-0.15, -0.2, -0.1],
    scale: 1.0,
  },
  open: {
    position: [0.24, -0.32, -0.42],
    rotation: [-0.15, -0.2, -0.1],
    scale: 1.0,
  },
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

  // Normalize the authored mesh + recenter its origin. Packs ship with
  // varying authored scales (15cm–3m long) and varying pivot conventions
  // (hilt-center for Kenney packs, geometric-center for PSX). We:
  //   1. Clone the geometry so we don't mutate the shared GLTF asset.
  //   2. Translate it so its bbox center is at (0, 0, 0) → predictable
  //      placement regardless of pivot convention.
  //   3. Compute a uniform scale so the longest axis fits
  //      WEAPON_TARGET_METRES.
  // Without recentering, a Kenney sword with pivot at the hilt renders
  // its blade-tip 60cm away from the pose's `position`, reading as "a
  // weird line sticking out of the edge of the screen."
  const prepared = useMemo(() => {
    if (!mesh.geometry) return { geometry: null, fit: 1 };
    const geo = mesh.geometry.clone();
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    if (!bb) return { geometry: geo, fit: 1 };
    const center = new THREE.Vector3();
    bb.getCenter(center);
    geo.translate(-center.x, -center.y, -center.z);
    const size = new THREE.Vector3();
    bb.getSize(size);
    const longest = Math.max(size.x, size.y, size.z);
    const fit = longest > 0 ? Math.min(1, WEAPON_TARGET_METRES / longest) : 1;
    return { geometry: geo, fit };
  }, [mesh.geometry]);

  if (!prepared.geometry) return null;

  // Intentionally discard the GLB's authored material here. Viewmodels
  // render camera-parented at a fixed distance with no HDRI environment
  // map bound yet; the authored PSX-pack materials look muddy under those
  // conditions. A uniform honey-gold PBR reads better in-hand until the
  // Thornfield Phase 0 lighting pass adds `<Environment>` IBL.
  return (
    <mesh
      geometry={prepared.geometry}
      position={transform.position}
      rotation={transform.rotation}
      scale={transform.scale * prepared.fit}
      castShadow
    >
      <meshStandardMaterial
        color="#c4a747"
        roughness={0.3}
        metalness={0.8}
        envMapIntensity={1.0}
      />
    </mesh>
  );
}

/**
 * Renders the player's hand just below the weapon. Uses SkeletonUtils
 * since the hand GLB is rigged (skinned mesh, 13 joints); plain
 * Object3D.clone would share the skeleton. Positioned slightly below
 * and behind the weapon so it reads as "gripping" it.
 */
function HandMesh({ pose }: { pose: HandPose }) {
  const gltf = useGLTF(assetUrl(DEFAULT_HAND_GLB)) as unknown as {
    scene: THREE.Group;
  };
  const cloned = useMemo(
    () => SkeletonUtils.clone(gltf.scene) as THREE.Group,
    [gltf.scene],
  );

  // Normalize the rigged hand GLB into viewmodel-sized units. The default
  // hand.glb is authored at forearm-length scale (~2.3m tall); without
  // this, the hand fills the viewport as a beige wall and occludes the
  // entire scene.
  const fit = useMemo(() => fitScale(cloned, VIEWMODEL_TARGET_METRES), [cloned]);

  const weaponTransform = POSE_TRANSFORMS[pose];
  // Hand sits below/behind the weapon grip — slight Y offset, same X/Z.
  const handPos: [number, number, number] = [
    weaponTransform.position[0] - 0.05,
    weaponTransform.position[1] - 0.1,
    weaponTransform.position[2] + 0.1,
  ];

  return (
    <primitive
      object={cloned}
      position={handPos}
      rotation={weaponTransform.rotation}
      scale={weaponTransform.scale * 0.8 * fit}
    />
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

  return (
    <primitive object={camera}>
      <BobbedViewmodel>
        <WeaponMesh
          glb={viewmodelConfig.glb}
          pose={viewmodelConfig.handPose}
        />
        <HandMesh pose={viewmodelConfig.handPose} />
      </BobbedViewmodel>
    </primitive>
  );
}

/**
 * Applies a sine-wave weapon bob driven by the player's forward
 * velocity. Zero velocity -> no bob (weapon sits at rest). The bob
 * amplitude is tied to `velocity` so a sprinting player sees more sway
 * than someone walking slowly. Wraps its children in a stable group ref
 * so `useFrame` can mutate transform matrices without re-rendering.
 */
function BobbedViewmodel({
  children,
}: {
  children: React.ReactNode;
}) {
  const bobRef = useRef<THREE.Group>(null);
  const elapsed = useRef(0);

  useFrame((_state, delta) => {
    if (!bobRef.current) return;
    // `getPlayer()` can return undefined before the PlayerState trait is
    // attached (brief window during game start). Guard explicitly so the
    // viewmodel sits still rather than throwing a TypeError.
    const player = getPlayer();
    const velocity = player ? Math.abs(player.velocity ?? 0) : 0;
    elapsed.current += delta;
    const moving = Math.min(velocity / 4, 1); // clamp to [0,1]
    const t = elapsed.current;
    const bobY = Math.sin(t * 8) * 0.015 * moving;
    const bobX = Math.cos(t * 4) * 0.01 * moving;
    bobRef.current.position.set(bobX, bobY, 0);
  });

  return <group ref={bobRef}>{children}</group>;
}

useGLTF.preload(assetUrl(DEFAULT_HAND_GLB));
