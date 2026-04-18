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
import { CombatParticles } from './CombatParticles';
import { DungeonRenderer } from './DungeonRenderer';
import { EnvironmentIBL } from './environment';
import { FPSViewmodel } from './FPSViewmodel';
import { OceanPlane } from './OceanPlane';
import { ErrorBoundary } from '../ErrorBoundary';
import { useFlags, useSeed } from '@/ecs/hooks/useGameSession';
import { AudioSystem } from '@app/systems/AudioSystem';
import { ChunkManager } from '@app/systems/ChunkManager';
import { CombatFeedback } from '@app/systems/CombatFeedback';
import { DungeonEntrySystem } from '@app/systems/DungeonEntrySystem';
import { EncounterSystem } from '@app/systems/EncounterSystem';
import {
  AmbientParticles,
  DayNightCycle,
  Fog,
  SkyDome,
} from '@app/systems/Environment';
import { FeatureSpawner } from '@app/systems/FeatureSpawner';
import { InteractionSystem } from '@app/systems/InteractionSystem';
import { PlayerController } from '@app/systems/PlayerController';
import { QuestSystem } from '@app/systems/QuestSystem';
import { WeatherSystem } from '@app/systems/WeatherSystem';

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
  const { gameActive, inDungeon } = useFlags();
  const { seedPhrase } = useSeed();

  // Always render minimal scene structure to avoid R3F unmount issues
  // Just conditionally render the game content inside
  return (
    <>
      {/* Always present: base lighting for when game isn't active */}
      <ambientLight intensity={gameActive ? 0.35 : 0.1} color={0xffeedd} />

      {/* Game content - only when active AND we have a seed */}
      {gameActive && seedPhrase && (
        <Physics gravity={[0, -25, 0]} timeStep="vary">
          {/* Overworld — hidden when inside a dungeon */}
          {!inDungeon && (
            <>
              {/* Environment */}
              <Fog />
              <DayNightCycle />
              <SkyDome />
              <Suspense fallback={null}>
                <EnvironmentIBL />
              </Suspense>
              <AmbientParticles />
              <WeatherSystem />

              {/* World */}
              <OceanPlane />
              <ChunkManager />

              {/* Overworld-only systems */}
              <InteractionSystem />
              <EncounterSystem />
              <FeatureSpawner />
              <QuestSystem />
            </>
          )}

          {/* Dungeon interior — shown when inside a dungeon */}
          {inDungeon && <DungeonRenderer />}

          {/* Always-active systems (work in both overworld and dungeon) */}
          <PlayerController />
          <CombatFeedback />
          <CombatParticles />
          <DungeonEntrySystem />
          <AudioSystem />

          {/* First-person viewmodel — renders the equipped weapon */}
          <FPSViewmodel />

          {/* Post Processing */}
          <PostProcessing />
        </Physics>
      )}
    </>
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
        <Suspense fallback={null}>
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
