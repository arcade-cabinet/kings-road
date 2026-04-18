---
title: Thornfield Proof-Biome + Benchmark Harness (Phase 0 Stack Decision)
updated: 2026-04-18
status: current
domain: technical
---

# Thornfield Proof-Biome + Benchmark Harness

*Phase 0 of the King's Road polish push. One hero biome built to full fidelity in R3F. Automated benchmark + live-fire playtest on a real phone. Decision doc at the end: stay in R3F, or port to Godot.*

## The question this answers

> "Can the current stack (Vite + React 19 + R3F + Koota + Capacitor) hit a 30fps floor on a mid-range phone while rendering the full visual-polish target — full PBR, HDRI IBL, heightmapped terrain, composed villages, volumetric fog, SDF combat VFX — OR do we need to port to Godot?"

We answer it with **numbers**, not conjecture. Two measurement instruments, both mandatory.

## Non-goals

- This is **not** a commitment to R3F. It is also **not** a commitment to Godot.
- Nothing is ported yet. Nothing is refactored engine-level.
- We do **not** build other biomes. Only Thornfield. Other biomes keep their current rendering until the decision lands.
- We do **not** write any Godot code in Phase 0.
- This is **not** a polish pass. It is a measurement pass that produces polish-quality output in one location.

## Design principles (locked from brainstorm)

0. **Biome is the root config.** All downstream visual/audio/gameplay behavior derives from biome JSON.
1. **Plays well on the target device, always.** 30fps floor on a mid-range phone is non-negotiable. SDF/raymarched effects bounded to hull meshes; never full-screen. `<AdaptiveDpr>` + `<PerformanceMonitor>` auto-degrade under load.
2. **Use drei's scene-composition ecosystem first.** `<Environment>`, `<ContactShadows>`, `<AccumulativeShadows>`, `<SoftShadows>`, `<Sparkles>`, `<PerformanceMonitor>`, `<AdaptiveDpr>`, `<CameraShake>` before writing custom.
3. **No flat colors on player-visible solid geometry.** Every surface uses a full PBR material (Color + Normal + Roughness + Displacement-where-meaningful + AO-where-present). Chosen by *tactile identity* — hard/cold, hard/warm, soft, metallic, furry, wet, brittle.
4. **Structural primitives are fine; bare ones are not.** Primitive armature (stairs, foundations, wall segments) is acceptable if every player-facing surface carries authored detail.
5. **Every surface tells a story.** Wear, tools, laundry, meals, light, noise, scratches, initials, offerings, graves, broken objects. "Empty ground" is a failure condition.
6. **Procedural drives composition, authored drives appearance.** Town layouts, dungeon graphs, vegetation placement, weather transitions — procedural. Every pixel of every surface — authored.

## Why Thornfield

Thornfield Ruins is the **worst-case biome**: it exercises every system at once.

| Visual demand | Why Thornfield exercises it |
|---|---|
| Dense vegetation | Dead forest — heavy foliage kit variation |
| Authored ruins architecture | Overgrown stone ruins, collapsed walls, graves |
| Volumetric fog | Cold dawn fog is part of the biome identity |
| Complex combat | Skeleton Warrior archetype (17 animation clips, most complex rig) |
| Dungeon at the anchor | Thornfield has a dungeon entrance within the chunk |
| Hero-shot materials | Wet stone, mossy cobble, rusted iron — all PBR-stressed |
| Cold lighting + post-processing | Distinct LUT, god-rays, chromatic aberration |
| Story density | Cairns, graves, rusted swords, carved initials, offerings — the "inhabited by the dead" compositor target |

If Thornfield hits 30fps floor on the phone, everywhere else will too. If Thornfield struggles, the answer is honest.

## In scope

### Biome plumbing

- `BiomeService` — resolves current biome from player position along the road spine.
- `biome.schema.ts` Zod schema covering: lighting (HDRI + tints + fog), terrain (heightmap + materials), foliage (density + species), weather (states + transitions), particles (Sparkles configs), audio (ambient + music + footsteps), playerModifiers (stamina/speed), monsterPool, npcWardrobe.
- `biome/data/thornfield.json` — complete biome config for the proof biome.

### Asset plumbing

- `assets/pbr/` — PBR loader `loadPbrMaterial('mossy-stone-001')` returns `MeshStandardMaterial` with Color + Normal + Roughness + Displacement.
- `assets/pbr/palette.ts` — curated tactile palette: 15 Thornfield materials named by tactile identity (`mossy-stone`, `wet-bark`, `fallen-leaves`, `ivy-ground`, `grave-moss`, `dead-grass`, `packed-mud`, `lichen-stone`, `wet-cobblestone`, `weathered-oak`, `rusted-iron`, `bleached-bone`, `grave-cloth-linen`, `black-ironwork`, `thornfield-cairn-stone`).
- `assets/hdri/` — HDRI loader. 3 Thornfield HDRIs curated (cold-dawn, overcast-noon, fog-dusk).
- Ingestion script: `scripts/ingest-pbr.ts` + `scripts/ingest-hdri.ts` — copies from `/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/` and `/HDRI/1K/` to `public/` with consistent naming.

