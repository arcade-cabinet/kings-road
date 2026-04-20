/**
 * autosave — fire-and-forget background persistence for the auto-save slot.
 *
 * Quest actions and other durable-state mutations call `scheduleAutoSave()`;
 * the module debounces over ~400ms and writes a full SaveData snapshot to
 * slot 0. This fixes bug #20: quest progress was only persisted when the
 * user manually opened Save from the pause menu.
 *
 * Kept separate from `save-service.ts` so quest.ts doesn't pull the full
 * save-service graph; the snapshot is assembled here from the same sources
 * PauseMenu uses (game/quest/inventory actions).
 */

import { getGameSnapshot, getPlayTimeSeconds } from '@/ecs/actions/game';
import { getInventorySnapshot } from '@/ecs/actions/inventory-ui';
import { getQuestState } from '@/ecs/actions/quest';
import { saveToSlot, snapshotGameState } from './save-service';

/** Auto-save slot id. Manual slots are 1-3. */
export const AUTO_SAVE_SLOT = 0;

/** Debounce window for coalescing back-to-back quest/inventory events. */
const DEBOUNCE_MS = 400;

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let suppressed = false;

/**
 * Temporarily suppress auto-saves. Use around `restoreGameState()` so
 * reconstructing state on load doesn't immediately re-serialize it.
 */
export function suppressAutoSave(fn: () => void): void {
  suppressed = true;
  try {
    fn();
  } finally {
    suppressed = false;
  }
}

/**
 * Queue a background save to slot 0. Coalesces rapid calls (e.g. a quest
 * completion that triggers XP, inventory, and step advance in sequence).
 * No-op when suppressed, or when the game isn't in a save-worthy state.
 */
export function scheduleAutoSave(): void {
  if (suppressed) return;
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
 * Used by tests and by any caller that needs a synchronous guarantee
 * (e.g. on unload handlers in the future).
 */
export async function flushAutoSave(): Promise<void> {
  if (suppressed) return;
  const gs = getGameSnapshot();
  if (!gs.seedPhrase) return; // Game hasn't started yet.
  const qs = getQuestState();
  const inv = getInventorySnapshot();
  const data = snapshotGameState(
    gs,
    qs,
    { items: inv.items, gold: inv.gold, equipment: inv.equipped },
    gs.seedPhrase,
    getPlayTimeSeconds(),
  );
  await saveToSlot(AUTO_SAVE_SLOT, data);
}

/** Cancel any pending debounced save. Test helper. */
export function cancelPendingAutoSave(): void {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
}
