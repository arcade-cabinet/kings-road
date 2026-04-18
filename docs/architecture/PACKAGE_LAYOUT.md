---
title: Package Layout + Contract
updated: 2026-04-18
status: current
domain: technical
---

# Package Layout + Contract

*The rules that make parallel teammate work possible without merge chaos. Every package has a clear owner, a clear public surface (the barrel `index.ts`), and a clear dependency layer.*

## The rule

> **Imports only through barrels.** No file outside `src/<pkg>/` may reach into `src/<pkg>/internal.ts`. Every package exposes exactly one entry point: `src/<pkg>/index.ts`. If a sibling package needs something new, the sibling opens a PR to add it to the barrel; the sibling does not reach around.

This makes parallel work safe. Two teammates can rewrite the insides of two different packages simultaneously; they can't collide because they only ever see each other through stable barrels.

## Dependency layering

Packages are ordered in layers. A package at layer N may import only from layers < N.

```text
Layer 0  core
         │
Layer 1  content, assets
         │
Layer 2  biome, platform        (sub-layer 2a — no Layer-2 deps)
         │
Layer 2  ecs, world             (sub-layer 2b — may import 2a)
         │
Layer 2  audio, combat, save,
         benchmark, debug       (sub-layer 2c — may import 2a, 2b)
         │
Layer 3  composition
         │
Layer 4  app/ (scene, systems, views, components, postprocessing)
```

- **Layer 0 — `core`**: zero-dep foundation. Types, math, errors. Everyone imports it; it imports nothing internal.
- **Layer 1 — `content`, `assets`**: schemas, JSON queries, asset URL helpers. Depend only on `core`.
- **Layer 2 — Domain packages**: each one models one area of the game. May import `core`, `content`, `assets`, and any Layer-2 package listed in a **strictly lower sub-layer** (2a < 2b < 2c). Imports within the same sub-layer or upward are forbidden.
  - **2a** (`biome`, `platform`) — no Layer-2 dependencies. `biome` is the root config; `platform` is the Capacitor bridge. Both are leaves.
  - **2b** (`ecs`, `world`) — may import 2a. `world` queries `biome` to know what to generate; `ecs` traits may reference platform paths. `ecs` and `world` do not import each other.
  - **2c** (`audio`, `combat`, `save`, `benchmark`, `debug`) — may import 2a + 2b. `save` serializes `ecs` state; `combat` reacts to `ecs` events; `debug` spawns into a `biome` via `save` + `ecs`.
  - If two Layer-2 packages within the *same* sub-layer need to share something, the shared thing belongs in `core` or in a lower sub-layer.
- **Layer 3 — `composition`**: the only Layer-3 package. It orchestrates Layer-2 domain packages into deterministic composed output (village layouts, vegetation placements, dungeon kits). May import everything below it.
- **Layer 4 — `app/`**: the R3F render consumer. Reads composition output and renders it. May import everything below it.

Cross-layer import is enforced by:

- A `scripts/check-package-boundaries.ts` CI step that walks the import graph. It reads the sub-layer assignment table and fails if any package reaches upward or sideways within its own sub-layer.
- Barrel-only imports (lint rule).
- Code review.

## Package map

### `src/core/` — Layer 0

**Intent:** Zero-dep primitives used across every other package.

**Contents:**
- `types/` — `Vec3`, `Seed`, `BiomeId`, `EntityId`, `Archetype`, other cross-cutting types
- `math/` — `hashString`, `seededRng`, `lerp`, `smoothstep`, noise helpers
- `errors/` — named error classes (`ContentError`, `AssetError`, `SaveError`, `BiomeError`)
- `index.ts` — barrel

**Owned by:** Team Foundations.

**Imports from:** Nothing.

**Exports:** Types, error classes, pure functions.

---

### `src/content/` — Layer 1

**Intent:** Content trove (JSON), schemas (Zod), and compiled DB queries.

**Contents:**
- `data/` — all JSON under categorical subdirs (items, monsters, quests, towns, biomes, features, loot, encounters, npcs, world)
- `schemas/` — Zod schemas mirroring each data type
- `db/` — `compile-content-db.ts` (build time), `content-queries.ts` (runtime), SQLite drizzle schema
- `index.ts` — barrel re-exports: all schemas, `getItem`, `getMonster`, `getQuest`, `getBiome`, etc.

**Owned by:** Team Foundations.

**Imports from:** `core`.

---

### `src/assets/` — Layer 1

**Intent:** Asset loading, paths, and curated palettes.

