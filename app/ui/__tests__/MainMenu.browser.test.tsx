import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { MainMenu } from '../MainMenu';

test('MainMenu renders without errors', async () => {
  const screen = await render(<MainMenu />);
  await expect.element(screen.baseElement).toBeTruthy();
});
