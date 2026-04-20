import { render } from 'vitest-browser-react';
import { beforeEach, expect, test } from 'vitest';
import { DialogueBox } from '@app/views/Gameplay/DialogueBox';
import { setGameActive } from '@/ecs/actions/game';
import { unsafe_resetSessionEntity } from '@/ecs/world';
import { KootaProvider } from './test-utils';

beforeEach(() => {
  unsafe_resetSessionEntity();
  setGameActive(true);
});

test('DialogueBox returns null when not in dialogue', async () => {
  const screen = await render(
    <KootaProvider>
      <DialogueBox />
    </KootaProvider>,
  );
  expect(screen.container.firstElementChild).toBeNull();
});
