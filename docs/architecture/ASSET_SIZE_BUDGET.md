---
title: Asset Size Budget
updated: 2026-04-18
status: current
domain: technical
---

# Asset Size Budget

King's Road is a **streaming game**. The world loads in chunks of `CHUNK_SIZE = 120` units along the road spine. At `VIEW_DISTANCE = 1`, the active window is a 3×3 grid of 9 chunks. Memory is bounded by the resident chunk window, not by the total size of all assets on disk.

The correct constraint is **per-chunk resident memory**, not repository disk size.

---

## Runtime memory model

| Parameter | Value | Source |
|-----------|-------|--------|
| `CHUNK_SIZE` | 120 units | `src/utils/worldGen.ts` |
| `VIEW_DISTANCE` | 1 | `src/utils/worldGen.ts` |
| Active chunk window | (2×1+1)² = **9 chunks** | formula |
| Per-chunk resident budget | **60 MB** | target (GPU VRAM + CPU RAM) |
| Max total resident (9 chunks) | **540 MB** | per-chunk budget × window size |

The 60 MB per-chunk budget is chosen to fit a low-end mobile device (1.5–2 GB RAM) with headroom for OS, app binary, and Three.js renderer overhead.

---

## Per-chunk resident memory breakdown

Estimates for a typical road chunk (mix of terrain, props, vegetation, 1–2 NPCs):

| Asset class | Resident size | Notes |
|-------------|---------------|-------|
| Terrain geometry | 2–4 MB | Heightmap mesh + index buffer |
| PBR textures (biome-shared) | ~22 MB | 15 tactile IDs × ~1.5 MB runtime avg; **counted once per biome, not ×9** |
| Props + vegetation GLBs | 8–15 MB | Instanced via `THREE.InstancedMesh`; geometry shared across instances |
| NPC GLBs | ~8 MB | Shared bundle; loaded once on biome entry, not per-chunk |
| HDRI (biome-shared) | 5–8 MB | One equirectangular texture per biome; **counted once, not ×9** |
| **Per-chunk total** | **~45–57 MB** | Within 60 MB budget |

Biome-shared assets (PBR textures, NPC bundle, HDRI) are loaded on biome entry and kept resident for the entire biome stretch. They are counted once in the memory model, not multiplied by the chunk window size.

---

## Texture streaming strategy

| Asset type | Lifecycle | Eviction trigger |
|------------|-----------|-----------------|
| HDRI | Load on biome entry | Biome exit |
| PBR textures (all tactile IDs for biome) | Load on biome entry | Biome exit |
| Terrain geometry | Load on chunk enter | Chunk eviction (outside VIEW_DISTANCE) |
| Props / vegetation GLBs | Load on chunk enter | Chunk eviction |
| NPC bundle | Load on biome entry | Biome exit |
| Monster GLBs | Load on chunk enter if monsters present | Chunk eviction |

Biome exit is determined by `BiomeService.getCurrentRegionBounds(distanceFromStart)` returning a different region — i.e., when the player's road-spine distance crosses the `endDistance` boundary of the current region as defined in `road-spine.json`. The eviction caller is responsible for comparing the previous and current region ids each frame.

---

## Chunk unload discipline

**Status: required policy — not yet implemented.** `src/assets/gltf.ts` and `src/lib/configure-gltf.ts` currently have no chunk-eviction disposal. This is a known gap; the eviction hook must be wired before the streaming system goes to production. Track implementation alongside `app/scene/Chunk.tsx` chunk lifecycle work.

When a chunk falls outside the active window, all Three.js resources it owns must be explicitly released. `useGLTF` caches by URL — **silence does not free memory**.

Required disposal pattern (to be implemented in the chunk eviction path):

```ts
// On chunk eviction — call these for each GLB the chunk loaded
useGLTF.clear(glbUrl);          // remove from drei/useLoader cache
geometry.dispose();              // free GPU buffer
material.dispose();              // free GPU shader / uniforms
texture.dispose();               // free GPU texture memory
```

For biome-shared assets (PBR textures, NPC bundle, HDRI), disposal fires on biome exit, not chunk eviction.

Monitor resident memory during development to verify eviction is working:

```ts
const { gl } = useThree();
console.log(gl.info.memory);    // { geometries, textures }
console.log(gl.info.render);    // { calls, triangles, points, lines }
```

If `gl.info.memory.textures` climbs monotonically across chunk boundaries, a disposal call is missing.

---

## Repository binary asset strategy

