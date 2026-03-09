import { Loader, Preload } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import {
  Bloom,
  EffectComposer,
  SMAA,
  Vignette,
} from '@react-three/postprocessing';
import { Physics } from '@react-three/rapier';
import { BlendFunction } from 'postprocessing';
import { Suspense, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { ErrorBoundary } from '../ErrorBoundary';
import { useGameStore } from '../stores/gameStore';
import { AudioSystem } from '../systems/AudioSystem';
import { ChunkManager } from '../systems/ChunkManager';
import { EncounterSystem } from '../systems/EncounterSystem';
import { DayNightCycle, Fog, SkyDome } from '../systems/Environment';
import { FeatureSpawner } from '../systems/FeatureSpawner';
import { InteractionSystem } from '../systems/InteractionSystem';
import { PlayerController } from '../systems/PlayerController';
import { QuestSystem } from '../systems/QuestSystem';

// Initialize scene with warm pastoral sky background
function SceneInit() {
  const { scene } = useThree();

  useLayoutEffect(() => {
    if (scene) {
      scene.background = new THREE.Color(0x87ceeb);
    }
  }, [scene]);

  return null;
}

function PostProcessing() {
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        intensity={0.3}
        luminanceThreshold={0.8}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <Vignette
        offset={0.3}
        darkness={0.3}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

function SceneContent() {
  const gameActive = useGameStore((state) => state.gameActive);
  const seedPhrase = useGameStore((state) => state.seedPhrase);

  // Always render minimal scene structure to avoid R3F unmount issues
  // Just conditionally render the game content inside
  return (
    <>
      {/* Always present: base lighting for when game isn't active */}
      <ambientLight intensity={gameActive ? 0.35 : 0.1} color={0xffeedd} />

      {/* Game content - only when active AND we have a seed */}
      {gameActive && seedPhrase && (
        <Physics gravity={[0, -25, 0]} timeStep="vary">
          {/* Environment */}
          <Fog />
          <DayNightCycle />
          <SkyDome />

          {/* World */}
          <ChunkManager />

          {/* Systems */}
          <PlayerController />
          <InteractionSystem />
          <EncounterSystem />
          <FeatureSpawner />
          <QuestSystem />
          <AudioSystem />

          {/* Post Processing */}
          <PostProcessing />
        </Physics>
      )}
    </>
  );
}

// Loading fallback component for Suspense
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#87CEEB" />
    </mesh>
  );
}

export function GameScene() {
  return (
    <ErrorBoundary source="GameScene">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 1.5]}
        camera={{
          fov: 75,
          near: 0.1,
          far: 250,
          position: [2, 1.6, 24],
        }}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
        }}
        style={{
          width: '100vw',
          height: '100vh',
          display: 'block',
          touchAction: 'none',
          background: '#87CEEB',
        }}
      >
        <SceneInit />
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent />
          <Preload all />
        </Suspense>
      </Canvas>

      {/* Loading indicator */}
      <Loader
        containerStyles={{
          background: '#f5f1e8',
        }}
        innerStyles={{
          background: '#ede8dc',
          border: '2px solid #c4a747',
        }}
        barStyles={{
          background: '#c4a747',
        }}
        dataStyles={{
          color: '#8b6f47',
          fontFamily: 'Lora, serif',
        }}
      />
    </ErrorBoundary>
  );
}
