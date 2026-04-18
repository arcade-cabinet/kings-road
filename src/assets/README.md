---
title: Assets Package
updated: 2026-04-18
status: current
domain: technical
---

# src/assets/ — Layer 1

**Intent:** Asset loading, URL helpers, and curated material palettes. The single
point of access for PBR materials, HDRIs, and GLTF loading patterns.

**Owner:** Team Assets

**Imports from:** `core` (via `@/core`), `lib/assets` (URL helpers re-exported here)

**Exports:**

| Export | Description |
|--------|-------------|
| `assetUrl(path)` | Resolves a public asset path against Vite's BASE_URL |
| `fontUrl(path)` | Convenience wrapper for `/assets/fonts/*` |
| `npcLabelFontUrl` | Pre-resolved Lora 700 font URL |
| `dracoDecoderPath` | Pre-resolved Draco decoder path |
| `cloneGltf(scene)` | Clone a THREE.Group preserving skeleton bindings (SkeletonUtils) |
| `useGltfClone(url)` | React hook: load + clone a GLB, memoized per scene |
| `useIdleAnimation(clips, ref, clip)` | React hook: attach + play an idle animation clip |
| `loadPbrMaterial(id)` | `Promise<MeshStandardMaterial>` — throws `AssetError` on missing id, cached |
| `PBR_PALETTE` | Tactile ID → directory name map (curated by team-lead in task #6) |
| `loadHdri(id)` | `Promise<THREE.Texture>` — equirectangular, ready for `<Environment map={...}>` |

**Testing:**

```bash
pnpm test src/assets/pbr/loader.test.ts
```

Unit tests mock `THREE.TextureLoader` and verify `AssetError` throws + material map binding.
