/**
 * Debug spawn override — DEV only.
 *
 * Reads `?spawn=<biome-id>` (URL) and `VITE_DEBUG_SPAWN` (env).
 * When active: skips main menu, creates an in-memory save at the biome's
 * first road anchor, grants starter inventory, and activates the matching
 * main-quest chapter.
 *
 * Entire module is tree-shaken in prod because every export is guarded by
 * `import.meta.env.DEV`. Vite replaces the constant at build time, letting
 * the bundler eliminate dead branches.
 */

import * as THREE from 'three';

// ── Road-spine anchor map (static — mirrors content/world/road-spine.json) ──
interface AnchorDef {
  id: string;
  name: string;
  distanceFromStart: number;
  mainQuestChapter: string;
  biomeTag: string;
}

const ANCHORS: AnchorDef[] = [
  {
    id: 'home',
    name: 'Ashford',
    distanceFromStart: 0,
    mainQuestChapter: 'chapter-00',
    biomeTag: 'meadow',
  },
  {
    id: 'anchor-01',
    name: 'Millbrook',
    distanceFromStart: 6000,
    mainQuestChapter: 'chapter-01',
    biomeTag: 'forest',
  },
  {
    id: 'anchor-02',
    name: 'Thornfield Ruins',
    distanceFromStart: 12000,
    mainQuestChapter: 'chapter-02',
    biomeTag: 'thornfield',
  },
  {
    id: 'anchor-03',
    name: 'Ravensgate',
    distanceFromStart: 17000,
    mainQuestChapter: 'chapter-03',
    biomeTag: 'hills',
  },
  {
    id: 'anchor-04',
    name: "The Pilgrim's Rest",
    distanceFromStart: 21000,
    mainQuestChapter: 'chapter-04',
    biomeTag: 'waypoint',
  },
  {
    id: 'anchor-05',
    name: 'Grailsend',
    distanceFromStart: 28000,
    mainQuestChapter: 'chapter-05',
    biomeTag: 'grailsend',
  },
];

const STARTER_ITEMS: Array<{ itemId: string; quantity: number }> = [
  { itemId: 'iron_sword', quantity: 1 },
  { itemId: 'health_potion', quantity: 3 },
  { itemId: 'torch', quantity: 1 },
];

export interface SpawnConfig {
  biomeTag: string;
  anchor: AnchorDef;
  questChapter: string;
  starterItems: Array<{ itemId: string; quantity: number }>;
  position: THREE.Vector3;
}

/** Parse the spawn target from URL param or env var. Returns null in prod. */
export function parseSpawnParam(): string | null {
  if (!import.meta.env.DEV) return null;

  const fromEnv = import.meta.env.VITE_DEBUG_SPAWN as string | undefined;
  if (fromEnv) return fromEnv.toLowerCase().trim();

  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('spawn');
  if (fromUrl) return fromUrl.toLowerCase().trim();

  return null;
}

/** Resolve a biome tag to a full spawn config. Returns null if tag unknown. */
export function resolveSpawnConfig(biomeTag: string): SpawnConfig | null {
  if (!import.meta.env.DEV) return null;

  const anchor = ANCHORS.find((a) => a.biomeTag === biomeTag);
  if (!anchor) return null;

  return {
    biomeTag,
    anchor,
    questChapter: anchor.mainQuestChapter,
    starterItems: STARTER_ITEMS,
    position: new THREE.Vector3(anchor.distanceFromStart, 1.0, 0),
  };
}

/** True when a debug spawn is active this session. */
export function isDebugSpawnActive(): boolean {
  if (!import.meta.env.DEV) return false;
  return parseSpawnParam() !== null;
}
