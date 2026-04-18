import { expect, test } from '@playwright/experimental-ct-react';
import {
  QuestLogEmpty,
  QuestLogExpanded,
  QuestLogHidden,
  QuestLogWithQuests,
} from './QuestLog.story';

// QuestLog uses position: absolute — queries use `page` scope.

test('renders quest count button when quests active', async ({
  mount,
  page,
}) => {
  await mount(<QuestLogWithQuests />);

  const button = page.getByRole('button', { name: /Quests \(2\)/ });
  await expect(button).toBeVisible();
});

test('starts collapsed by default', async ({ mount, page }) => {
  await mount(<QuestLogWithQuests />);

  // The expand indicator should show collapsed state
  await expect(page.getByText('▸')).toBeVisible();
});

test('expands on toggle click and shows quest entries', async ({
  mount,
  page,
}) => {
  await mount(<QuestLogExpanded />);

  // Click to expand
  const button = page.getByRole('button', { name: /Quests/ });
  await button.click();

  // After expanding, should show collapse indicator
  await expect(page.getByText('▾')).toBeVisible();
});

test('does not render when game is inactive', async ({ mount, page }) => {
  await mount(<QuestLogHidden />);

  const wrapper = page.getByTestId('quest-hidden-wrapper');
  await expect(wrapper).toBeAttached();
  // No quest button should be visible
  await expect(page.getByRole('button', { name: /Quests/ })).not.toBeVisible();
});

test('does not render when no active quests', async ({ mount, page }) => {
  await mount(<QuestLogEmpty />);

  const wrapper = page.getByTestId('quest-empty-wrapper');
  await expect(wrapper).toBeAttached();
  await expect(page.getByRole('button', { name: /Quests/ })).not.toBeVisible();
});

test('screenshot: quest log collapsed', async ({ mount, page }) => {
  await mount(<QuestLogWithQuests />);

  await expect(page).toHaveScreenshot('quest-log-collapsed.png', {
    maxDiffPixels: 200,
  });
});
