---
title: src/biome
updated: 2026-04-18
status: current
domain: technical
---

# src/biome — Layer 2a

**Intent:** Biome as root config. Single query point for every downstream visual/audio/gameplay decision.

**Owner:** Team Foundations

**Imports from:** `core`

**Exports:**

- `BiomeConfig`, `BiomeConfigSchema` — Zod schema covering lighting, terrain, foliage, weather, particles, audio, playerModifiers, monsterPool, npcWardrobe
- `BiomeService` — `init(configs, roadSpine)`, `getCurrentBiome(distanceFromStart)`, `getBiomeById(id)`, `getAllBiomes()`, `getNeighbors(biomeId)`
- `computeBiomeTransition(distanceFromStart, blendRadius?)` — cross-fade blend state between adjacent biomes
- `BiomeTransitionState` — `{ from, to, t }` where t ∈ [0,1]

**Data:** `data/` contains one JSON file per biome. All JSON must validate against `BiomeConfigSchema`.

**Contract:**
- `BiomeService.getCurrentBiome(pos)` is the ONLY way to resolve the current biome. No package reads `biome/data/*` directly.
- `BiomeConfig` objects returned by the service are frozen — mutating them is a bug.
- Call `BiomeService.init()` once at app startup before any game logic runs.

**Testing:** `pnpm test src/biome`
