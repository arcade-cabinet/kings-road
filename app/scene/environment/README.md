---
title: app/scene/environment
updated: 2026-04-18
status: current
domain: technical
---

# app/scene/environment

HDRI Image-Based Lighting for the R3F scene.

## Components

### `EnvironmentIBL`

Drives material IBL from `.hdr` files declared in the active biome's `lighting.hdri` field.

- Reads the player's road position (world X = road distance) and calls `BiomeService.getCurrentBiome`.
- Derives a coarse time-of-day bucket (`dawn | noon | dusk | night`) from `timeOfDay ∈ [0, 1)`.
- Supports both single-string HDRI (`"hdri-id"`) and per-bucket dict (`{ dawn: "...", noon: "..." }`).
- Cross-fades by remounting `IBLMap` under a new React key when the HDRI changes.
- Returns `null` before `BiomeService.init()` has run — no crash at cold start.

**Usage** — mount inside `<Canvas>` wrapped in `<Suspense>`:

```tsx
<Suspense fallback={null}>
  <EnvironmentIBL crossFadeDuration={2} />
</Suspense>
```

### `timeOfDayBucket(timeOfDay: number): TimeOfDayBucket`

Pure helper — maps a `[0, 1)` game clock value to `dawn | noon | dusk | night`.

## Sky / Sun tint integration

`DayNightCycle` in `app/systems/Environment.tsx` applies the active biome's
`lighting.directionalColor` and `lighting.directionalIntensity` to the scene's
directional sun light each frame. This ensures the sun color shifts with the biome
(e.g., a grey overcast tint for Thornfield vs warm gold for Meadow) independent of
the HDRI cross-fade.
