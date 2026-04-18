import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { InventoryScreen } from '@app/views/Gameplay/InventoryScreen';
import { useInventoryStore } from '@/stores/inventoryStore';

test('InventoryScreen renders children when open', async () => {
  useInventoryStore.setState({ isOpen: true });
  const screen = await render(<InventoryScreen />);
  const root = screen.container.firstElementChild;
  if (!root) throw new Error('InventoryScreen rendered nothing');
  expect(root.children.length).toBeGreaterThan(0);
});

test('InventoryScreen returns null when closed', async () => {
  useInventoryStore.setState({ isOpen: false });
  const screen = await render(<InventoryScreen />);
  expect(screen.container.firstElementChild).toBeNull();
});
