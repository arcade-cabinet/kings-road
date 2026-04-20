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
