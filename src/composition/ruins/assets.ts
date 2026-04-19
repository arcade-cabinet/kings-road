/**
 * Ruin prop asset catalog — maps asset IDs to public-path GLBs.
 * All paths relative to public/assets/ruins/ after ingest-ruins.ts runs.
 *
 * Categories:
 *   walls     — structural broken/overgrown masonry
 *   graves    — grave markers, crosses, mounds, coffins
 *   scatter   — pots, barrels, skulls, debris, bones
 *   structure — arches, columns, door frames, window openings
 *   flora     — dead trees, overgrown bushes (ruins-specific)
 *
 * `baseScale` — bakes each asset up to its real-world silhouette so a
 * dead-town ruin reads at human scale instead of ankle-high knickknacks.
 * Category defaults used below:
 *   walls / structure → 1.5 (authored ~2 m, want ~3 m imposing)
 *   graves            → 1.4 (authored ~0.8 m, want ~1.1 m knee-height)
 *   scatter           → 1.8 (authored ~0.3 m, want ~0.5 m debris)
 *   flora (dead tree) → 3.0 (authored ~1 m, want ~3 m)
 */

export type RuinAssetId = string;

export interface RuinAssetDef {
  path: string;
  category: 'walls' | 'graves' | 'scatter' | 'structure' | 'flora';
  /** Probability weight within its category (higher = more frequent) */
  weight: number;
  /**
   * Per-asset base scale applied before compose's per-instance variation.
   * Required — see file header for category defaults. Missing baseScale
   * would silently render assets at their tiny authored size and
   * reintroduce the "everything is small" playtest bug.
   */
  baseScale: number;
}

