import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { CombatHUD } from '@app/views/Gameplay/CombatHUD';
import { useGameStore } from '@/stores/gameStore';

test('CombatHUD mounts', async () => {
  useGameStore.setState({ gameActive: true });
  const screen = await render(<CombatHUD />);
  await expect.element(screen.baseElement).toBeTruthy();
});
