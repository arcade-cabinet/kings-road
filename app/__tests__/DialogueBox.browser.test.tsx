import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { DialogueBox } from '@app/views/Gameplay/DialogueBox';
import { useGameStore } from '@/stores/gameStore';

test('DialogueBox returns null when not in dialogue', async () => {
  useGameStore.setState({ gameActive: true, inDialogue: false });
  const screen = await render(<DialogueBox />);
  expect(screen.container.firstElementChild).toBeNull();
});
