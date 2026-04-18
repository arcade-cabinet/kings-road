import { WorldProvider } from 'koota/react';
import { useEffect } from 'react';
import { loadSettings } from '@/ecs/actions/settings';
import { gameWorld } from '@/ecs/world';
import { BiomeService, biomeConfigs } from '@/biome';
import { roadSpine } from '@/content';
import { ErrorBoundary } from './ErrorBoundary';
import { Game } from './Game';

function App() {
  useEffect(() => {
    void loadSettings();
    BiomeService.init(
      biomeConfigs,
      roadSpine as unknown as Parameters<typeof BiomeService.init>[1],
    );
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
