import { AdaptiveDpr, AdaptiveEvents, BakeShadows, Loader, PerformanceMonitor, Preload } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { BenchmarkHUD, BenchmarkRunner, parseBenchParam } from '@/benchmark';
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
  const { inDungeon } = useFlags();

  useLayoutEffect(() => {
    if (scene) {
      // Warm pastoral cream in the overworld (matches Canvas CSS fallback),
      // deep-dungeon dark when below ground. EnvironmentIBL paints the HDRI
      // over this background once it loads — this clear color only shows
      // during the brief asset-load window and in any frame where a dungeon
      // room hasn't fully rendered its walls. The previous 0x87ceeb sky-blue
      // was a jarring LCD flash against the rest of the warm palette.
      scene.background = new THREE.Color(inDungeon ? 0x0a0a10 : 0xf5f0e8);
    }
    // Expose the active scene / camera / renderer on window so we can
    // probe scene contents from Chrome DevTools + Playwright MCP tooling.
    // Kept in production too so we can diagnose mobile/foldable reports
    // against the live Pages deploy — these are just references to existing
    // runtime objects, no new surface area or bundle bloat.
    if (typeof window !== 'undefined') {
      (window as unknown as { __kr__?: unknown }).__kr__ = {
        scene,
        camera,
        gl,
        THREE,
      };
    }
  }, [scene, camera, gl, inDungeon]);

  return null;
}

function SceneContent() {
  const { gameActive, inDungeon } = useFlags();
  const { seedPhrase } = useSeed();

  // Always render minimal scene structure to avoid R3F unmount issues
  // Just conditionally render the game content inside
  return (
    <>
      {/* Menu-only fallback ambient. When `gameActive` is true, the
          DayNightCycle in Environment.tsx owns ambient via ambientLightRef
          (biome-driven color + intensity, modulated by time of day). Having
          both active produced double ambient and washed the midtones. */}
      {!gameActive && <ambientLight intensity={0.1} color={0xffeedd} />}

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

          {/* Benchmark harness — observer-only; mounts only when
              `?bench=<route>` or `?benchmark=<biome>` is present. No render
              cost outside benchmark runs (parseBenchParam() returns null). */}
          {parseBenchParam() && <BenchmarkRunner />}

          {/*
            Biome-driven post-processing — bloom, chroma aberration,
            vignette, ACES tone mapping. Uses the raw `postprocessing`
            lib directly (not @react-three/postprocessing, which crashes
            React 19 with a JSON-cycle serialization on Resolution ↔
            Resizable mutual refs). Rendered via useFrame(cb, 1) so
            priority > 0 suppresses R3F 9's default gl.render() call;
            see BiomePostProcessing.tsx for full explanation.
          */}
          <BiomePostProcessing />
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
          // Disable renderer-side tone mapping — BiomePostProcessing runs
          // an explicit ACES_FILMIC ToneMappingEffect at the end of its
          // EffectPass. R3F's default is ACESFilmicToneMapping with
          // exposure 1.0, which was being applied to the linear HDR
          // scene BEFORE the composer's own ACES pass — double tone-map
          // squashes highlights twice, producing the blown-out milky sky
          // and muddy midtones visible on cb=131.
          toneMapping: THREE.NoToneMapping,
          // Pin the swap-chain color space to sRGB explicitly. Three.js
          // defaults to SRGBColorSpace today, but making it explicit
          // protects against a future default change silently turning the
          // composer's HalfFloatType linear output into a double-encoded
          // gamma write on the canvas. (Audit entry #15.)
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        style={{
          width: '100vw',
          height: '100vh',
          display: 'block',
          touchAction: 'none',
          // Warm cream fallback matches the pastoral mood during the brief
          // HDRI-load window. Once <Environment background /> mounts via
          // EnvironmentIBL, the HDRI fully owns the sky. The previous
          // '#87CEEB' sky-blue was a hard fight against the biome's
          // intended warmth — showed through on first frames and any
          // dropped-composer frame as a jarring LCD blue.
          background: '#f5f0e8',
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

      {/* Benchmark HUD — fixed-position overlay outside Canvas. No-op when
          no benchmark param is active. */}
      <BenchmarkHUD />

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
