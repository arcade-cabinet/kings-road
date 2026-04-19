import { AdaptiveDpr, AdaptiveEvents, BakeShadows, Loader, PerformanceMonitor, Preload } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { BloodMetaballsEffect, ImpactDeformerEffect } from './combat';
import { CombatParticles } from './CombatParticles';
import { DungeonRenderer } from './DungeonRenderer';
import { EnvironmentIBL } from './environment';
import { FPSViewmodel } from './FPSViewmodel';
import { OceanPlane } from './OceanPlane';
import { ErrorBoundary } from '../ErrorBoundary';
import { BiomePostProcessing } from '@app/postprocessing';
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
  const { scene, camera, gl } = useThree();

  useLayoutEffect(() => {
    if (scene) {
      scene.background = new THREE.Color(0x87ceeb);
    }
    // DEV-only: expose the active scene / camera / renderer on window so we
    // can probe scene contents from Chrome DevTools + MCP tooling. No-op in
    // prod builds because `import.meta.env.DEV` is tree-shaken to false.
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      (window as unknown as { __kr__?: unknown }).__kr__ = {
        scene,
        camera,
        gl,
        THREE,
      };
    }
  }, [scene, camera, gl]);

  return null;
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
          {/* SDF-raymarched combat VFX — bounded hull spheres, not full-screen */}
          <ImpactDeformerEffect impacts={[]} />
          <BloodMetaballsEffect bursts={[]} />
          <DungeonEntrySystem />
          <AudioSystem />

          {/* First-person viewmodel — renders the equipped weapon */}
          <FPSViewmodel />

          {/* Biome-driven post processing — temporarily disabled for Phase 0
              integration validation. @react-three/postprocessing hits a
              circular-JSON serialization crash under React 19 StrictMode when
              EffectComposer children change. Task #21 follow-up: upgrade or
              replace the postprocessing wrapper. */}
          {/* <BiomePostProcessing /> */}
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
        {/* Mobile performance guard — drops DPR and disables events under frame budget pressure */}
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <BakeShadows />
        <PerformanceMonitor
          onDecline={() => undefined}
          onIncline={() => undefined}
          flipflops={3}
          factor={1}
        />
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
