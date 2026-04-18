import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { InventoryScreen } from '@app/views/Gameplay/InventoryScreen';
import {
  closeInventory,
  openInventory,
} from '@/ecs/actions/inventory-ui';
import { unsafe_resetSessionEntity } from '@/ecs/world';
import { useGameStore } from '@/stores/gameStore';

beforeEach(() => {
  unsafe_resetSessionEntity();
  useGameStore.setState({ gameActive: true });
});

test('InventoryScreen renders children when open', async () => {
  openInventory();
  const screen = await render(<InventoryScreen />);
  const root = screen.container.firstElementChild;
  if (!root) throw new Error('InventoryScreen rendered nothing');
  expect(root.children.length).toBeGreaterThan(0);
});

test('InventoryScreen returns null when closed', async () => {
  closeInventory();
  const screen = await render(<InventoryScreen />);
  expect(screen.container.firstElementChild).toBeNull();
});
