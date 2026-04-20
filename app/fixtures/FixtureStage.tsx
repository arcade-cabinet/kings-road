/**
 * FixtureStage — isolated R3F Canvas for visual unit-testing a single asset.
 *
 * Purpose: prove that every authored asset (buildings, ruins, weapons,
 * NPCs, terrain tiles) renders correctly in isolation BEFORE we trust it
 * inside the full biome scene. Catches: missing PBR maps, wrong scale,
 * broken rigs, material corruption, missing textures, z-fighting with
 * ground, bad pivot points.
 *
 * Design:
 * - Fixed 512×512 viewport (deterministic framing across machines, small
 *   enough to keep WebGL memory low when running dozens of tests).
 * - Isometric-ish camera angle at position [d, d*0.7, d] looking at origin.
 * - Neutral stage: dark grey ground with a subtle 1m grid so scale
 *   issues jump out.
 * - Warm directional key light (#fff2d8) + cool ambient fill (#8a98b0) —
 *   catches missing normal maps / material bugs that wash out under flat
 *   lighting.
 * - No HDRI, no post-processing, no OrbitControls. This is an asset-
 *   isolation harness, not a scene preview.
 *
 * See docs/plans/2026-04-19-visual-fixtures.prq.md (Phase A2).
 */
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect } from 'react';
import * as THREE from 'three';

interface FixtureStageProps {
  /** The asset to showcase. Must be a pure R3F group / primitive. */
  children: React.ReactNode;
  /** Camera distance from origin in metres. Default tuned for ~2m assets. */
  cameraDistance?: number;
  /** Called after two rAFs so tests can screenshot a committed frame. */
  onReady?: () => void;
  /** Viewport size in CSS pixels. */
  size?: number;
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    if (!onReady) return;
    // Two rAFs: one for the React commit to flush, one for R3F to draw.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => onReady());
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [onReady]);
  return null;
}

export function FixtureStage({
  children,
  cameraDistance = 4,
  onReady,
  size = 512,
}: FixtureStageProps) {
  return (
    <div
      data-testid="fixture-stage"
      style={{
        width: size,
        height: size,
        background: '#2a2620',
        position: 'relative',
      }}
    >
      <Canvas
        camera={{
          position: [cameraDistance, cameraDistance * 0.7, cameraDistance],
          fov: 35,
          near: 0.05,
          far: 50,
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        shadows
      >
        <Suspense fallback={null}>
          {/* Warm key light from the front-upper-right. */}
          <directionalLight
            position={[3, 5, 2]}
            intensity={2.0}
            color="#fff2d8"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={0.1}
            shadow-camera-far={15}
            shadow-camera-left={-5}
            shadow-camera-right={5}
            shadow-camera-top={5}
            shadow-camera-bottom={-5}
          />
          {/* Cool ambient fill so shadow sides aren't pitch black. */}
          <ambientLight intensity={0.4} color="#8a98b0" />

          {/* 10×10 m grey ground plane to catch asset shadows. */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#3a3530" roughness={0.9} />
          </mesh>

          {/* Subtle 1 m grid overlay for scale reference. */}
          <gridHelper
            args={[10, 10, '#5a5048', '#4a4038']}
            position={[0, 0.001, 0]}
          />

          {children}

          <ReadySignal onReady={onReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}
