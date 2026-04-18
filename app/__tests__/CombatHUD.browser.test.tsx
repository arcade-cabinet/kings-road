import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { CombatHUD } from '@app/views/Gameplay/CombatHUD';
import { useGameStore } from '@/stores/gameStore';

test('CombatHUD mounts without throwing when game is active', async () => {
  useGameStore.setState({ gameActive: true, inCombat: false });
  const screen = await render(<CombatHUD />);
  expect(screen.container).toBeDefined();
});
