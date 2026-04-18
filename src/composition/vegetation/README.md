---
title: vegetation compositor
updated: 2026-04-18
status: current
domain: technical
---

# src/composition/vegetation

Layer-3 compositor. Given a `BiomeConfig`, chunk grid coordinates, a `HeightSampler` callback, and a seed string, returns a `VegetationPlacement[]` array of pure-data placement objects for all foliage instances in that chunk.

No Three.js. No React. Same inputs → identical output.

## Usage

```typescript
import { composeVegetation } from '@/composition/vegetation';

// heightSampler wraps sampleHeightmap from @/world/terrain — caller's responsibility
const heightSampler = (wx: number, wz: number) =>
  sampleHeightmap(hm, wx / worldWidth, wz / worldDepth) * maxHeight;

const placements = composeVegetation(thornfieldBiome, chunkCx, chunkCz, heightSampler, worldSeed);
// placements[0] → { assetId, position: Vec3, rotation: number, scale: number }
```

## Algorithm

1. For each foliage species in `biome.foliage.species`:
   - Compute instance count from `chunkArea × biome.foliage.density × species.density`
   - Place instances using Poisson-disk rejection sampling with species `minSpacing`
   - For each point: sample height, pick random variant from catalog, randomise scale within `scaleRange`, randomise Y rotation

## Asset catalog

PSX MEGA Nature Pack (`Mega_Nature.glb`) — 31 nodes extracted to `public/assets/nature/psx-mega/` via `scripts/extract-glb-nodes.ts`.

| Thornfield assetId | GLB variants |
|-------------------|-------------|
| gnarled-dead-oak | burnt-tree-1, burnt-tree-2, burn-tree-3 |
| hawthorn | forest-tree-1, forest-tree-2 |
| thorn-bush | bush-1 … bush-4 |
| ivy-ground | grass-1, grass-2, weed-1 |
| lone-fern | weed-1, grass-2 |
| fallen-leaves | yellow-flowers-1, red-flowers-1, white-flowers-1 |
| dead-grass | grass-1, grass-2 |

## HeightSampler

`type HeightSampler = (worldX: number, worldZ: number) => number`

The caller supplies this. Wire it to `sampleHeightmap` from `@/world/terrain` (Layer-2). The compositor never imports from `@/world/terrain` directly to keep the dependency direction clean.