Repository disk size is a **CDN / Git LFS concern**, not a runtime memory concern. A 200 MB repo with proper chunk streaming can run fine on a 2 GB RAM phone. An 80 MB repo with no disposal can OOM the same device.

That said, large binaries in the repo have real costs: clone time, CI disk, LFS bandwidth. Current known binary debt:

| Item | Disk size | Action |
|------|-----------|--------|
| `*pr.glb` duplicates in `public/assets/npcs/` | ~35 MB | Delete — issue #81. Preview GLBs must not ship. |
| Uncompressed GLBs across all categories | ~105 MB | Run `gltf-transform optimize` (Draco + WebP textures); estimated 40–70% reduction |
| PBR JPEG source packs | ~10–30 MB per pack | Convert to WebP at ingest time; ship WebP only |
| 4K EXR HDRIs | 30–60 MB each | Downscale to 2K RGBE `.hdr` at ingest time; ship `.hdr` only |

### LFS migration plan (deferred)

Moving all GLBs, HDRIs, and texture packs to Git LFS would eliminate binary bloat from the pack history. This is a **coordinated, history-rewriting operation** and must wait until all agent PRs drain to avoid merge conflicts.

When ready:

```bash
git lfs migrate import \
  --include='public/assets/**/*.glb,public/assets/**/*.gltf,public/assets/hdri/**/*.hdr,public/assets/hdri/**/*.exr' \
  --everything
```

This rewrites history. All collaborators must re-clone or run `git lfs fetch --all` after the migration lands.

---

## Compression recommendations

### GLBs

Apply Draco mesh compression + WebP texture compression at ingest time (Phase 0 target — no runtime code change needed; three.js loads WebP natively). Basis Universal / KTX2 is a Phase 1+ upgrade requiring `KTX2Loader` + `BasisTextureLoader`.

```bash
npx gltf-transform optimize input.glb output.glb \
  --texture-compress webp \
  --draco
```

Estimated: 14 MB NPC bundle → ~6 MB. Run via `scripts/compress-assets.ts` as part of the asset ingest pipeline — not a manual step.

### PBR textures

Source packs arrive as JPEG. Convert to WebP at ingest:

```bash
for f in public/assets/pbr/**/*.jpg; do
  cwebp -q 85 "$f" -o "${f%.jpg}.webp"
done
```

Estimated: 10 MB per pack → 6–7 MB at 85% WebP quality.

### HDRI

Ship 2K RGBE `.hdr` instead of 4K EXR. Three.js `RGBELoader` handles `.hdr` natively.

```bash
ffmpeg -i input.exr -vf scale=2048:-1 output.hdr
```

Estimated: 40 MB 4K EXR → 6–8 MB 2K RGBE.

---

## Required status checks — enterprise ruleset 11889443

`main` is protected via the **enterprise-level ruleset** (ID 11889443), not via repo-level branch protection. The repo-level endpoint (`gh api repos/arcade-cabinet/kings-road/branches/main/protection`) returns 404, but the enterprise ruleset is active and enforces non-fast-forward, required linear history, and squash-merge-only.

**What still needs an org-admin action:** the enterprise ruleset does not yet list `required_status_checks`. These CI jobs should be added to the ruleset's required checks by whoever holds org-admin access:

| Check context string | Provided by | When to require |
|---|---|---|
| `Test & Lint / Biome lint` | `.github/workflows/ci.yml` | Now |
| `Test & Lint / TypeScript check` | `.github/workflows/ci.yml` | Now |
| `Test & Lint / Unit tests` | `.github/workflows/ci.yml` | Now |
| `Test & Lint / Package boundaries` | `.github/workflows/ci.yml` (PR #65) | After #65 merges |
| `CodeQL / Analyze (javascript-typescript)` | `.github/workflows/codeql.yml` | Now |

These cannot be configured via `gh api` at the repo level — they must be set in the enterprise ruleset UI or via the enterprise GraphQL API (`updateRepositoryRuleset` mutation).

---

## Related

- `src/utils/worldGen.ts` — `CHUNK_SIZE = 120`, `VIEW_DISTANCE = 1` definitions.
- `src/utils/tuning.ts` — re-exports `CHUNK_SIZE` and `VIEW_DISTANCE` from `TUNING.world.*`.
- `src/utils/textures.ts` — runtime PBR/material texture handling.
- `scripts/` — asset pipeline scripts; PBR ingest, HDRI downscale, and GLB compression scripts planned here.
- Issue #81 — `*pr.glb` cleanup tracking.