**Subpackages:**
- `paths.ts` — `assetUrl()`, `fontUrl()` base path helpers
- `gltf.ts` — GLTF loading wrappers
- `pbr/` — PBR material loader
  - `loader.ts` — `loadPbrMaterial(id)` → `MeshStandardMaterial`
  - `palette.ts` — named tactile palette (80 curated materials)
  - `library/` — material directories, each with Color/Normal/Roughness/Displacement/AO
- `hdri/` — HDRI loader
  - `loader.ts` — `loadHdri(id)` → equirectangular `Texture` for `<Environment>`
  - `library/` — 8-12 curated HDRIs
- `index.ts`

**Owned by:** Team Assets.

**Imports from:** `core`.

**Contract:**
- `loadPbrMaterial(id: string): Promise<THREE.MeshStandardMaterial>` — throws `AssetError` on missing id. Material is cached; repeat calls return the same instance.
- `loadHdri(id: string): Promise<THREE.Texture>` — equirectangular map ready for `<Environment map={...}>`.

---

### `src/biome/` — Layer 2

**Intent:** Biome as root config. Single query point for every downstream visual/audio/gameplay decision.

**Contents:**
- `schema.ts` — `BiomeConfig` Zod schema
- `data/` — one JSON per biome (`thornfield.json`, `ashford.json`, `ravensgate.json`, ...)
- `service.ts` — `BiomeService`: `getCurrentBiome(playerPos): BiomeConfig`, `getBiomeById(id)`, `getNeighbors(biomeId)`
- `transition.ts` — cross-fade logic between adjacent biomes (for smooth transitions as the player walks across a boundary)
- `index.ts`

**Owned by:** Team Foundations.

**Imports from:** `core`, `content`.

**Contract:**
- `BiomeService.getCurrentBiome(pos)` is the ONLY way to resolve the current biome. No package reads `biome.data.*` directly.
- `BiomeConfig` is immutable — mutating returned objects is a bug.

---

### `src/world/` — Layer 2

**Intent:** World generation — kingdom gen, road spine, chunk streaming, terrain, dungeon graphs.

**Subpackages:**
- `kingdom/` — `generateKingdom()`
- `road/` — road spine, pacing engine
- `chunk/` — chunk streaming state, chunk generation
- `terrain/` — heightmap loader, splat-paint helpers (data side; rendering in `app/scene/terrain/`)
- `dungeon/` — dungeon layout + graph generation
- `index.ts`

**Owned by:** Team Terrain (terrain subpackage) + Team Foundations (road/chunk/dungeon).

**Imports from:** `core`, `content`, `biome`, `assets`.

---

### `src/composition/` — Layer 3

**Intent:** Deterministic scene composition — takes domain data + biome config, produces lists of "what to render where" for the scene layer.

**Subpackages:**
- `village/` — inhabited-gap filler for living towns
- `ruins/` — Thornfield's dead-town compositor
- `vegetation/` — per-biome foliage density + species
- `story-props/` — narrative detail placement
- `dungeon-kit/` — authored dungeon piece composer
- `index.ts`

**Owned by:** Team Composition.

**Imports from:** `core`, `content`, `biome`, `assets`, `world`.

**Contract:**
- Each compositor exports a single pure function: `composeVillage(config, seed): VillagePlacement[]`, `composeRuins(config, seed): RuinsPlacement[]`, etc.
- Output is a plain-data array of placements — position, rotation, scale, assetId, optional materialOverride. NO Three.js references in composition output.
- Consumers (`app/scene/`) render the placements.
- Determinism: same (config, seed) always produces same output. This is tested.

---

### `src/ecs/` — Layer 2

**Intent:** Koota traits, actions, hooks.

**Subpackages:**
- `world.ts` — Koota world singleton
- `traits/` — session state, gameplay traits
- `actions/` — action functions
- `hooks/` — React hooks backed by Koota queries
- `index.ts`

**Owned by:** Team Foundations.

**Imports from:** `core`, `content`.

---

### `src/combat/` — Layer 2

**Intent:** Combat resolver + VFX data.

**Subpackages:**
- `resolver.ts` — damage calculation, encounter resolution
- `vfx/` — SDF/MC VFX data (positions, timings, effect IDs) — renderer lives in `app/scene/combat/`
- `index.ts`

**Owned by:** Team VFX.

**Imports from:** `core`, `content`, `ecs`.

---

### `src/audio/` — Layer 2

**Intent:** Tone.js audio layers, ambient mixer, biome audio binding.

**Owned by:** Team Foundations (for Phase 0 — audio polish is out of scope).

**Imports from:** `core`, `content`, `biome`.

