import { WorldProvider } from 'koota/react';
import { useEffect } from 'react';
import { BiomeConfigSchema, BiomeService, biomeConfigs } from '@/biome';
import { applyDebugSpawn } from '@/debug';
import { loadSettings } from '@/ecs/actions/settings';
import { gameWorld } from '@/ecs/world';
import { loadRoadSpine } from '@/world/road-spine';
import { ErrorBoundary } from './ErrorBoundary';
import { Game } from './Game';
import { reportRuntimeError, useRuntimeError } from './runtime-error-bus';
import { ErrorOverlay } from './views/ErrorOverlay';

// Initialize BiomeService synchronously at module load — before any R3F frame
// fires — so getCurrentBiome() never throws due to missing init on first render.
BiomeService.init(
  biomeConfigs.map((raw) => BiomeConfigSchema.parse(raw)),
  loadRoadSpine(),
);

// Route uncaught async errors into the visible ErrorOverlay. Without this,
// Promise rejections (HDRI loads, PBR texture loads, audio decode failures)
// vanish into the DevTools console and the scene silently degrades.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    reportRuntimeError(event.reason, 'unhandledrejection');
  });
  window.addEventListener('error', (event) => {
    reportRuntimeError(event.error ?? event.message, 'window.error');
  });
}

function App() {
  const runtimeError = useRuntimeError();

  useEffect(() => {
    void loadSettings();
    applyDebugSpawn();
  }, []);

  // Runtime errors (subsystem callbacks, async loads) surface via bus →
  // overlay. React render/commit errors surface via the ErrorBoundary below.
  if (runtimeError) {
    return (
      <ErrorOverlay
        error={runtimeError.error}
        source={runtimeError.source}
      />
    );
  }

  return (
    <ErrorBoundary source="App">
      <WorldProvider world={gameWorld}>
        <Game />
      </WorldProvider>
    </ErrorBoundary>
  );
}

export default App;
