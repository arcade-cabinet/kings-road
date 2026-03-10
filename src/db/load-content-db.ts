/**
 * Loads game content and populates the content store.
 *
 * Fetches the pre-compiled game-content.json bundle (built by
 * scripts/compile-content-db.ts) and passes it directly to
 * initContentStore(). No SQLite at runtime — the JSON bundle
 * matches the ContentStore input shape exactly.
 *
 * Call this once during the loading screen, before any game system
 * tries to read content.
 */

import { initItemLoader } from '../game/world/item-loader';
import { initContentStore } from './content-queries';

/** Load game content from the JSON bundle and initialize the content store */
export async function loadContentDb(): Promise<void> {
  // Fetch the compiled JSON content bundle
  // Expo sets EXPO_BASE_URL from experiments.baseUrl (e.g. "/kings-road")
  // In dev, Metro serves public/ at the root, so we skip the base URL.
  const base = __DEV__ ? '' : (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');
  const response = await fetch(`${base}/game-content.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch game-content.json: ${response.status}`);
  }
  const content = await response.json();

  // Populate the in-memory content store (Maps for O(1) lookups)
  initContentStore(content);

  // Populate the ECS item-registry from the content store
  initItemLoader();
}
