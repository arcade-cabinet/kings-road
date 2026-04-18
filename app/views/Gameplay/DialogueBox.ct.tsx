import { expect, test } from '@playwright/experimental-ct-react';
import {
  DialogueBoxBlacksmith,
  DialogueBoxHidden,
  DialogueBoxWanderer,
} from './DialogueBox.story';

// DialogueBox uses position: absolute with z-20 — queries use `page` scope.

test('renders NPC name for blacksmith', async ({ mount, page }) => {
  await mount(<DialogueBoxBlacksmith />);

  await expect(page.getByText('Aldric the Smith')).toBeVisible();
});

test('shows NPC type label for blacksmith', async ({ mount, page }) => {
  await mount(<DialogueBoxBlacksmith />);

  await expect(page.getByText('Master Smith')).toBeVisible();
});

test('shows typewriter text that eventually completes', async ({
  mount,
  page,
}) => {
  await mount(<DialogueBoxBlacksmith />);

  // Wait for typewriter to complete (text length * 25ms + buffer)
  await page.waitForTimeout(3000);

  await expect(page.getByText(/My forge burns hot/)).toBeVisible();
});

test('has a Farewell close button', async ({ mount, page }) => {
  await mount(<DialogueBoxBlacksmith />);

  // Use button[type=button] to avoid the backdrop div (role=button)
  await expect(
    page.locator('button[type="button"]', { hasText: 'Farewell' }),
  ).toBeVisible();
});

test('shows wanderer NPC type', async ({ mount, page }) => {
  await mount(<DialogueBoxWanderer />);

  await expect(page.getByText('Mysterious Stranger')).toBeVisible();
  await expect(page.getByText('Wanderer')).toBeVisible();
});

test('clicking skip completes typewriter', async ({ mount, page }) => {
  await mount(<DialogueBoxBlacksmith />);

  // Click the dialogue area to skip typewriter
  const dialogueArea = page
    .locator('.min-h-\\[80px\\], .min-h-\\[100px\\]')
    .first();
  await dialogueArea.click();

  // After skip, full text should be visible
  await expect(
    page.getByText(/What brings you to this humble smithy/),
  ).toBeVisible();
});

test('does not render when not in dialogue', async ({ mount, page }) => {
  await mount(<DialogueBoxHidden />);

  const wrapper = page.getByTestId('dialogue-hidden-wrapper');
  await expect(wrapper).toBeAttached();
  await expect(page.getByText('Farewell')).not.toBeVisible();
});

test('shows ESC hint text', async ({ mount, page }) => {
  await mount(<DialogueBoxBlacksmith />);

  await expect(page.getByText('ESC')).toBeVisible();
});

test('screenshot: dialogue box blacksmith', async ({ mount, page }) => {
  await mount(<DialogueBoxBlacksmith />);

  // Wait for opening animation + typewriter to complete
  await page.waitForTimeout(3000);

  await expect(page).toHaveScreenshot('dialogue-box-blacksmith.png', {
    maxDiffPixels: 300,
  });
});
