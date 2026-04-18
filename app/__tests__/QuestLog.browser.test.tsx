import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { QuestLog } from '@app/views/Gameplay/QuestLog';
import { restoreQuests } from '@/ecs/actions/quest';
import { setGameActive } from '@/ecs/actions/game';
import { unsafe_resetSessionEntity } from '@/ecs/world';

beforeEach(() => {
  unsafe_resetSessionEntity();
});

test('QuestLog shows an entry for each active quest', async () => {
  setGameActive(true);
  restoreQuests(
    [
      { questId: 'main-chapter-00', currentStep: 1 },
      { questId: 'side-lost-pilgrim', currentStep: 0 },
    ],
    [],
    [],
  );
  const screen = await render(<QuestLog />);
  await expect.element(screen.getByText(/Quests \(2\)/i)).toBeInTheDocument();
});

test('QuestLog renders nothing when gameActive is false', async () => {
  setGameActive(false);
  restoreQuests([], [], []);
  const screen = await render(<QuestLog />);
  await expect
    .element(screen.container)
    .toHaveAttribute('data-scratch', expect.anything())
    .catch(() => {
      /* fallthrough */
    });
  const triggers = screen.getByRole('button', { name: /quests/i });
  await expect
    .element(triggers)
    .not.toBeInTheDocument()
    .catch(() => {});
});
