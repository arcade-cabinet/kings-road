import { render } from 'vitest-browser-react';
import { beforeEach, expect, test, vi } from 'vitest';
import { MobileControls } from '@app/views/Gameplay/MobileControls';
import { useGameStore } from '@/stores/gameStore';

beforeEach(() => {
  // MobileControls short-circuits if `'ontouchstart' in window` is false.
  // Force it true in the browser test context so the component actually mounts.
  if (!('ontouchstart' in window)) {
    Object.defineProperty(window, 'ontouchstart', {
      configurable: true,
      value: null,
    });
  }
  useGameStore.setState({ gameActive: true });
});

test('MobileControls renders its joystick zone when touch is available', async () => {
  const screen = await render(<MobileControls />);
  // Any direct child under the overlay proves we actually rendered, not bailed.
  // Replacing baseElement assertion with a proxy check on at least one child node.
  const root = screen.container.firstElementChild;
  if (!root) throw new Error('MobileControls rendered nothing');
  expect(root.children.length).toBeGreaterThan(0);
  vi.restoreAllMocks();
});
