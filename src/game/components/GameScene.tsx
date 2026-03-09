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
import { Component, type ReactNode, Suspense, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { AudioSystem } from '../systems/AudioSystem';
import { ChunkManager } from '../systems/ChunkManager';
import { EncounterSystem } from '../systems/EncounterSystem';
import { DayNightCycle, Fog, SkyDome } from '../systems/Environment';
import { FeatureSpawner } from '../systems/FeatureSpawner';
import { InteractionSystem } from '../systems/InteractionSystem';
import { PlayerController } from '../systems/PlayerController';
import { QuestSystem } from '../systems/QuestSystem';

// Error boundary with themed modal
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

class GameErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[GameErrorBoundary] Caught error:', error);
    console.error('[GameErrorBoundary] Error info:', errorInfo);
    this.setState({
      errorInfo: errorInfo.componentStack || 'No stack trace available',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(245, 241, 232, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            fontFamily: 'Lora, serif',
          }}
        >
          <div
            style={{
              background: '#ede8dc',
              border: '2px solid #c4a747',
              padding: '32px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              color: '#3d3a34',
            }}
          >
            <h1
              style={{
                color: '#d97963',
                fontSize: '24px',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              ⚠ Game Error
            </h1>
            <div
              style={{
                background: '#f5f1e8',
                padding: '16px',
                marginBottom: '16px',
                border: '1px solid #d4cfc2',
              }}
            >
              <p
                style={{
                  color: '#d97963',
                  marginBottom: '8px',
                  fontFamily: 'monospace',
                }}
              >
                {this.state.error?.message || 'Unknown error'}
              </p>
              <p
                style={{
                  color: '#8b8680',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              >
                {this.state.error?.name}
              </p>
            </div>
            <details style={{ marginBottom: '16px' }}>
              <summary
                style={{
                  cursor: 'pointer',
                  color: '#c4a747',
                  marginBottom: '8px',
                }}
              >
                Stack Trace
              </summary>
              <pre
                style={{
                  background: '#f5f1e8',
                  padding: '12px',
                  fontSize: '11px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  color: '#8b8680',
                  border: '1px solid #d4cfc2',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error?.stack || 'No stack trace'}
              </pre>
            </details>
            <details>
              <summary
                style={{
                  cursor: 'pointer',
                  color: '#c4a747',
                  marginBottom: '8px',
                }}
              >
                Component Stack
              </summary>
              <pre
                style={{
                  background: '#f5f1e8',
                  padding: '12px',
                  fontSize: '11px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  color: '#8b8680',
                  border: '1px solid #d4cfc2',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.errorInfo}
              </pre>
            </details>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                marginTop: '24px',
                padding: '12px 24px',
                background: 'linear-gradient(to bottom, #d97963, #c4695a)',
                border: '1px solid #d97963',
                color: '#fff',
                fontFamily: 'Lora, serif',
                fontSize: '14px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Reload Game
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
    <GameErrorBoundary>
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
    </GameErrorBoundary>
  );
}
