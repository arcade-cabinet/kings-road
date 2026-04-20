---
title: Procedural Village Composition — Task Batch
updated: 2026-04-19
status: current
domain: technical
---

# Procedural Village Composition

Audit found (2026-04-19): village/town chunks currently pick from 7 `VARIANTS` + 8 `LANDMARK_VARIANTS` via hash (Building.tsx:26-48). Each chosen building is a **single monolithic authored GLB**. No modular wall/roof segments, no procedural facade composition, no rule-based assembly. This batch closes that gap.

## Priority: MEDIUM (after visual-fixtures batch completes)

## Non-goals

- Not replacing the authored GLBs — they become component vocabulary, not dead weight.
- Not building a Minecraft-style block system. We want recognizable real-world masonry, not uniform cubes.
- Not per-player dynamic generation. Seed-deterministic at content-compile time is fine; we cache per-town.

## Phases

### Phase A — vocabulary

**A1.** Inventory the existing authored GLBs by role: wall segments, roof pieces, door/window inserts, chimneys, foundations. Move sub-assets (Chimny, Door-1, Window-Full) out of `generated/village/*` into an `src/composition/village/parts/` catalog with metadata (size, attach points, material category).

**A2.** Author a minimal `BuildingPartSchema` (zod) — an entry describes a part's footprint, snap points (where it glues onto neighboring parts), and allowed-biome tint categories. Add fixtures (Phase B6 in visual-fixtures batch) for each part.

### Phase B — composer

**B1.** `composeBuilding(footprint, rng)` — given a rectangular footprint and RNG, return a placement list of wall/roof/door parts with positions. Start with rectangular single-story buildings only. Use snap points from A2.

**B2.** `composeTownLayout(townConfig, rng)` — given a town config (size, role list), return an array of footprints placed along the road + inner paths. Poisson-disk with door-facing-road rule.

**B3.** Wire into `Chunk.tsx`. TOWN chunks invoke `composeTownLayout` + `composeBuilding` for each footprint, then render each part via the existing GlbInstancer.

### Phase C — biome variants

**C1.** Material tint category per biome: Thornfield → weathered-stone + mossy-thatch. Normal village → warm honey-stone + clean-thatch. Add to biome JSON schema.

**C2.** Update GlbInstancer tint table to honor biome material category (not just path substring).

## Dependencies

- Visual-fixtures batch must complete first (A, B, C there) so the authored parts render correctly in isolation before we compose them.
- A1 blocks A2 blocks B1 blocks B2 blocks B3.
- C1+C2 parallel to B, can merge last.

## Acceptance criteria

- Running `spawn=thornfield` shows a town with ~8 buildings, each composed of 3-10 parts, no two alike.
- Running same seed produces identical layout (seed-determinism).
- Each building has a front door facing the road.
- `pnpm test:browser` passes the new fixture tests.
- Thornfield-specific biome tint category applied to the town's parts.

## Open questions

- How do we author snap points? JSON metadata next to the GLB, or sidecar `.snap.json`?
- Do we version-lock the 15 existing `Building*` variants as "legacy" or retire them? Legacy keeps visual familiarity; retiring simplifies the composer.
- Roof-over-walls height matching: do we rely on authored part dimensions, or bake a unit-height constraint at content-compile time?
