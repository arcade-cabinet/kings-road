import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { MobileControls } from '@app/views/Gameplay/MobileControls';
import { useGameStore } from '@/stores/gameStore';

test('MobileControls mounts when game is active', async () => {
  useGameStore.setState({ gameActive: true });
  const screen = await render(<MobileControls />);
  await expect.element(screen.baseElement).toBeTruthy();
});
