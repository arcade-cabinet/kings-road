---
title: app/scene/terrain
updated: 2026-04-18
status: current
domain: technical
---

# app/scene/terrain

R3F components and helpers for heightmapped, splat-blended terrain.

## Public API

```typescript
import { TerrainChunk } from './terrain';
import type { TerrainChunkProps } from './terrain';
import { buildSplatBlendMaterial } from './terrain';
```

## Components

### `<TerrainChunk>`

Heightmapped terrain chunk driven by a `BiomeConfig`. Async — returns `null`
until the build pipeline completes, then swaps in the mesh.

**Dispatch rule in `Chunk.tsx`:** when `biomeConfig.terrain.heightmap === 'procedural'`,
`Chunk` renders `<TerrainChunk>` instead of the flat PlaneGeometry fallback.
The chunk owns its own `RigidBody + HeightfieldCollider` — the parent must not
add a duplicate ground collider.

Props:

| Prop | Type | Description |
|------|------|-------------|
| `biomeConfig` | `BiomeConfig` | Drives heightmap dispatch, PBR palette, and splat weights |
| `seed` | `string` | World seed for deterministic noise |
| `cx` | `number` | Chunk grid column (X axis) |
| `cz` | `number` | Chunk grid row (Z axis) |
| `totalChunks` | `number?` | Chunks along one axis — used for seam UVs (default 1) |

Internally runs a 5-step build pipeline:

1. **Heightmap** — `buildProceduralHeightmap(seed, cx, cz)` when
   `terrain.heightmap === 'procedural'`; `loadHeightmap(url)` otherwise (dormant
   in Phase 0).
2. **Displaced geometry** — `buildDisplacedGeometry(heightmap, options)` →
   `THREE.BufferGeometry` with vertex Y displacement.
3. **Rapier heights** — flat `number[]` extracted from position attribute for
   `HeightfieldCollider`.
4. **Splat map** — `buildSplatMap(biomeConfig, seed, { chunkCx, chunkCz })` →
   `THREE.DataTexture` (RGBA, first 4 materials only).
5. **PBR materials** — `loadPbrMaterial(id, { displacementScale })` for each
   material slot; passed to `buildSplatBlendMaterial`.

`<ContactShadows>` is rendered at ground centre to visually ground NPCs and
monsters standing on the chunk.

### `buildSplatBlendMaterial(params)`

Creates a `THREE.ShaderMaterial` that splat-blends up to 4 `MeshStandardMaterial`
layers. Includes THREE `lights`, `fog`, and `shadowmap` shader chunks so it
receives scene lighting and Rapier shadows.

Params:

| Param | Type | Description |
|-------|------|-------------|
| `splatMap` | `THREE.DataTexture` | RGBA splat weights (one channel per layer) |
| `materials` | `THREE.MeshStandardMaterial[]` | 1–4 materials; fewer than 4 are padded by repeating the first |
| `tileScale` | `number?` | UV tile repeat (default 8) |

Throws `RangeError` for 0 or more than 4 materials.

## Splat map → material mapping

| RGBA channel | terrain.materials index |
|---|---|
| R | 0 (e.g. packed-mud-path) |
| G | 1 (e.g. mossy-stone) |
| B | 2 (e.g. grave-moss) |
| A | 3 (e.g. forest-floor) |

Biomes with more than 4 materials in `terrain.materials` have slots 4+ silently
dropped — they appear only in vegetation, not in the splat blend.

## PBR requirements

Every material ID in `terrain.materials` must satisfy the
`docs/architecture/PBR_MATERIAL_STANDARD.md` binding table: Color + NormalGL +
Roughness required; AO and Metalness bound when present. Ingest via
`scripts/ingest-pbr.ts <id> <source-pack>`.
