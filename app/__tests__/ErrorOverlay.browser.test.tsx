import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { ErrorOverlay } from '@app/views/ErrorOverlay';

test('ErrorOverlay shows message for thrown Error', async () => {
  const err = new Error('the bridge gave way');
  const screen = await render(<ErrorOverlay error={err} source="test" />);
  await expect.element(screen.getByText(/bridge/i)).toBeInTheDocument();
});
