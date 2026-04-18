import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { GameHUD } from '@app/views/Gameplay/GameHUD';
import { useGameStore } from '@/stores/gameStore';

test('GameHUD renders with active game state', async () => {
  useGameStore.setState({ gameActive: true });
  const screen = await render(<GameHUD />);
  await expect.element(screen.baseElement).toBeTruthy();
});
