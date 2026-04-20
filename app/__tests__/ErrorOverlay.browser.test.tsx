import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { ErrorOverlay } from '@app/views/ErrorOverlay';

test('ErrorOverlay shows message for thrown Error', async () => {
  const err = new Error('the bridge gave way');
  const screen = await render(<ErrorOverlay error={err} source="test" />);
  // Query by testid (deterministic) rather than text-regex which was
  // hitting a 60s timeout on `getByText(/bridge/i)` — the modal's
  // overflow container confused the locator. The title element is
  // always attached with data-testid="error-title".
  const title = screen.getByTestId('error-title');
  await expect.element(title).toBeInTheDocument();
  await expect.element(title).toHaveTextContent(/bridge/i);
});
