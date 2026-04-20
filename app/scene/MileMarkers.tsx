/**
 * MileMarkers — diegetic stone mound waymarkers every 2 km along the King's Road.
 *
 * Renders 14 markers (2 km … 28 km) using:
 * - ONE InstancedMesh for the stone mounds (one draw call, grave-mound.glb)
 * - Individual <mesh> label planes per marker (14 planes with canvas textures)
 *
 * World coordinate system: road distance == world X.
 * Markers sit at (distance, 0, MARKER_Z_OFFSET) — slightly off the road edge
 * on the right-hand side as you travel toward Grailsend.
 *
 * The stone GLB is already part of the built bundle (public/assets/ruins/grave-mound.glb).
 */

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { assetUrl } from '@/lib/assets';
import { computeMileMarkerPositions } from '@/world/mile-markers';

/** Road-spine total distance in metres. */
const ROAD_TOTAL = 30000;
/** Spacing between markers in metres. */
const MARKER_INTERVAL = 2000;
/**
 * Z offset from road centre — markers sit just off the road's right edge.
 * Road half-width for highway is 12 m; adding 6 m gives 18 m from centre.
 */
const MARKER_Z_OFFSET = 18;
/** Height at which the label plane floats above the stone. */
const LABEL_HEIGHT = 2.2;
/** Canvas size for label texture (power of two). */
const LABEL_CANVAS_SIZE = 128;
/** Scale of the stone mound instances. */
const STONE_SCALE = 0.9;

const STONE_GLB = 'ruins/grave-mound.glb';

/** Build a canvas-texture label showing the km number in pastoral style. */
function makeLabelTexture(km: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_CANVAS_SIZE;
  canvas.height = LABEL_CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('MileMarkers: could not get 2d context');

  // Parchment background
  ctx.fillStyle = '#e8dfc0';
  ctx.beginPath();
  ctx.roundRect(4, 4, LABEL_CANVAS_SIZE - 8, LABEL_CANVAS_SIZE - 8, 8);
  ctx.fill();

  // Warm ink border
  ctx.strokeStyle = '#7a5c28';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(4, 4, LABEL_CANVAS_SIZE - 8, LABEL_CANVAS_SIZE - 8, 8);
  ctx.stroke();

  // Roman numeral-style label — just the number for readability
  ctx.fillStyle = '#4a2e10';
  ctx.font = `bold ${LABEL_CANVAS_SIZE * 0.42}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(km), LABEL_CANVAS_SIZE / 2, LABEL_CANVAS_SIZE * 0.44);

  // Small "km" suffix
  ctx.font = `${LABEL_CANVAS_SIZE * 0.18}px serif`;
  ctx.fillStyle = '#7a5c28';
  ctx.fillText('km', LABEL_CANVAS_SIZE / 2, LABEL_CANVAS_SIZE * 0.74);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function findFirstMesh(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((obj) => {
    if (!found && (obj as THREE.Mesh).isMesh) found = obj as THREE.Mesh;
  });
  return found;
}

/** Instanced stone mounds — one draw call for all 14 stones. */
function StoneMounds({ positions }: { positions: { x: number; z: number }[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const gltf = useGLTF(assetUrl(`/assets/${STONE_GLB}`));

  const { geometry, material } = useMemo(() => {
    const mesh = findFirstMesh(gltf.scene);
    if (!mesh) {
      throw new Error('MileMarkers: no mesh found in grave-mound.glb');
    }
    // Warm limestone tint — matches the ruins palette used in GlbInstancer
    const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
    mat.color.setHex(0x9a8e7a);
    mat.roughness = 0.95;
    return { geometry: mesh.geometry, material: mat };
  }, [gltf.scene]);

  // Dispose the cloned material on unmount
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    if (!meshRef.current || positions.length === 0) return;
    meshRef.current.frustumCulled = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      dummy.position.set(p.x, 0, p.z);
      dummy.scale.setScalar(STONE_SCALE);
      dummy.rotation.set(0, (i * 0.7) % (Math.PI * 2), 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions]);

  if (positions.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, positions.length]}
      frustumCulled={false}
      castShadow
      receiveShadow
    />
  );
}

/** Individual label plane above each stone. */
function LabelPlanes({
  markers,
}: {
  markers: { x: number; z: number; km: number }[];
}) {
  // Build textures once per km set
  const textures = useMemo(() => markers.map((m) => makeLabelTexture(m.km)), [markers]);

  // Dispose on unmount
  useEffect(() => {
    return () => {
      for (const t of textures) t.dispose();
    };
  }, [textures]);

  return (
    <>
      {markers.map((m, i) => (
        <mesh
          key={m.km}
          position={[m.x, LABEL_HEIGHT, m.z]}
          // Tilt slightly toward the road (player) so it's readable from
          // the direction of travel
          rotation={[0, Math.PI * 0.1, 0]}
        >
          <planeGeometry args={[0.8, 0.8]} />
          <meshBasicMaterial
            map={textures[i]}
            transparent
            alphaTest={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  );
}

export function MileMarkers() {
  const markerData = useMemo(() => {
    return computeMileMarkerPositions(ROAD_TOTAL, MARKER_INTERVAL).map((m) => ({
      x: m.distance,
      z: MARKER_Z_OFFSET,
      km: m.labelKm,
    }));
  }, []);

  const stonePositions = useMemo(
    () => markerData.map((m) => ({ x: m.x, z: m.z })),
    [markerData],
  );

  return (
    <>
      <StoneMounds positions={stonePositions} />
      <LabelPlanes markers={markerData} />
    </>
  );
}
