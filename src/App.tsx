import { WorldProvider } from 'koota/react';
import { gameWorld } from './ecs/world';
import { Game } from './game/Game';

function App() {
  return (
    <WorldProvider world={gameWorld}>
      <Game />
    </WorldProvider>
  );
}

export default App;
