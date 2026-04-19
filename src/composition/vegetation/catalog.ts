export interface FoliageAssetDef {
  id: string;
  path: string;
  minSpacing: number;
  /**
   * Per-asset base scale baked into every instance before the biome's
   * species `scaleRange` multiplier. The PSX-mega GLBs are authored at
   * tiny reference scales (0.5–1 m tall) — a gnarled oak rendered at
   * authored scale against a 1.6 m player reads as a knee-high shrub.
   * These multipliers bring each asset class up to its intended
   * real-world silhouette:
   *   trees: 4–6 m (tall adult)
   *   bushes: 1.5–2 m (head-high)
   *   grass/weeds: 0.5–0.8 m (calf-height)
   *   flowers: 0.3–0.5 m (ankle-height)
   *
   * Required — missing baseScale would silently render an asset at its
   * authored (tiny) size, reintroducing the "I am super big and
   * everything else is small" playtest bug. Use `1` explicitly for
   * assets already authored at world scale.
   */
  baseScale: number;
}

export const FOLIAGE_CATALOG: Record<string, FoliageAssetDef[]> = {
  'gnarled-dead-oak': [
    {
      id: 'burnt-tree-1',
      path: '/assets/nature/psx-mega/burnt-tree-1.glb',
      minSpacing: 8,
      baseScale: 7,
    },
    {
      id: 'burnt-tree-2',
      path: '/assets/nature/psx-mega/burnt-tree-2.glb',
      minSpacing: 8,
      baseScale: 7,
    },
    {
      id: 'burn-tree-3',
      path: '/assets/nature/psx-mega/burn-tree-3.glb',
      minSpacing: 8,
      baseScale: 7,
    },
  ],
  hawthorn: [
    {
      id: 'forest-tree-1',
      path: '/assets/nature/psx-mega/forest-tree-1.glb',
      minSpacing: 3,
      baseScale: 6,
    },
    {
      id: 'forest-tree-2',
      path: '/assets/nature/psx-mega/forest-tree-2.glb',
      minSpacing: 3,
      baseScale: 6,
    },
  ],
  'thorn-bush': [
    {
      id: 'bush-1',
      path: '/assets/nature/psx-mega/bush-1.glb',
      minSpacing: 2,
      baseScale: 2.5,
    },
    {
      id: 'bush-2',
      path: '/assets/nature/psx-mega/bush-2.glb',
      minSpacing: 2,
      baseScale: 2.5,
    },
    {
      id: 'bush-3',
      path: '/assets/nature/psx-mega/bush-3.glb',
      minSpacing: 2,
      baseScale: 2.5,
    },
    {
      id: 'bush-4',
      path: '/assets/nature/psx-mega/bush-4.glb',
      minSpacing: 2,
      baseScale: 2.5,
    },
  ],
  'ivy-ground': [
    {
      id: 'grass-1',
      path: '/assets/nature/psx-mega/grass-1.glb',
      minSpacing: 1.5,
      baseScale: 0.7,
    },
    {
      id: 'grass-2',
      path: '/assets/nature/psx-mega/grass-2.glb',
      minSpacing: 1.5,
      baseScale: 0.7,
    },
    {
      id: 'weed-1',
      path: '/assets/nature/psx-mega/weed-1.glb',
      minSpacing: 2,
      baseScale: 0.8,
    },
  ],
  'lone-fern': [
    {
      id: 'weed-1',
      path: '/assets/nature/psx-mega/weed-1.glb',
      minSpacing: 2,
      baseScale: 0.8,
    },
    {
      id: 'grass-2',
      path: '/assets/nature/psx-mega/grass-2.glb',
      minSpacing: 1.5,
      baseScale: 1,
    },
  ],
  'fallen-leaves': [
    {
      id: 'yellow-flowers-1',
      path: '/assets/nature/psx-mega/yellow-flowers-1.glb',
      minSpacing: 1,
      baseScale: 2,
    },
    {
      id: 'red-flowers-1',
      path: '/assets/nature/psx-mega/red-flowers-1.glb',
      minSpacing: 1,
      baseScale: 2,
    },
    {
      id: 'white-flowers-1',
      path: '/assets/nature/psx-mega/white-flowers-1.glb',
      minSpacing: 1,
      baseScale: 2,
    },
  ],
  'dead-grass': [
    {
      id: 'grass-1',
      path: '/assets/nature/psx-mega/grass-1.glb',
      minSpacing: 1.5,
      baseScale: 0.7,
    },
    {
      id: 'grass-2',
      path: '/assets/nature/psx-mega/grass-2.glb',
      minSpacing: 1.5,
      baseScale: 0.7,
    },
  ],
  // ── Moor / highland biome species ────────────────────────────────
  // Previously unconfigured — moor biome listed `heather-bush`,
  // `standing-stone`, `bog-grass` in its foliage.species, but none of
  // them existed in FOLIAGE_CATALOG, so `getAssetVariants` returned []
  // and moor chunks produced zero instanced meshes. Reuse the closest
  // existing PSX-mega GLBs so moorland at least reads as foliage-dense.
  'heather-bush': [
    {
      id: 'bush-1',
      path: '/assets/nature/psx-mega/bush-1.glb',
      minSpacing: 2,
      baseScale: 2,
    },
    {
      id: 'bush-3',
      path: '/assets/nature/psx-mega/bush-3.glb',
      minSpacing: 2,
      baseScale: 2,
    },
  ],
  'bog-grass': [
    {
      id: 'weed-1',
      path: '/assets/nature/psx-mega/weed-1.glb',
      minSpacing: 1.2,
      baseScale: 2.5,
    },
    {
      id: 'grass-2',
      path: '/assets/nature/psx-mega/grass-2.glb',
      minSpacing: 1.5,
      baseScale: 0.7,
    },
  ],
  'standing-stone': [
    // No dedicated monolith asset yet — substitute fir-tree log for
    // vertical stone silhouette. Replace once a proper standing-stone
    // GLB is authored. Without this entry, the moor biome's 0.05
    // density × 1 species produces zero instances.
    {
      id: 'fir-tree-log',
      path: '/assets/nature/psx-mega/fir-tree-log.glb',
      minSpacing: 5,
      baseScale: 1.5,
    },
  ],
  // ── Meadow / farmland species ────────────────────────────────────
  'wildflower-cluster': [
    {
      id: 'yellow-flowers-1',
      path: '/assets/nature/psx-mega/yellow-flowers-1.glb',
      minSpacing: 1,
      baseScale: 2,
    },
    {
      id: 'red-flowers-1',
      path: '/assets/nature/psx-mega/red-flowers-1.glb',
      minSpacing: 1,
      baseScale: 2,
    },
    {
      id: 'white-flowers-1',
      path: '/assets/nature/psx-mega/white-flowers-1.glb',
      minSpacing: 1,
      baseScale: 2,
    },
  ],
  'meadow-tree': [
    {
      id: 'forest-tree-1',
      path: '/assets/nature/psx-mega/forest-tree-1.glb',
      minSpacing: 4,
      baseScale: 6,
    },
    {
      id: 'forest-tree-2',
      path: '/assets/nature/psx-mega/forest-tree-2.glb',
      minSpacing: 4,
      baseScale: 6,
    },
  ],
  'grass-tuft': [
    {
      id: 'grass-1',
      path: '/assets/nature/psx-mega/grass-1.glb',
      minSpacing: 0.8,
      baseScale: 2.5,
    },
    {
      id: 'grass-2',
      path: '/assets/nature/psx-mega/grass-2.glb',
      minSpacing: 0.8,
      baseScale: 2.5,
    },
  ],
};

export function getAssetVariants(speciesId: string): FoliageAssetDef[] {
  return FOLIAGE_CATALOG[speciesId] ?? [];
}
