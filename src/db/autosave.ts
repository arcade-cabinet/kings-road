/**
 * autosave — fire-and-forget background persistence for the auto-save slot.
 *
 * Quest actions and other durable-state mutations call `scheduleAutoSave()`;
 * the module debounces over ~400ms and writes a full SaveData snapshot to
 * slot 0. This fixes bug #20: quest progress was only persisted when the
 * user manually opened Save from the pause menu.
 *
 * This module avoids importing from `@/ecs/actions/*` so consumers there
 * (most importantly `@/ecs/actions/quest`) can call `scheduleAutoSave()`
 * without creating a circular module dependency. The caller registers a
 * snapshot provider once at app bootstrap via `registerAutoSaveProvider()`.
 */

import type { SaveData } from './save-service';
import { saveToSlot } from './save-service';

/** Auto-save slot id. Manual slots are 1-3. */
export const AUTO_SAVE_SLOT = 0;

/** Debounce window for coalescing back-to-back durable mutations. */
const DEBOUNCE_MS = 400;

/**
 * Snapshot provider supplied at bootstrap. Returns the SaveData to write,
 * or `null` when the game isn't in a save-worthy state (menu, mid-load,
 * no seed yet, etc.) — in which case the flush is skipped entirely.
 */
export type AutoSaveProvider = () => SaveData | null;

let provider: AutoSaveProvider | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
// Throttle state: key → last-fired timestamp (ms since epoch). Distinct from
// the debounced `pendingTimer` because throttled callers come from per-frame
// systems that would otherwise keep resetting the debounce indefinitely.
const throttleLastFiredAt = new Map<string, number>();
// Counter rather than boolean so nested `suppressAutoSave` calls compose
// correctly — only the outermost restore unsuppresses.
let suppressCount = 0;

/**
 * Register the snapshot provider. Call once at bootstrap (e.g. in Game.tsx
 * or App.tsx). Safe to call multiple times; the last registration wins.
 */
export function registerAutoSaveProvider(fn: AutoSaveProvider | null): void {
  provider = fn;
}

/**
 * Temporarily suppress auto-saves. Re-entrant: nested blocks maintain
 * suppression until every block has exited. Use around `restoreGameState()`
 * so rebuilding state on load doesn't immediately re-serialise it.
 */
export function suppressAutoSave(fn: () => void): void {
  suppressCount++;
  try {
    fn();
  } finally {
    suppressCount--;
  }
}

/**
 * Queue a background save to slot 0. Coalesces rapid calls. No-op when
 * suppressed, when no provider is registered, or when the provider returns
 * null (game not ready).
 */
export function scheduleAutoSave(): void {
  if (suppressCount > 0 || provider === null) return;
  if (pendingTimer !== null) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    flushAutoSave().catch((err) => {
      // Persistence failures should surface but not crash gameplay.
      console.error('[autosave] failed:', err);
    });
  }, DEBOUNCE_MS);
}

/**
 * Throttled scheduler — fires on the leading edge, then ignores calls
 * until `windowMs` has elapsed. Use this for per-frame / high-rate
 * mutators (health ticks, position updates) where the debounced
 * `scheduleAutoSave` would be reset forever and never actually fire.
 *
 * `key` is a caller-supplied namespace so different hot loops maintain
 * independent windows (e.g. 'player.health' vs 'env.timeOfDay').
 *
 * Semantics:
 *   - First call within a window → schedule via scheduleAutoSave()
 *     (still respects the 400ms debounce, so a burst coalesces)
 *   - Subsequent calls within the window → no-op
 *   - Window expires → next call fires again
 */
export function scheduleAutoSaveThrottled(key: string, windowMs: number): void {
  if (suppressCount > 0 || provider === null) return;
  // Guard against NaN/non-finite/negative windows — a 0ms or negative
  // window would make the throttle ineffective (every call passes), which
  // would reintroduce the per-frame footgun this wrapper exists to prevent.
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error(
      `scheduleAutoSaveThrottled: windowMs must be a positive finite number, got ${windowMs}`,
    );
  }
  const now = Date.now();
  const last = throttleLastFiredAt.get(key);
  if (last !== undefined && now - last < windowMs) return;
  throttleLastFiredAt.set(key, now);
  scheduleAutoSave();
}

/**
 * Immediately write the current state to slot 0 without debouncing.
 * Used by tests and callers that need a synchronous guarantee.
 */
export async function flushAutoSave(): Promise<void> {
  if (suppressCount > 0 || provider === null) return;
  const data = provider();
  if (data === null) return;
  await saveToSlot(AUTO_SAVE_SLOT, data);
}

/** Cancel any pending debounced save. Test helper. */
export function cancelPendingAutoSave(): void {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
}

/**
 * Reset all throttle keys. Called from `resetGame()` so a new session
 * starts with fresh throttle windows (otherwise a late-session throttle
 * entry could suppress an autosave on the first seconds of the next
 * session). Also used by tests.
 */
export function resetAutoSaveThrottle(): void {
  throttleLastFiredAt.clear();
}
