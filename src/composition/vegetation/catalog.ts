export interface FoliageAssetDef {
  id: string;
  path: string;
  minSpacing: number;
}

export const FOLIAGE_CATALOG: Record<string, FoliageAssetDef[]> = {
  'gnarled-dead-oak': [
    {
      id: 'burnt-tree-1',
      path: '/assets/nature/psx-mega/burnt-tree-1.glb',
      minSpacing: 4,
    },
    {
      id: 'burnt-tree-2',
      path: '/assets/nature/psx-mega/burnt-tree-2.glb',
      minSpacing: 4,
    },
    {
      id: 'burn-tree-3',
      path: '/assets/nature/psx-mega/burn-tree-3.glb',
      minSpacing: 4,
    },
  ],
  hawthorn: [
    {
      id: 'forest-tree-1',
      path: '/assets/nature/psx-mega/forest-tree-1.glb',
      minSpacing: 3,
    },
    {
      id: 'forest-tree-2',
      path: '/assets/nature/psx-mega/forest-tree-2.glb',
      minSpacing: 3,
    },
  ],
  'thorn-bush': [
    { id: 'bush-1', path: '/assets/nature/psx-mega/bush-1.glb', minSpacing: 2 },
    { id: 'bush-2', path: '/assets/nature/psx-mega/bush-2.glb', minSpacing: 2 },
    { id: 'bush-3', path: '/assets/nature/psx-mega/bush-3.glb', minSpacing: 2 },
    { id: 'bush-4', path: '/assets/nature/psx-mega/bush-4.glb', minSpacing: 2 },
  ],
  'ivy-ground': [
    {
      id: 'grass-1',
      path: '/assets/nature/psx-mega/grass-1.glb',
      minSpacing: 1,
    },
    {
      id: 'grass-2',
      path: '/assets/nature/psx-mega/grass-2.glb',
      minSpacing: 1,
    },
    {
      id: 'weed-1',
      path: '/assets/nature/psx-mega/weed-1.glb',
      minSpacing: 1.5,
    },
  ],
  'lone-fern': [
    { id: 'weed-1', path: '/assets/nature/psx-mega/weed-1.glb', minSpacing: 2 },
    {
      id: 'grass-2',
      path: '/assets/nature/psx-mega/grass-2.glb',
      minSpacing: 1.5,
    },
  ],
  'fallen-leaves': [
    {
      id: 'yellow-flowers-1',
      path: '/assets/nature/psx-mega/yellow-flowers-1.glb',
      minSpacing: 1,
    },
    {
      id: 'red-flowers-1',
      path: '/assets/nature/psx-mega/red-flowers-1.glb',
      minSpacing: 1,
    },
    {
      id: 'white-flowers-1',
      path: '/assets/nature/psx-mega/white-flowers-1.glb',
      minSpacing: 1,
    },
  ],
  'dead-grass': [
    {
      id: 'grass-1',
      path: '/assets/nature/psx-mega/grass-1.glb',
      minSpacing: 1,
    },
    {
      id: 'grass-2',
      path: '/assets/nature/psx-mega/grass-2.glb',
      minSpacing: 1,
    },
  ],
};

export function getAssetVariants(speciesId: string): FoliageAssetDef[] {
  return FOLIAGE_CATALOG[speciesId] ?? [];
}
