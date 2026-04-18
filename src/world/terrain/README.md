---
title: world/terrain
updated: 2026-04-18
status: current
domain: technical
---

# src/world/terrain/

**Intent:** Data-layer terrain tools — heightmap loading, displaced BufferGeometry construction, and splat-map texture generation. Pure data; no React or scene components.

**Owner:** Team Terrain

**Imports from:** `core`, `assets`, `biome`

**Exports:**
- `loadHeightmap(id)` — loads `/assets/terrain/<id>.exr`, returns normalised `Float32Array`
- `sampleHeightmap(hm, u, v)` — bilinear sample at UV [0,1]
- `buildDisplacedGeometry(heightmap, options)` — displaced `THREE.BufferGeometry` for one chunk; seam-safe
- `buildSplatMap(biomeConfig, seed, options)` — 4-channel `THREE.DataTexture` of material blend weights

**Testing:** `pnpm test -- src/world/terrain`
