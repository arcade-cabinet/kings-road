import { WorldProvider } from 'koota/react';
import { useEffect } from 'react';
import { BiomeConfigSchema, BiomeService, biomeConfigs } from '@/biome';
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
