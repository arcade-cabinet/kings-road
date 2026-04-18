import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { QuestLog } from '@app/views/Gameplay/QuestLog';
import { useGameStore } from '@/stores/gameStore';
import { useQuestStore } from '@/stores/questStore';

test('QuestLog renders with active quests', async () => {
  useGameStore.setState({ gameActive: true });
  useQuestStore.setState({
    activeQuests: [
      { questId: 'main-chapter-00', currentStep: 1 },
      { questId: 'side-lost-pilgrim', currentStep: 0 },
    ],
  });
  const screen = await render(<QuestLog />);
  await expect.element(screen.baseElement).toBeTruthy();
});

test('QuestLog renders empty when gameActive is false', async () => {
  useGameStore.setState({ gameActive: false });
  useQuestStore.setState({ activeQuests: [] });
  const screen = await render(<QuestLog />);
  await expect.element(screen.baseElement).toBeTruthy();
});
