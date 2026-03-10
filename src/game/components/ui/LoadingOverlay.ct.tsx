import { expect, test } from '@playwright/experimental-ct-react';
import {
  LoadingOverlayHidden,
  LoadingOverlayVisible,
} from './LoadingOverlay.story';

// LoadingOverlay uses position: absolute with z-[60] — queries use `page` scope.

test('renders title when loading', async ({ mount, page }) => {
  await mount(<LoadingOverlayVisible />);

  await expect(page.getByText('Preparing the Realm')).toBeVisible();
});

test('shows first loading stage message', async ({ mount, page }) => {
  await mount(<LoadingOverlayVisible />);

  await expect(page.getByText('Awakening the physics engine...')).toBeVisible();
});

test('advances loading stages over time', async ({ mount, page }) => {
  await mount(<LoadingOverlayVisible />);

  // First stage is immediate
  await expect(page.getByText('Awakening the physics engine...')).toBeVisible();

  // Wait for stage advancement (500ms intervals)
  await page.waitForTimeout(600);
  await expect(page.getByText('Charting the realm...')).toBeVisible();
});

test('has a progress bar element', async ({ mount, page }) => {
  await mount(<LoadingOverlayVisible />);

  // The progress bar container is a thin element; verify it exists in DOM
  const progressContainer = page.locator('.h-1.bg-yellow-900\\/10');
  await expect(progressContainer).toBeAttached();
});

test('does not render when game is inactive', async ({ mount, page }) => {
  await mount(<LoadingOverlayHidden />);

  const wrapper = page.getByTestId('loading-hidden-wrapper');
  await expect(wrapper).toBeAttached();
  await expect(page.getByText('Preparing the Realm')).not.toBeVisible();
});

test('screenshot: loading overlay visual', async ({ mount, page }) => {
  await mount(<LoadingOverlayVisible />);

  // Let it settle briefly
  await page.waitForTimeout(100);

  await expect(page).toHaveScreenshot('loading-overlay.png', {
    maxDiffPixels: 300,
  });
});
