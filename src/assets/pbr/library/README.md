---
title: PBR Material Library
updated: 2026-04-18
status: current
---

# PBR Material Library

Each subdirectory contains the texture maps for one PBR material. The directory
name must match the value registered in `palette.ts` for that tactile ID.

## On-disk layout

```
<material-dir>/
  color.jpg          # Albedo/diffuse (sRGB)
  normal.jpg         # Normal map (linear, OpenGL convention)
  roughness.jpg      # Roughness (linear, greyscale)
  displacement.jpg   # Height/displacement (linear, greyscale) — optional
  ao.jpg             # Ambient occlusion (linear, greyscale) — optional
```

## Sourcing

Materials are ingested by `scripts/ingest-pbr.ts` which copies from
`/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/<PackName>/` to
`public/assets/pbr/<material-dir>/` with canonical filenames above.

The ingestion script is invoked by the content curator (team-lead) with a
curated list of (tactile-id, source-pack-path) pairs.
