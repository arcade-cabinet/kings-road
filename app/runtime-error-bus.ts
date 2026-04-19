/**
 * Tiny global error bus — imperative `useFrame` / subsystem callbacks can't
 * rely on React's ErrorBoundary (it only catches render/commit), so this
 * module gives them a one-way channel into the ErrorOverlay.
 *
 * Calling `reportRuntimeError(err, source)` sets a latched error that stays
 * until the user reloads. The App subscribes via `useRuntimeError()` and
 * renders `<ErrorOverlay>` over everything else.
 *
 * IMPORTANT: the philosophy is "errors MUST be surfaced, never swallowed."
 * Do not silently catch-and-continue anywhere in the codebase — either
 * re-throw (so React's ErrorBoundary catches it), or call this function.
 * Fallback behavior masks bugs.
 */
import { useSyncExternalStore } from 'react';

export interface RuntimeError {
  error: Error;
  source: string;
  timestamp: string;
}

let current: RuntimeError | null = null;
const listeners = new Set<() => void>();

export function reportRuntimeError(
  err: unknown,
  source: string,
): void {
  const error = err instanceof Error ? err : new Error(String(err));
  const timestamp = new Date().toISOString();

  // Latch-once — first error wins. Subsequent errors in the same session
  // are logged to console but don't overwrite the surfaced one (the first
  // error is usually the root cause; later errors are cascade symptoms).
  if (current) {
    console.error(`[runtime-error-bus] secondary error from ${source}:`, err);
    return;
  }

  current = { error, source, timestamp };
  console.error(`[runtime-error-bus] ${source}:`, err);

  for (const listener of listeners) listener();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): RuntimeError | null {
  return current;
}

/** React hook — returns the latched error, or null. */
export function useRuntimeError(): RuntimeError | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Test-only reset. Do not call from production code. */
export function unsafe_resetRuntimeError(): void {
  current = null;
  for (const listener of listeners) listener();
}
