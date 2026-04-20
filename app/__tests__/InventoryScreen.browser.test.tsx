import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { InventoryScreen } from '@app/views/Gameplay/InventoryScreen';
import {
  closeInventory,
  openInventory,
} from '@/ecs/actions/inventory-ui';
import { setGameActive } from '@/ecs/actions/game';
import { unsafe_resetSessionEntity } from '@/ecs/world';
import { KootaProvider } from './test-utils';

beforeEach(() => {
  unsafe_resetSessionEntity();
  setGameActive(true);
});

test('InventoryScreen renders children when open', async () => {
  openInventory();
  const screen = await render(
    <KootaProvider>
      <InventoryScreen />
    </KootaProvider>,
  );
  const root = screen.container.firstElementChild;
  if (!root) throw new Error('InventoryScreen rendered nothing');
  expect(root.children.length).toBeGreaterThan(0);
});

test('InventoryScreen returns null when closed', async () => {
  closeInventory();
  const screen = await render(
    <KootaProvider>
      <InventoryScreen />
    </KootaProvider>,
  );
  expect(screen.container.firstElementChild).toBeNull();
});
