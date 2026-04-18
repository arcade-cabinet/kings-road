---
title: HDRI Library
updated: 2026-04-18
status: current
---

# HDRI Library

Each `.hdr` file is an equirectangular HDRI loaded by `loadHdri(id)`.
The filename without extension is the `id` passed to the loader.

## On-disk layout

The entire source pack directory is copied verbatim. A typical HDRI pack contains:

```
public/assets/hdri/<id>/
  <id>.hdr           # Equirectangular HDRI — loader loads this
  <id>.exr           # High-precision variant — kept for future EXR loader
  <id>.png           # Preview thumbnail — gitignored
  <id>.blend         # Blender companion — gitignored
  <id>.tres / .usdc  # Godot / USD companions — gitignored
```

The HDRI loader loads `public/assets/hdri/<id>/<id>.hdr`.

Author-side companions are gitignored — kept locally for tooling.

## Sourcing

HDRIs are ingested by `scripts/ingest-hdri.ts` which copies entire pack
directories from `/Volumes/home/assets/HDRI/1K/<pack>/` to `public/assets/hdri/<id>/`.

The content curator (team-lead) provides the manifest using `sourceDir` (whole
directory) rather than a single file path. Thornfield HDRIs (cold-dawn,
overcast-noon, fog-dusk) are added in task #6.

## Polyhaven packs and the canonical alias

Polyhaven downloads land as `<name>_1k.hdr` / `_2k.hdr` / `_4k.hdr`.
The ingest script automatically creates a canonical alias `<id>.hdr` after
copying the whole directory, so the loader never needs to know about resolution
suffixes.

**Resolution preference: 1K > 2K > 4K.** 1K is the default for IBL ambient
lighting on mobile builds — it cuts texture RAM roughly in half versus 2K at
negligible perceptual quality loss for diffuse irradiance. Use 2K or 4K only if
specular reflections in the scene demand it and you have confirmed the budget.