export const RUIN_ASSETS: Record<RuinAssetId, RuinAssetDef> = {
  // --- walls ---
  'wall-broken': {
    path: '/assets/ruins/wall-broken.glb',
    category: 'walls',
    weight: 3,
    baseScale: 1.5,
  },
  'wall-double-broken': {
    path: '/assets/ruins/wall-double-broken.glb',
    category: 'walls',
    weight: 2,
    baseScale: 1.5,
  },
  'wall-arch-round-broken': {
    path: '/assets/ruins/wall-arch-round-broken.glb',
    category: 'walls',
    weight: 2,
    baseScale: 1.5,
  },
  'wall-arch-round-overgrown-broken': {
    path: '/assets/ruins/wall-arch-round-overgrown-broken.glb',
    category: 'walls',
    weight: 2,
    baseScale: 1.5,
  },
  'wall-overgrown': {
    path: '/assets/ruins/wall-overgrown.glb',
    category: 'walls',
    weight: 2,
    baseScale: 1.5,
  },
  'wall-hole': {
    path: '/assets/ruins/wall-hole.glb',
    category: 'walls',
    weight: 1,
    baseScale: 1.5,
  },
  'wall-double-hole': {
    path: '/assets/ruins/wall-double-hole.glb',
    category: 'walls',
    weight: 1,
    baseScale: 1.5,
  },
  'wall-half': {
    path: '/assets/ruins/wall-half.glb',
    category: 'walls',
    weight: 2,
    baseScale: 1.5,
  },
  // --- graves ---
  'gravestone-bevel': {
    path: '/assets/ruins/gravestone-bevel.glb',
    category: 'graves',
    weight: 3,
    baseScale: 1.4,
  },
  'gravestone-decorative': {
    path: '/assets/ruins/gravestone-decorative.glb',
    category: 'graves',
    weight: 3,
    baseScale: 1.4,
  },
  'gravestone-broken': {
    path: '/assets/ruins/gravestone-broken.glb',
    category: 'graves',
    weight: 2,
    baseScale: 1.4,
  },
  'gravestone-cross': {
    path: '/assets/ruins/gravestone-cross.glb',
    category: 'graves',
    weight: 2,
    baseScale: 1.4,
  },
  'gravestone-round': {
    path: '/assets/ruins/gravestone-round.glb',
    category: 'graves',
    weight: 2,
    baseScale: 1.4,
  },
  'grave-mound': {
    path: '/assets/ruins/grave-mound.glb',
    category: 'graves',
    weight: 3,
    baseScale: 1.4,
  },
  'coffin-old': {
    path: '/assets/ruins/coffin-old.glb',
    category: 'graves',
    weight: 1,
    baseScale: 1.4,
  },
  cross: {
    path: '/assets/ruins/cross.glb',
    category: 'graves',
    weight: 2,
    baseScale: 1.6,
  },
  'cross-wood': {
    path: '/assets/ruins/cross-wood.glb',
    category: 'graves',
    weight: 2,
    baseScale: 1.6,
  },
  // --- scatter ---
  skull: {
    path: '/assets/ruins/skull.glb',
    category: 'scatter',
    weight: 3,
    baseScale: 1.8,
  },
  'pot-broken-1': {
    path: '/assets/ruins/pot-broken-1.glb',
    category: 'scatter',
    weight: 2,
    baseScale: 1.8,
  },
  'pot-broken-2': {
    path: '/assets/ruins/pot-broken-2.glb',
    category: 'scatter',
    weight: 2,
    baseScale: 1.8,
  },
  'pot-broken-3': {
    path: '/assets/ruins/pot-broken-3.glb',
    category: 'scatter',
    weight: 1,
    baseScale: 1.8,
  },
  debris: {
    path: '/assets/ruins/debris.glb',
    category: 'scatter',
    weight: 3,
    baseScale: 1.8,
  },
  'debris-wood': {
    path: '/assets/ruins/debris-wood.glb',
    category: 'scatter',
    weight: 2,
    baseScale: 1.8,
  },
  bricks: {
    path: '/assets/ruins/bricks.glb',
    category: 'scatter',
    weight: 3,
    baseScale: 1.8,
  },
  // --- structure ---
  'arch-gothic': {
    path: '/assets/ruins/arch-gothic.glb',
    category: 'structure',
    weight: 1,
    baseScale: 1.5,
  },
  'arch-round': {
    path: '/assets/ruins/arch-round.glb',
    category: 'structure',
    weight: 1,
    baseScale: 1.5,
  },
  'column-round': {
    path: '/assets/ruins/column-round.glb',
    category: 'structure',
    weight: 2,
    baseScale: 1.5,
  },
  'column-round-short': {
    path: '/assets/ruins/column-round-short.glb',
    category: 'structure',
    weight: 2,
    baseScale: 1.5,
  },
  'window-bars-overgrown': {
    path: '/assets/ruins/window-bars-overgrown.glb',
    category: 'structure',
    weight: 1,
    baseScale: 1.5,
  },
  // --- flora ---
  'dead-tree-1': {
    path: '/assets/ruins/dead-tree-1.glb',
    category: 'flora',
    weight: 2,
    baseScale: 3.0,
  },
  'dead-tree-2': {
    path: '/assets/ruins/dead-tree-2.glb',
    category: 'flora',
    weight: 2,
    baseScale: 3.0,
  },
  'dead-tree-3': {
    path: '/assets/ruins/dead-tree-3.glb',
    category: 'flora',
    weight: 1,
    baseScale: 3.0,
  },
  'stone-wall-damaged': {
    path: '/assets/ruins/stone-wall-damaged.glb',
    category: 'walls',
    weight: 2,
    baseScale: 1.5,
  },
};

/** Return all asset ids in a given category */
export function getAssetsByCategory(
  category: RuinAssetDef['category'],
): RuinAssetId[] {
  return Object.entries(RUIN_ASSETS)
    .filter(([, def]) => def.category === category)
    .map(([id]) => id);
}

/** Weighted random pick from a list of asset ids */
export function weightedPick(
  ids: RuinAssetId[],
  rng: () => number,
): RuinAssetId {
  if (ids.length === 0) {
    throw new Error('weightedPick: empty asset array');
  }
  const invalidIds = ids.filter((id) => !RUIN_ASSETS[id]);
  if (invalidIds.length > 0) {
    throw new Error(
      `weightedPick: unknown asset ids: ${invalidIds.join(', ')}`,
    );
  }
  const total = ids.reduce((sum, id) => sum + RUIN_ASSETS[id].weight, 0);
  let r = rng() * total;
  for (const id of ids) {
    r -= RUIN_ASSETS[id].weight;
    if (r <= 0) return id;
  }
  return ids[ids.length - 1];
}