### Terrain

- `world/terrain/` — heightmap loader (reads an EXR/image), generates displaced `BufferGeometry` per chunk.
- `app/scene/terrain/` — renders the heightmapped chunk with splat-painted biome materials (multi-material blend shader).
- Thornfield uses `Terrain003` heightmap with cold-autumn splat weights.

### Composition (deterministic, seeded)

- `composition/village/` — inhabited-gap filler for living towns (used by all other biomes later; we build the machinery here even though Thornfield uses the ruins variant).
- `composition/ruins/` — Thornfield-specific: fallen walls, overgrown market stalls, broken wells, scattered graves, bones, collapsed roof-beams.
- `composition/vegetation/` — reads `biome.foliage`, places instanced trees/bushes/ground-cover via PSX MEGA Nature pack + existing nature assets. Thornfield palette: gnarled dead oak, hawthorn, thorn bushes, ivy, nettle, lone fern.
- `composition/story-props/` — narrative placement. 7-10 props along the Thornfield segment of road + inside the village: a cairn with a carved name, a rusted sword in a tree stump, initials carved in a fence post, flowers at a grave, a child's abandoned toy, scratched tally marks on a wall.
- `composition/dungeon-kit/` — composes authored dungeon pieces into room layouts. Replaces the primitive-box wall rendering in `DungeonRenderer`.

### Scene layer (R3F)

- `app/scene/environment/` — `<Environment>` IBL wired to biome HDRI. `<Sky>` kept for atmospheric dome. `<ContactShadows>` under characters. `<AccumulativeShadows>` baked for static ruins geometry. `<Sparkles>` for drifting ash/dust per biome config.
- `app/scene/village/` — consumes composition output, renders with drei primitives.
- `app/scene/dungeon/` — authored dungeon kit replaces the 6 primitive-box walls in `DungeonRenderer.tsx`. `<AccumulativeShadows>` baked.
- `app/postprocessing/` — biome-driven `<EffectComposer>` pipeline: ACES tone-mapping, LUT, bloom, god-rays (dawn/dusk), chromatic aberration, noise/grain, volumetric fog (bounded SDF raymarch shader).

### Combat VFX (minimum viable proof)

- `combat/vfx/` + `app/scene/combat/` — three concrete effects to prove the pipeline:
  - **Impact deformer**: local SDF sphere injected at contact point. 0.3s wound-cavity deformation, restores.
  - **Blood metaballs**: N=16 point-masses with gravity, raymarched isosurface. Used on skeleton hit.
  - **Wraith SDF body**: raymarched isosurface on a bounded hull mesh. Drifts, dissipates near edges. Proof that volumetric enemies are viable.
- Marching cubes **deferred** for Phase 0 unless we can land GPU compute on WebGPU path; otherwise raymarched-SDF fallback. Documented not shipped.

### Drei scene-composition primitives adopted

- `<Environment>` — IBL from biome HDRI.
- `<ContactShadows>` — under NPCs, monsters, story props.
- `<AccumulativeShadows>` + `<RandomizedLight>` — bake static Thornfield ruins shadows once.
- `<SoftShadows>` (PCSS) — upgrade the sun shadow.
- `<Sparkles>` — biome ambient particles (drifting ash, pollen, fog wisps, dust motes per biome spec).
- `<PerformanceMonitor>` — continuous fps monitor; callbacks adjust DPR.
- `<AdaptiveDpr>` — auto-scale DPR 1.5 → 1.0 → 0.75 under load.
- `<AdaptiveEvents>` — pause raycasting under low fps.
- `<BakeShadows>` — static geometry shadow bake.
- `<CameraShake>` — combat hit punch.

### Benchmark harness

- `src/benchmark/routes.ts` — 4 scripted routes through Thornfield:
  - `walk-village-perimeter` — 60s walk around the ruined village edge.
  - `enter-dungeon-first-skeleton` — walk to dungeon, enter, engage one skeleton.
  - `sprint-through-fog-in-rain` — sprint stress test with weather active.
  - `combat-3-enemies-hero-shot` — combat against 3 simultaneous enemies in a hero-framed camera.
- `src/benchmark/runner.tsx` — React component. Reads `?bench=route-id` from URL. Replays route with scripted input. Samples every frame: fps (rolling + p1/p5 lows), frameTime (ms + peaks), drawCalls, triangles, geometries, textures, JS heap, thermal hints.
- `src/benchmark/capture.ts` — metric aggregator. On route completion, builds JSON.
- Export path: JSON file downloaded via Blob URL on the running device. On mobile, AirDrop / share back to Mac.
- `src/benchmark/report.ts` — JSON → markdown report with summary tables.
- Playwright integration: `e2e/benchmark.spec.ts` runs all routes in headless Chrome on CI against web build. Baseline numbers committed; regression alerts.

