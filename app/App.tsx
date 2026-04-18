import { WorldProvider } from 'koota/react';
import { useEffect } from 'react';
import { loadSettings } from '@/ecs/actions/settings';
import { gameWorld } from '@/ecs/world';
import { ErrorBoundary } from './ErrorBoundary';
import { Game } from './Game';

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
