/**
 * Test story for ErrorOverlay — used by Playwright CT.
 *
 * Playwright CT serializes props from Node.js → browser via JSON.
 * Error.message and Error.stack are non-enumerable and get stripped.
 * This wrapper constructs the Error inside the browser so nothing is lost.
 */
import { ErrorOverlay } from './ErrorOverlay';

export function ErrorWrapper({
  name,
  message,
  source,
  componentStack,
}: {
  name?: string;
  message: string;
  source?: string;
  componentStack?: string;
}) {
  const error = new Error(message);
  if (name) error.name = name;
  return (
    <ErrorOverlay
      error={error}
      source={source}
      componentStack={componentStack}
    />
  );
}