### Debug spawn override

- `src/debug/spawn.ts` — reads `?spawn=<biome>` URL param or `VITE_DEBUG_SPAWN` env var.
- When `?spawn=thornfield`: bypass main menu, skip intro, create a dev save with Thornfield starting position, hand the player starter inventory (iron_sword + 3 health_potion + torch), activate a single quest pointing at the Thornfield dungeon, load the game.
- Production builds ignore this (compile-time gated by `import.meta.env.DEV`).

### Live-fire playtest checklist

`docs/benchmarks/live-fire-checklist.md` — markdown checklist for the phone session:

- Movement responsive vs laggy (1-10)
- World feels inhabited vs empty (1-10)
- Combat hits feel satisfying vs weightless (1-10)
- Visual moments that felt wrong (free-form)
- Phone thermal state after 10min (cold / warm / hot / throttling)
- Frame hitches at specific moments (list)
- Overall gut feel — want to keep playing (1-10)
- Free-form notes

### Decision document template

`docs/benchmarks/thornfield-phase-0-YYYY-MM-DD.md` (skeleton written now, filled in after measurement):

- Automated benchmark numbers (per route, per device)
- Live-fire checklist results
- Interpretation
- **Verdict**: Stay R3F / Port to Godot, with rationale
- If Stay: polish roadmap for remaining 5 biomes.
- If Port: port plan including what content ports 1:1 (all JSON), what systems rewrite (rendering, ECS, physics bridge).

## Out of scope

- Other 5 biomes — stay as-is until verdict
- Godot scaffold or code — comes only if verdict says port
- Rest of polish roadmap (combat feel tuning, UI polish, first-90-seconds, trailer-ready) — waits for verdict
- New quests, new combat mechanics, new content
- Save slot picker UI, skill tree wiring, audio ducking
- Winter biome — proof of biome composability **deferred to post-verdict** polish pass

## Decision boundary

| Benchmark (phone) | Live-fire (phone) | Verdict |
|---|---|---|
| ≥ 60fps sustained, p1-low ≥ 45, no thermal throttle | Feels great (≥8/10) | **Stay R3F.** Full speed ahead on remaining biomes. |
| 45-60fps avg, p1-low ≥ 30, occasional DPR drops | Feels OK (6-8/10) | **Stay R3F.** Scope polish carefully, budget per-biome. |
| 30-45fps, DPR drops often | Feels laggy (4-6/10) | **Marginal — port to Godot.** R3F ceiling is too close. |
| < 30fps sustained OR thermal throttle within 10min OR GC stalls visible | Feels bad (<4/10) | **Port to Godot.** Bet the farm. |
| Any benchmark + "feels great" mismatch | — | Investigate first — may be a design problem, not a perf problem. |

## Success criteria

- `biome.schema.ts` validates `thornfield.json` cleanly.
- `BiomeService.getCurrentBiome(playerPos)` returns Thornfield for positions in the Thornfield road segment.
- `loadPbrMaterial('mossy-stone-001')` returns a fully-configured `MeshStandardMaterial`.
- `<Environment>` visibly lights the player's equipped metal weapon (reflection of cold-autumn sky).
- Thornfield terrain is heightmapped — player visibly climbs/descends.
- Thornfield has ≥ 15 composed authored props visible from the village center.
- No `color="#xxx"` on player-visible solid geometry in Thornfield.
- DungeonRenderer in Thornfield uses authored dungeon kit — no primitive-box walls.
- Volumetric fog visible in Thornfield; volumetric fog NOT visible in other biomes (proof it's biome-driven).
- At least one combat swing against a skeleton produces: hit-stop, camera shake, SDF impact deformer on the skeleton, blood metaball spurt.
- Benchmark harness runs all 4 routes end-to-end on phone and Mac.
- Benchmark JSON committed alongside phone screenshot and live-fire checklist to `docs/benchmarks/thornfield-phase-0-<date>.md`.
- Playwright benchmark step green in CI.
- Decision document filled in with verdict + rationale.

## Duration estimate

6-8 working days, team-parallelized:

- Days 1-2: Foundation (biome schema, BiomeService, PBR loader, HDRI loader, debug spawn)
- Days 2-4: Composition layer (village/ruins/vegetation/story-props/dungeon-kit compositors, in parallel)
- Days 3-5: Scene layer (Environment wiring, terrain renderer, dungeon kit consumer, post-processing pipeline, combat VFX)
- Days 4-6: Benchmark harness (routes + runner + capture + export + Playwright)
- Days 6-7: Integration (merge, reconcile, polish pass on Thornfield specifically)
- Day 8: Measurement — phone benchmark + live-fire + Mac benchmark + decision doc

## Team parallelization

See `docs/architecture/PACKAGE_LAYOUT.md` for the package contract and `docs/architecture/TEAM_ASSIGNMENTS.md` for role assignments.
