/**
 * SettlementSignpost — illuminated-manuscript wooden signpost placed at each
 * anchor settlement entrance along the King's Road.
 *
 * Structure:
 *   - GLB post: Sign_LeftRight / Sign_Left / Sign_Right from the Platformer
 *     Pack (3DLowPoly, KayKit). Chosen per anchor position on the road.
 *   - Canvas-texture planes: one per arm, painted with aged-parchment
 *     background + Lora serif text.
 *
 * The sign GLBs carry no textures (has_embedded_textures: false), so we
 * apply a warm aged-wood MeshStandardMaterial in JS.
 *
 * NOTE: The GLBs' geometry has no per-instance colour data, so the
 * GlbInstancer color-jitter path doesn't apply here. We render via
 * <primitive> (one draw call per signpost) which is acceptable — there are
 * at most 6 signposts in the entire world (one per anchor).
 */

import { useGLTF } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { assetUrl } from '@/lib/assets';
import type { SignpostLabels } from '@/world/signpost-text';

// ── Canvas texture helpers ────────────────────────────────────────────────

const CANVAS_W = 256;
const CANVAS_H = 64;

/**
 * Paint a single signpost arm label onto an off-screen canvas and return a
 * THREE.CanvasTexture. Style: aged parchment with dark-ink Lora serif.
 * Caller owns the returned texture and must dispose it on unmount.
 */
function makeArmTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('SettlementSignpost: could not get 2d context');

  // Parchment background — aged cream
  ctx.fillStyle = '#d4b483';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle border — dark oak ink
  ctx.strokeStyle = '#4a2e10';
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, CANVAS_W - 6, CANVAS_H - 6);

  // Text
  ctx.fillStyle = '#1a0d00';
  ctx.font = `bold 18px 'Lora', Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W - 16);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ── Aged wood material (shared across all signpost instances) ─────────────

const WOOD_MATERIAL = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x7a4b1f),
  roughness: 0.92,
  metalness: 0.0,
});

// ── Text plane geometry (shared, 1:4 aspect matching canvas) ─────────────
//   Width 1.0 m, height 0.25 m — fits comfortably on a KayKit sign arm.
const ARM_PLANE_GEO = new THREE.PlaneGeometry(1.0, 0.25);

// ── Component ────────────────────────────────────────────────────────────

interface SettlementSignpostProps {
  /** World-space position — placed at the settlement entrance. */
  position: [number, number, number];
  /** Y-axis rotation in radians (road faces +Z, so default 0 is fine). */
  rotationY?: number;
  /** Directional text labels produced by generateSignpostText(). */
  labels: SignpostLabels;
}

/**
 * Pick the correct GLB variant:
 *   - Both arms present → Sign_LeftRight
 *   - Left only         → Sign_Left
 *   - Right only        → Sign_Right
 */
function glbForLabels(labels: SignpostLabels): string {
  if (labels.left && labels.right) return 'signs/Sign_LeftRight.glb';
  if (labels.left) return 'signs/Sign_Left.glb';
  return 'signs/Sign_Right.glb';
}

/**
 * Approximate arm attachment positions on the KayKit sign GLBs.
 * These offsets are eyeballed from the GLB geometry (post ~0.1 m wide,
 * arms extend ~0.5 m each side at ~0.9 m height). Swap in precise
 * values once a real GLB viewer confirms the geometry.
 */
const LEFT_ARM_OFFSET: [number, number, number] = [-0.55, 0.92, 0.06];
const RIGHT_ARM_OFFSET: [number, number, number] = [0.55, 0.92, 0.06];

export function SettlementSignpost({
  position,
  rotationY = 0,
  labels,
}: SettlementSignpostProps) {
  const glbPath = glbForLabels(labels);
  const gltf = useGLTF(assetUrl(`/assets/${glbPath}`));

  // Dispose canvas textures on unmount via a stable ref.
  const leftTexRef = useRef<THREE.CanvasTexture | null>(null);
  const rightTexRef = useRef<THREE.CanvasTexture | null>(null);

  const leftTex = useMemo<THREE.CanvasTexture | null>(() => {
    leftTexRef.current?.dispose();
    if (!labels.left) {
      leftTexRef.current = null;
      return null;
    }
    const t = makeArmTexture(labels.left);
    leftTexRef.current = t;
    return t;
  }, [labels.left]);

  const rightTex = useMemo<THREE.CanvasTexture | null>(() => {
    rightTexRef.current?.dispose();
    if (!labels.right) {
      rightTexRef.current = null;
      return null;
    }
    const t = makeArmTexture(labels.right);
    rightTexRef.current = t;
    return t;
  }, [labels.right]);

  const sceneClone = useMemo(() => {
    const clone = gltf.scene.clone(true);
    // Apply aged-wood material to every mesh in the GLB.
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).material = WOOD_MATERIAL;
      }
    });
    return clone;
  }, [gltf.scene]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Post + arm structure from authored GLB */}
      <primitive object={sceneClone} scale={1.5} />

      {/* Left arm text plane */}
      {leftTex && (
        <mesh
          geometry={ARM_PLANE_GEO}
          position={LEFT_ARM_OFFSET}
          rotation={[0, 0, 0]}
          castShadow={false}
        >
          <meshBasicMaterial
            map={leftTex}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Right arm text plane */}
      {rightTex && (
        <mesh
          geometry={ARM_PLANE_GEO}
          position={RIGHT_ARM_OFFSET}
          rotation={[0, 0, 0]}
          castShadow={false}
        >
          <meshBasicMaterial
            map={rightTex}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * Preload all three sign GLB variants so they're ready when a TOWN chunk
 * enters view. Call this once at module load time.
 */
export function preloadSignpostGlbs() {
  useGLTF.preload(assetUrl('/assets/signs/Sign_LeftRight.glb'));
  useGLTF.preload(assetUrl('/assets/signs/Sign_Left.glb'));
  useGLTF.preload(assetUrl('/assets/signs/Sign_Right.glb'));
}