---

### `src/save/` — Layer 2

**Intent:** Save system, slot management, save payload serialization.

**Owned by:** Team Foundations.

**Imports from:** `core`, `content`, `ecs`, `platform`.

---

### `src/platform/` — Layer 2

**Intent:** Capacitor bridge — preferences, SQLite adapter, platform detection.

**Owned by:** Team Foundations.

**Imports from:** `core`.

---

### `src/benchmark/` — Layer 2

**Intent:** Phase 0 automated benchmark harness.

**Subpackages:**
- `routes.ts` — scripted route definitions
- `runner.tsx` — route replay component
- `capture.ts` — frame samplers, metric aggregation
- `report.ts` — JSON → markdown
- `index.ts`

**Owned by:** Team Benchmark.

**Imports from:** `core`, `ecs`.

---

### `src/debug/` — Layer 2

**Intent:** Dev-only tools. Compile-time gated by `import.meta.env.DEV`.

**Subpackages:**
- `spawn.ts` — debug spawn override (`?spawn=thornfield`)
- `live-fire.ts` — live-fire checklist helpers
- `index.ts`

**Owned by:** Team Benchmark.

**Imports from:** `core`, `ecs`, `save`, `biome`.

---

### `app/` — Layer 4

**Intent:** React/R3F render consumer. Every module in `app/` is a React component or R3F system that consumes `src/` packages.

**Subpackages:**
- `scene/environment/` — `<Environment>`, `<Sky>`, `<Stars>`, `<Clouds>`, `<Sparkles>`, IBL wiring
- `scene/terrain/` — heightmapped terrain renderer, splat-paint shader
- `scene/world/` — Chunk, OceanPlane, Foliage (instanced)
- `scene/entities/` — NPC, Monster, Relic
- `scene/combat/` — FPSViewmodel, CombatParticles, VFX hull meshes (consume `src/combat/vfx/` data)
- `scene/village/` — VillageRenderer (consumes `src/composition/village/` output)
- `scene/ruins/` — RuinsRenderer (consumes `src/composition/ruins/` output)
- `scene/dungeon/` — DungeonRenderer + dungeon-kit consumer
- `systems/` — useFrame-driven systems (PlayerController, ChunkManager, EncounterSystem, etc.)
- `postprocessing/` — biome-driven `<EffectComposer>` pipeline
- `views/` — full-screen UI views
- `components/` — shared UI primitives
- `App.tsx`, `Game.tsx`, `ErrorBoundary.tsx`, `main.tsx`

**Owned by:** Team Scene (scene subpackages), Team VFX (scene/combat + postprocessing), Team Composition (village/ruins renderers).

**Imports from:** Everything below it.

**Contract:**
- `app/` NEVER authors data. It only renders data provided by `src/` packages.
- `app/` may compose drei primitives freely.
- No React component in `app/` may modify `src/` package state; mutations go through action functions.

## Enforcement

### Barrel-only imports

Lint rule (biome / eslint-plugin-boundaries): `no-deep-imports` — prevents `import X from '@/biome/service'` style imports. All intra-src imports must use the barrel: `import { BiomeService } from '@/biome'`.

### Layer boundaries

`scripts/check-package-boundaries.ts` — runs on CI. Walks the import graph, fails if:
- A Layer-2 package imports from another Layer-2 package
- Any package imports from a package at a higher layer
- A file outside `src/<pkg>/` imports from `src/<pkg>/` without going through the barrel

### Package README requirement

Every package has a `README.md` stating:
- **Intent** — one sentence, what the package is for
- **Owner** — which team owns it
- **Imports from** — which packages it depends on
- **Exports** — the public surface (contents of `index.ts`)
- **Testing** — how to run this package's tests in isolation

No package without a README merges.

## Changing a package's public surface

To add/remove/rename a barrel export:
1. Open a PR that changes only the barrel — no consumer updates.
2. Tag the integration teammate as reviewer.
3. Once merged, consumers can update in parallel.

This makes barrel changes atomic and reversible. Never rename a public export in the same PR that updates all consumers — the change becomes un-reviewable.

## Adding a new package

1. Pick the layer.
2. Create `src/<pkg>/README.md` + `src/<pkg>/index.ts` (can be empty).
3. Register the package in `scripts/check-package-boundaries.ts` (add to layer map).
4. Register in `docs/architecture/TEAM_ASSIGNMENTS.md` (pick an owner).
5. Open a PR with just the scaffold. No implementation yet.
6. Once scaffold merges, implementation PRs can proceed.

This makes the structural change visible before the content change.
