import { WorldProvider } from 'koota/react';
import { useEffect } from 'react';
import { loadSettings } from '@/ecs/actions/settings';
import { gameWorld } from '@/ecs/world';
import { BiomeService } from '@/biome';
import forestJson from '@/biome/data/forest.json';
import meadowJson from '@/biome/data/meadow.json';
import moorJson from '@/biome/data/moor.json';
import thornfieldJson from '@/biome/data/thornfield.json';
import roadSpineJson from '@/content/world/road-spine.json';
import type { BiomeConfig } from '@/biome';
import { ErrorBoundary } from './ErrorBoundary';
import { Game } from './Game';

const BIOME_CONFIGS: BiomeConfig[] = [
  forestJson as BiomeConfig,
  meadowJson as BiomeConfig,
  moorJson as BiomeConfig,
  thornfieldJson as BiomeConfig,
];

function App() {
  useEffect(() => {
    void loadSettings();
    BiomeService.init(BIOME_CONFIGS, roadSpineJson as unknown as Parameters<typeof BiomeService.init>[1]);
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
