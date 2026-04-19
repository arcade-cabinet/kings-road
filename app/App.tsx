import { WorldProvider } from 'koota/react';
import { useEffect } from 'react';
import { BiomeConfigSchema, BiomeService, biomeConfigs } from '@/biome';
import { applyDebugSpawn } from '@/debug';
import { loadSettings } from '@/ecs/actions/settings';
import { gameWorld } from '@/ecs/world';
import { loadRoadSpine } from '@/world/road-spine';
import { ErrorBoundary } from './ErrorBoundary';
import { Game } from './Game';

// Initialize BiomeService synchronously at module load — before any R3F frame
// fires — so getCurrentBiome() never throws due to missing init on first render.
BiomeService.init(
  biomeConfigs.map((raw) => BiomeConfigSchema.parse(raw)),
  loadRoadSpine(),
);

function App() {
  useEffect(() => {
    void loadSettings();
    // Skip main menu when `?spawn=<biome>` is in the URL, or when the build
    // has baked `VITE_DEBUG_SPAWN` (the Pages deploy sets this to
    // `thornfield` so the public URL lands straight in the benchmark biome).
    // Active in both DEV and production. No-op when neither signal is set.
    applyDebugSpawn();
  }, []);

  return (
    <ErrorBoundary source="App">
      <WorldProvider world={gameWorld}>
        <Game />
      </WorldProvider>
    </ErrorBoundary>
  );
}

export default App;
