---
title: Visual Fixture Harness — Task Batch
updated: 2026-04-19
status: current
domain: technical
---

# Visual Fixture Harness

Prove each authored asset works in isolation before trusting it in the full scene. Catch broken materials, missing PBR maps, wrong scale, broken pivots BEFORE they reach biome rendering.

## Priority: HIGH (prerequisite to benchmarking task #22)

## Phases

### Phase A — foundation (must work before anything else)

**A1.** Pin down Vitest browser-mode cold-start. Current symptom: 10+ min hang on first run with `optimizeDeps.force: true`. Either fix the config or accept a slower CI lane. Completion = `pnpm test:browser` completes in < 90 s on warm cache.

**A2.** Minimal `FixtureStage` proving a R3F Canvas renders inside Vitest browser + `page.screenshot()` captures the visible pixels. No HDRI, no OrbitControls, no Grid — just `<Canvas><mesh><boxGeometry/><meshStandardMaterial/></mesh></Canvas>`. Test file: `app/__tests__/fixtures/smoke.fixture.test.tsx`. Completion = PNG artifact on disk showing a lit cube.

### Phase B — asset categories (one test file per category, built in order)

Each Phase-B test mounts every variant of its category in FixtureStage, asserts no-throw, and saves one PNG per variant. Order is least-complex → most-complex so broken infrastructure surfaces early.

**B1.** Weapons. 70+ authored weapons under `app/scene/generated/weapons-*/`. Smallest, simplest geometry. Single mesh each. Tests PBR map presence + mesh extraction path.

**B2.** Ruins. 20+ authored GLBs under `public/assets/ruins/`. Static mesh + basic material. Tests asset-load path + per-asset scale detection.

**B3.** Buildings. 15 authored Variants + LANDMARK_VARIANTS. Multi-mesh authored scenes. Tests material count, door/window sub-meshes, chimney attachment.

**B4.** Vegetation (GlbInstancer path). Every `FOLIAGE_CATALOG` entry. Tests the per-instance HSV jitter + path-based tint rules together. (Must mount via GlbInstancer, NOT raw GLB, to exercise the tint logic.)

**B5.** NPCs. Every wardrobe entry (`villager`, `guard`, `ragged-peasant`, `rusted-iron-armor`). Skinned mesh tests — needs `SkeletonUtils.clone`. Tests rig integrity.

**B6.** FPS viewmodel. Each `HandPose` × each weapon category, to prove pose transforms are correct and hand+weapon compose without z-fighting or bad offsets.

### Phase C — composition fixtures (multi-asset scenes)

**C1.** Ruins compose test. Mount `composeRuins()` output for one TownConfig in a fixed area, screenshot — assert spatial layout isn't mangled, no z-fighting, Poisson-disk spacing holds.

**C2.** Vegetation compose test. Same idea for `composeVegetation()`.

**C3.** Splat terrain patch. Single heightmap chunk + 4-material splat — prove splat blend shader compiles and all 4 textures show proportionally.

### Phase D — CI artifacts

**D1.** Upload `__screenshots__/` dir as workflow artifact in `ci.yml` so every PR produces a downloadable zip of fixture renders.

**D2.** Post-merge baseline: the `main` branch's artifact becomes the reference image for future diff testing (Phase E, separate batch).

## Non-goals (explicitly out of scope)

- Pixel-diff snapshot testing (flaky across GPUs). That's a later batch after the asset catalog is well-inspected.
- Fixture tests for already-React-only DOM components (LoadingOverlay, etc.). Those have unit tests.
- Full scene composition tests. The full scene has biome interactions and is better tested via the Pages deploy + manual playtest.

## Dependencies

- A1 blocks everything.
- A2 blocks all of B.
- B1 is a prerequisite for B6 (viewmodel needs a weapon to mount).
- B2, B3, B4, B5 are independent — can parallelize after A2.
- C1 needs B2; C2 needs B4.

## Acceptance criteria (global)

- `pnpm test:browser` passes with all fixture tests enabled.
- Every authored asset in the repo is referenced by at least one fixture test.
- Running the suite produces a `__screenshots__/` tree organized by category.
- CI uploads those screenshots as a downloadable artifact per PR.
- Each test completes in < 3 s of wall-time (after warm cache).

## Open questions

- What's the actual Vitest browser-mode cold-start fix? The repeated hangs suggest `optimizeDeps.force: true` is the smoking gun. Worth trying `force: false` with a committed lockfile-derived pre-bundle.
- Screenshot diff-checking: do we want `expect(screenshot).toMatchImageSnapshot()` per variant, or is "it rendered without throwing" enough for Phase B? Recommend starting with the latter and adding diff-check in Phase E.
