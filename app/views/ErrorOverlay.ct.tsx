import { expect, test } from '@playwright/experimental-ct-react';
import { ErrorOverlay } from './ErrorOverlay';
import { ErrorWrapper } from './ErrorOverlay.story';

// ErrorOverlay uses `position: fixed` — queries must use `page` scope.
// ErrorWrapper constructs Error in the browser (non-enumerable props survive).

test('renders error name and message', async ({ mount, page }) => {
  await mount(
    <ErrorWrapper
      name="TestError"
      message="Something broke"
      source="unit-test"
    />,
  );

  await expect(page.getByTestId('error-title')).toContainText(
    'TestError: Something broke',
  );
});

test('displays source and timestamp in meta', async ({ mount, page }) => {
  await mount(<ErrorWrapper message="fail" source="GameScene" />);

  const meta = page.getByTestId('error-meta');
  await expect(meta).toContainText('Source: GameScene');
});

test('shows stack trace', async ({ mount, page }) => {
  await mount(<ErrorWrapper message="stack test" source="test" />);

  const stack = page.getByTestId('error-stack');
  await expect(stack).toBeVisible();
  await expect(stack).toContainText('Error: stack test');
});

test('shows component stack when provided', async ({ mount, page }) => {
  await mount(
    <ErrorWrapper
      message="fail"
      source="test"
      componentStack="    at Foo\n    at Bar"
    />,
  );

  const cstack = page.getByTestId('error-component-stack');
  await expect(cstack).toBeVisible();
  await expect(cstack).toContainText('at Foo');
});

test('hides component stack when not provided', async ({ mount, page }) => {
  await mount(<ErrorWrapper message="fail" source="test" />);

  await expect(page.getByTestId('error-component-stack')).not.toBeVisible();
});

test('data attributes set for devtools', async ({ mount, page }) => {
  await mount(
    <ErrorWrapper
      name="AttrError"
      message="attr test"
      source="devtools-test"
    />,
  );

  const overlay = page.getByTestId('error-overlay');
  await expect(overlay).toHaveAttribute('data-error-name', 'AttrError');
  await expect(overlay).toHaveAttribute('data-error-message', 'attr test');
  await expect(overlay).toHaveAttribute('data-error-source', 'devtools-test');
  await expect(overlay).toHaveAttribute('role', 'alert');
});

test('reload button is clickable', async ({ mount, page }) => {
  await mount(<ErrorWrapper message="fail" source="test" />);

  const btn = page.getByTestId('error-reload-button');
  await expect(btn).toBeVisible();
  await expect(btn).toContainText('Reload');
});

test('copy button is present', async ({ mount, page }) => {
  await mount(<ErrorWrapper message="fail" source="test" />);

  const btn = page.getByTestId('error-copy-button');
  await expect(btn).toBeVisible();
  await expect(btn).toContainText('Copy to Clipboard');
});

test('accepts string error', async ({ mount, page }) => {
  await mount(<ErrorOverlay error="plain string error" source="test" />);

  await expect(page.getByTestId('error-title')).toContainText(
    'plain string error',
  );
});

test('screenshot: error overlay visual', async ({ mount, page }) => {
  await mount(
    <ErrorWrapper
      message="Visual regression test"
      source="screenshot-test"
      componentStack="    at GameScene\n    at App"
    />,
  );

  await expect(page).toHaveScreenshot('error-overlay.png', {
    maxDiffPixels: 100,
  });
});
