import { expect, test } from '@playwright/experimental-ct-react';
import {
  MobileControlsDefault,
  MobileControlsHidden,
  MobileControlsWithInteraction,
} from './MobileControls.story';

// MobileControls uses position: absolute, z-10, and has md:hidden class.
// The story wrapper forces touch detection on so it renders in Chromium desktop.
// Note: The md:hidden class may hide the component at desktop viewport widths.
// We use a mobile-sized viewport for these tests.

test.use({ viewport: { width: 390, height: 844 } });

test('renders jump button on mobile viewport', async ({ mount, page }) => {
  await mount(<MobileControlsDefault />);

  await expect(page.getByText('JUMP')).toBeVisible();
});

test('shows touch-to-move hint', async ({ mount, page }) => {
  await mount(<MobileControlsDefault />);

  await expect(page.getByText('Touch to move')).toBeVisible();
});

test('shows interact button when interactable nearby', async ({
  mount,
  page,
}) => {
  await mount(<MobileControlsWithInteraction />);

  await expect(page.getByText('Trade with')).toBeVisible();
  await expect(page.getByText('Peddler')).toBeVisible();
});

test('has stamina bar element at bottom', async ({ mount, page }) => {
  await mount(<MobileControlsDefault />);

  // The stamina bar is a thin 4px element — verify it exists in DOM
  const staminaBar = page.locator('.h-1.bg-yellow-900\\/60');
  await expect(staminaBar).toBeAttached();
});

test('does not render when game inactive', async ({ mount, page }) => {
  await mount(<MobileControlsHidden />);

  const wrapper = page.getByTestId('mobile-hidden-wrapper');
  await expect(wrapper).toBeAttached();
  await expect(page.getByText('JUMP')).not.toBeVisible();
});

test('screenshot: mobile controls default', async ({ mount, page }) => {
  await mount(<MobileControlsDefault />);

  await expect(page).toHaveScreenshot('mobile-controls.png', {
    maxDiffPixels: 300,
  });
});

test('screenshot: mobile controls with interaction', async ({
  mount,
  page,
}) => {
  await mount(<MobileControlsWithInteraction />);

  await expect(page).toHaveScreenshot('mobile-controls-interaction.png', {
    maxDiffPixels: 300,
  });
});
