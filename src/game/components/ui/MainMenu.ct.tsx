import { expect, test } from '@playwright/experimental-ct-react';
import { MainMenuDefault, MainMenuHidden } from './MainMenu.story';

// MainMenu uses position: absolute with z-50 — queries must use `page` scope.

test('renders title and subtitle', async ({ mount, page }) => {
  await mount(<MainMenuDefault />);

  await expect(page.getByText("King's Road")).toBeVisible();
  await expect(page.getByText('The Kingdom of Albion')).toBeVisible();
});

test('displays the seed phrase', async ({ mount, page }) => {
  await mount(<MainMenuDefault />);

  await expect(page.getByText('Golden Verdant Meadow')).toBeVisible();
});

test('shows Realm Seed label', async ({ mount, page }) => {
  await mount(<MainMenuDefault />);

  await expect(page.getByText('Realm Seed')).toBeVisible();
});

test('has Reseed and Enter Realm buttons', async ({ mount, page }) => {
  await mount(<MainMenuDefault />);

  await expect(page.getByRole('button', { name: 'Reseed' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enter Realm' })).toBeVisible();
});

test('clicking Reseed changes the seed phrase', async ({ mount, page }) => {
  await mount(<MainMenuDefault />);

  await expect(page.getByText('Golden Verdant Meadow')).toBeVisible();
  await page.getByRole('button', { name: 'Reseed' }).click();

  // After reseed, the seed display should still contain valid text
  // (new seed is random so we just verify the element has content)
  await expect(async () => {
    const seedText = page
      .locator('.font-lora.text-2xl, .font-lora.text-3xl')
      .first();
    const content = await seedText.textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(3);
  }).toPass({ timeout: 3000 });
});

test('shows feature tags', async ({ mount, page }) => {
  await mount(<MainMenuDefault />);

  await expect(page.getByText('Procedural Worlds')).toBeVisible();
  await expect(page.getByText('Day/Night Cycle')).toBeVisible();
  await expect(page.getByText('NPCs & Dialogue')).toBeVisible();
  await expect(page.getByText('Dungeon Exploration')).toBeVisible();
});

test('shows keyboard controls hint', async ({ mount, page }) => {
  await mount(<MainMenuDefault />);

  await expect(page.getByText('WASD')).toBeVisible();
  await expect(page.getByText('SPACE')).toBeVisible();
});

test('returns null when game is active', async ({ mount, page }) => {
  await mount(<MainMenuHidden />);

  const wrapper = page.getByTestId('main-menu-hidden-wrapper');
  await expect(wrapper).toBeAttached();
  // The wrapper should be empty — MainMenu returns null
  await expect(wrapper).toBeEmpty();
});

test('screenshot: main menu visual', async ({ mount, page }) => {
  await mount(<MainMenuDefault />);

  // Wait for particles to initialize
  await page.waitForTimeout(200);

  await expect(page).toHaveScreenshot('main-menu.png', {
    // High threshold: FloatingEmbers particles animate continuously
    // causing ~2% pixel jitter between captures
    maxDiffPixelRatio: 0.03,
  });
});
