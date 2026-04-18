---
title: composition/ruins
updated: 2026-04-18
status: current
domain: technical
---

# src/composition/ruins

**Intent:** Thornfield dead-town compositor. Turns a biome config + town footprint into a deterministic list of ruin prop placements. Outputs pure data — no Three.js, no React.

**Owner:** Team Composition

**Imports from:** `core`, `biome`

**Exports:**
- `composeRuins(biome, town, seed): RuinsPlacement[]` — main compositor function
- `RuinsPlacement`, `TownConfig` — placement types
- `RUIN_ASSETS`, `getAssetsByCategory` — asset catalog helpers

**Testing:**

```bash
pnpm test src/composition/ruins
```

## Asset sources

- Walls/arches: `3DLowPoly/Environment/Medieval/Ultimate Modular Ruins Pack - Aug 2021/`
- Graves/crosses: `3DLowPoly/Environment/Graveyard/Graveyard Kit/`
- Scatter/debris: same graveyard kit + ruins pack
- Ingested via: `scripts/ingest-ruins.ts` → `public/assets/ruins/`

## Determinism

`composeRuins(biome, town, seed)` is pure. Same `(town.id, seed)` always produces the same output. This is verified by `compose.test.ts`.

## Output guarantees

- Minimum 21 placements per call (sum of category minimums: 6+5+6+2+2).
- Maximum 38 placements per call (sum of category maximums: 10+9+10+4+5).
- No Three.js object references in output.
- All `assetId` values map to paths in `RUIN_ASSETS`.
