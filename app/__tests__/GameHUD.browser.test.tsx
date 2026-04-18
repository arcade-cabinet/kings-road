import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { GameHUD } from '@app/views/Gameplay/GameHUD';
import { useGameStore } from '@/stores/gameStore';

test('GameHUD renders children when game is active', async () => {
  useGameStore.setState({
    gameActive: true,
    stamina: 75,
    health: 85,
    currentChunkName: 'Wayside Chapel',
  });
  const screen = await render(<GameHUD />);
  const root = screen.container.firstElementChild;
  if (!root) throw new Error('GameHUD rendered nothing');
  expect(root.children.length).toBeGreaterThan(0);
});

test('GameHUD returns null when game is not active', async () => {
  useGameStore.setState({ gameActive: false });
  const screen = await render(<GameHUD />);
  expect(screen.container.firstElementChild).toBeNull();
});
