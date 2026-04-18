---
title: PBR Material Library
updated: 2026-04-18
status: current
---

# PBR Material Library

Each subdirectory contains the texture maps for one PBR material. The directory
name must match the value registered in `palette.ts` for that tactile ID.

## On-disk layout

The entire AmbientCG-style source pack is copied verbatim preserving all
original filenames. A typical pack contains:

```
public/assets/pbr/<tactile-id>/
  <PackPrefix>_Color.jpg           # Albedo/diffuse (sRGB) — loader binds this
  <PackPrefix>_NormalGL.jpg        # Normal, OpenGL convention — loader binds this
  <PackPrefix>_NormalDX.jpg        # Normal, DirectX convention — kept for platform swaps
  <PackPrefix>_Roughness.jpg       # Roughness (linear) — loader binds this
  <PackPrefix>_Displacement.jpg    # Height/parallax (linear) — loader binds when present
  <PackPrefix>_AmbientOcclusion.jpg # AO (linear) — loader binds when present
  <PackPrefix>_Metalness.jpg       # Metalness (metals only)
  <PackPrefix>.blend               # Blender companion — gitignored
  <PackPrefix>.mtlx / .tres / .usdc # USD/Godot companions — gitignored
  <PackPrefix>.png                 # Preview — gitignored
```

`<PackPrefix>` is registered in `palette.ts` as the `packPrefix` field for
each tactile ID. The loader constructs filenames as `<packPrefix><suffix>`.

Author-side companions (`.blend`, `.mtlx`, `.tres`, `.usdc`, `.png`) are
gitignored via `public/assets/pbr/**/*.blend` etc. — kept locally for
tooling but not shipped in the repo.

## Sourcing

Materials are ingested by `scripts/ingest-pbr.ts` which copies entire pack
directories from `/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/<PackName>/`
to `public/assets/pbr/<tactile-id>/`.

The content curator (team-lead) provides the manifest (tactile-id + sourcePack pairs)
and invokes the script. See `docs/benchmarks/phase-0-curation/thornfield-pbr-picks.md`.
