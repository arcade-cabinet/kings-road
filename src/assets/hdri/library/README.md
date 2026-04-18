---
title: HDRI Library
updated: 2026-04-18
status: current
---

# HDRI Library

Each `.hdr` file is an equirectangular HDRI loaded by `loadHdri(id)`.
The filename without extension is the `id` passed to the loader.

## On-disk layout

```
public/assets/hdri/<id>.hdr
```

## Sourcing

HDRIs are ingested by `scripts/ingest-hdri.ts` which copies from
`/Volumes/home/assets/HDRI/1K/` to `public/assets/hdri/` with the
canonical id as the filename.

Thornfield HDRIs (cold-dawn, overcast-noon, fog-dusk) are added by the
content curator (team-lead) in task #6.
