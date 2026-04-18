import { expect, test } from '@playwright/experimental-ct-react';
import {
  GameHUDDefault,
  GameHUDHidden,
  GameHUDLowHealth,
  GameHUDSprinting,
  GameHUDWithInteraction,
} from './GameHUD.story';

// GameHUD uses position: absolute with z-10 — queries use `page` scope.

test('renders health and stamina bars', async ({ mount, page }) => {
  await mount(<GameHUDDefault />);

  // Health icon (heart) and stamina icon (lightning)
  await expect(page.locator('text=❤').first()).toBeVisible();
  await expect(page.locator('text=⚡').first()).toBeVisible();
});

test('shows time display', async ({ mount, page }) => {
  await mount(<GameHUDDefault />);

  // 10 AM = "10:00 AM"
  await expect(page.getByText('10:00 AM')).toBeVisible();
});

test('shows controls hint bar', async ({ mount, page }) => {
  await mount(<GameHUDDefault />);

  await expect(page.getByText('WASD')).toBeVisible();
  await expect(page.getByText('Interact')).toBeVisible();
});

test('has crosshair element in center', async ({ mount, page }) => {
  await mount(<GameHUDDefault />);

  // Crosshair is a small 24px element — verify it exists in DOM
  const crosshair = page.locator('.w-6.h-6').first();
  await expect(crosshair).toBeAttached();
});

test('shows SPRINTING indicator when sprinting', async ({ mount, page }) => {
  await mount(<GameHUDSprinting />);

  await expect(page.getByText('SPRINTING')).toBeVisible();
});

test('does not show SPRINTING when not sprinting', async ({ mount, page }) => {
  await mount(<GameHUDDefault />);

  await expect(page.getByText('SPRINTING')).not.toBeVisible();
});

test('shows interaction prompt with NPC name', async ({ mount, page }) => {
  await mount(<GameHUDWithInteraction />);

  await expect(page.getByText('[E]')).toBeVisible();
  await expect(page.getByText('Talk to')).toBeVisible();
  await expect(page.getByText('Martha')).toBeVisible();
});

test('does not render when game is inactive', async ({ mount, page }) => {
  await mount(<GameHUDHidden />);

  const wrapper = page.getByTestId('hud-hidden-wrapper');
  await expect(wrapper).toBeAttached();
  await expect(wrapper).toBeEmpty();
});

test('shows nighttime display at 8 PM', async ({ mount, page }) => {
  await mount(<GameHUDLowHealth />);

  // 20/24 = 8 PM = "08:00 PM"
  await expect(page.getByText('08:00 PM')).toBeVisible();
});

test('screenshot: game hud default', async ({ mount, page }) => {
  await mount(<GameHUDDefault />);

  await expect(page).toHaveScreenshot('game-hud-default.png', {
    maxDiffPixels: 300,
  });
});

test('screenshot: game hud low health', async ({ mount, page }) => {
  await mount(<GameHUDLowHealth />);

  await expect(page).toHaveScreenshot('game-hud-low-health.png', {
    maxDiffPixels: 300,
  });
});
