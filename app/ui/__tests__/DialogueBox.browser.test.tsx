import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { DialogueBox } from '../DialogueBox';

test('DialogueBox mounts', async () => {
  const screen = await render(<DialogueBox />);
  await expect.element(screen.baseElement).toBeTruthy();
});
