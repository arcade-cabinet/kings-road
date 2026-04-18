import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { InventoryScreen } from '../InventoryScreen';
import { useInventoryStore } from '@/stores/inventoryStore';

test('InventoryScreen mounts when open', async () => {
  useInventoryStore.setState({ isOpen: true });
  const screen = await render(<InventoryScreen />);
  await expect.element(screen.baseElement).toBeTruthy();
});
