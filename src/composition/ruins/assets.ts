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
 */

export type RuinAssetId = string;

export interface RuinAssetDef {
  path: string;
  category: 'walls' | 'graves' | 'scatter' | 'structure' | 'flora';
  /** Probability weight within its category (higher = more frequent) */
  weight: number;
}

export const RUIN_ASSETS: Record<RuinAssetId, RuinAssetDef> = {
  // --- walls ---
  'wall-broken': {
    path: '/assets/ruins/wall-broken.glb',
    category: 'walls',
    weight: 3,
  },
  'wall-double-broken': {
    path: '/assets/ruins/wall-double-broken.glb',
    category: 'walls',
    weight: 2,
  },
  'wall-arch-round-broken': {
    path: '/assets/ruins/wall-arch-round-broken.glb',
    category: 'walls',
    weight: 2,
  },
  'wall-arch-round-overgrown-broken': {
    path: '/assets/ruins/wall-arch-round-overgrown-broken.glb',
    category: 'walls',
    weight: 2,
  },
  'wall-overgrown': {
    path: '/assets/ruins/wall-overgrown.glb',
    category: 'walls',
    weight: 2,
  },
  'wall-hole': {
    path: '/assets/ruins/wall-hole.glb',
    category: 'walls',
    weight: 1,
  },
  'wall-double-hole': {
    path: '/assets/ruins/wall-double-hole.glb',
    category: 'walls',
    weight: 1,
  },
  'wall-half': {
    path: '/assets/ruins/wall-half.glb',
    category: 'walls',
    weight: 2,
  },
  // --- graves ---
  'gravestone-bevel': {
    path: '/assets/ruins/gravestone-bevel.glb',
    category: 'graves',
    weight: 3,
  },
  'gravestone-decorative': {
    path: '/assets/ruins/gravestone-decorative.glb',
    category: 'graves',
    weight: 3,
  },
  'gravestone-broken': {
    path: '/assets/ruins/gravestone-broken.glb',
    category: 'graves',
    weight: 2,
  },
  'gravestone-cross': {
    path: '/assets/ruins/gravestone-cross.glb',
    category: 'graves',
    weight: 2,
  },
  'gravestone-round': {
    path: '/assets/ruins/gravestone-round.glb',
    category: 'graves',
    weight: 2,
  },
  'grave-mound': {
    path: '/assets/ruins/grave-mound.glb',
    category: 'graves',
    weight: 3,
  },
  'coffin-old': {
    path: '/assets/ruins/coffin-old.glb',
    category: 'graves',
    weight: 1,
  },
  cross: {
    path: '/assets/ruins/cross.glb',
    category: 'graves',
    weight: 2,
  },
  'cross-wood': {
    path: '/assets/ruins/cross-wood.glb',
    category: 'graves',
    weight: 2,
  },
  // --- scatter ---
  skull: {
    path: '/assets/ruins/skull.glb',
    category: 'scatter',
    weight: 3,
  },
  'pot-broken-1': {
    path: '/assets/ruins/pot-broken-1.glb',
    category: 'scatter',
    weight: 2,
  },
  'pot-broken-2': {
    path: '/assets/ruins/pot-broken-2.glb',
    category: 'scatter',
    weight: 2,
  },
  'pot-broken-3': {
    path: '/assets/ruins/pot-broken-3.glb',
    category: 'scatter',
    weight: 1,
  },
  debris: {
    path: '/assets/ruins/debris.glb',
    category: 'scatter',
    weight: 3,
  },
  'debris-wood': {
    path: '/assets/ruins/debris-wood.glb',
    category: 'scatter',
    weight: 2,
  },
  bricks: {
    path: '/assets/ruins/bricks.glb',
    category: 'scatter',
    weight: 3,
  },
  // --- structure ---
  'arch-gothic': {
    path: '/assets/ruins/arch-gothic.glb',
    category: 'structure',
    weight: 1,
  },
  'arch-round': {
    path: '/assets/ruins/arch-round.glb',
    category: 'structure',
    weight: 1,
  },
  'column-round': {
    path: '/assets/ruins/column-round.glb',
    category: 'structure',
    weight: 2,
  },
  'column-round-short': {
    path: '/assets/ruins/column-round-short.glb',
    category: 'structure',
    weight: 2,
  },
  'window-bars-overgrown': {
    path: '/assets/ruins/window-bars-overgrown.glb',
    category: 'structure',
    weight: 1,
  },
  // --- flora ---
  'dead-tree-1': {
    path: '/assets/ruins/dead-tree-1.glb',
    category: 'flora',
    weight: 2,
  },
  'dead-tree-2': {
    path: '/assets/ruins/dead-tree-2.glb',
    category: 'flora',
    weight: 2,
  },
  'dead-tree-3': {
    path: '/assets/ruins/dead-tree-3.glb',
    category: 'flora',
    weight: 1,
  },
  'stone-wall-damaged': {
    path: '/assets/ruins/stone-wall-damaged.glb',
    category: 'walls',
    weight: 2,
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
  const total = ids.reduce(
    (sum, id) => sum + (RUIN_ASSETS[id]?.weight ?? 1),
    0,
  );
  let r = rng() * total;
  for (const id of ids) {
    r -= RUIN_ASSETS[id]?.weight ?? 1;
    if (r <= 0) return id;
  }
  return ids[ids.length - 1];
}
