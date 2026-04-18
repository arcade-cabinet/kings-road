---
title: Migrate Procedural Appearance to Authored Assets
updated: 2026-04-18
status: current
domain: context
---

# Migrate Procedural Appearance to Authored Assets

**Directive (2026-04-18):** Stop procedurally generating anything that can be authored.
Procedural generation is for LAYOUT (where things go, quest branching, pacing), NOT APPEARANCE
(meshes, textures, materials).

---

## Audit Findings

### Files Generating Appearance Procedurally

| File | LOC (at audit) | Generates | Consumers |
|------|----------------|-----------|-----------|
| `src/factories/chibi-generator.ts` | ~344 | Config struct (race, colors, proportions) used to drive geometry/texture downstream | `src/factories/npc-factory.ts` (imports `ChibiConfig` type, `generateTownNPC`) |
| `src/factories/face-texture.ts` | ~584 | Canvas-drawn face textures (`THREE.CanvasTexture`) — skin gradient, hair, eyes, mouth, facial hair via 2D canvas API | `src/factories/npc-factory.ts` (`generateFaceTexture`, `createChibiFaceTexture`) |
| `src/utils/textures.ts` | ~495 | Canvas-drawn tileable textures (plaster, stone\_block, thatch, wood, door, crate, window, road, grass, cobblestone) + material cache (`getMaterials`) + biome ground materials | No live game component imports found — only self-referential and benchmark usage |
| `src/utils/vegetation.ts` | ~339 | **Placement only** — scatter X/Y/Z positions for pine/oak/bush/grass/boulder/deadTree/heather per biome profile. No mesh or texture creation. | No live game component imports found (placement coordinates only) |
| `src/factories/building-factory.ts` | ~397 | **Geometry descriptors only** — wall/floor/stair/door/window bounding-box segments as plain data structs; no `THREE.Geometry`, no textures. Also exports `TILE_SIZE` constant reused by `world/town-layout.ts` and `utils/worldCoords.ts`. | `src/world/town-layout.ts` (TILE\_SIZE only); `src/utils/worldCoords.ts` (TILE\_SIZE only) |

### Verdict by File

- **`chibi-generator.ts`** — REPLACE. Generates a visual config that drives mesh selection and
  texture generation. Should be replaced with authored NPC variant tables in `content/npcs/`.
- **`face-texture.ts`** — REPLACE. Pure runtime canvas texture generation; every pixel is
  procedural. The villagers GLB (`public/assets/npcs/villagers.glb`, Villager NPCs pack) has
  4 male + 4 female texture variants baked and ready. 3DPSX chibi NPCs already in `public/assets/npcs/`
  cover knight, archer, merchant, ninja, student roles.
- **`textures.ts`** — REPLACE (texture generation); KEEP (material cache structure). The 10
  procedural texture types map directly to Polyhaven PBR sets (stone, wood, thatch, cobblestone,
  grass) and to PSX-style baked atlases from Fantasy Mega Pack. No live game component imports
  the module today — it is dead code in the render path, making migration low-risk.
- **`vegetation.ts`** — KEEP placement logic; REPLACE mesh references. The scatter placement
  function is pure layout (legal). The named mesh types (pineTrunk, pineLeaves, oakTrunk, oakLeaves,
  bush, boulder, deadTree, heather) currently imply procedural primitives in the renderer. These
  must be wired to the authored GLBs already in `public/assets/nature/` (tree01, tree07, tree15,
  bush01, bush05, rocks).
- **`building-factory.ts`** — KEEP collision/layout geometry; REPLACE visual rendering. The
  `generateBuildingGeometry` function outputs AABB descriptors used for collision and town layout
  — that is legitimate layout work. The building renderer consuming those descriptors assembles
  procedural box meshes with canvas textures. `Village_Buildings.glb` is already in
  `public/assets/buildings/` and covers the medieval house/tavern/shop archetypes.

### Existing Authored Asset Coverage

| Need | Available authored asset |
|------|--------------------------|
| Villager NPCs (4M + 4F, 14 anims) | `public/assets/npcs/villagers.glb` (Villager NPCs pack, P1) |
| Knight NPC (19 anims) | `public/assets/npcs/knight.glb` (Fantasy Mega Pack, P1) |
| Role chibi variants (archer, merchant, ninja, student) | `public/assets/npcs/archer.glb`, `merchant.glb`, `ninja.glb`, `student.glb` |
| Basemesh for face swaps | `public/assets/npcs/basemesh.glb` |
| Medieval buildings | `public/assets/buildings/Village_Buildings.glb` (15 meshes, P1) |
| Nature — trees, bushes | `public/assets/nature/tree01.glb`, `tree07.glb`, `tree15.glb`, `bush01.glb`, `bush05.glb` |
| Boulders/rocks | `public/assets/nature/rocks.glb` |
| Dungeon props (crates, barrels) | `public/assets/dungeon/Crates_and_barrels.glb` |
| Stone/wood/thatch textures (PBR) | Polyhaven via assets-library MCP (`stone_wall`, `rough_wood`, `thatch`) |
| Grass/ground textures (PBR) | Polyhaven via assets-library MCP (`grass_path`, `cobblestone`) |
| Monsters (lore-matched) | `public/assets/monsters/plague_doctor.glb`, `werewolf.glb`, `bloodwraith.glb`, `devil_demon.glb`, `Skeleton_warrior.glb`, `Bat.glb` |
| Weapons | `public/assets/items/Sword.glb`, `cleaver.glb`, `machete.glb`, `weapons_japanese.glb` |
| Loot props | `public/assets/items/Treasure.glb`, `bottles.glb`, `books.glb`, `traps.glb` |

Pending-integration packs that unlock remaining gaps:
- **Axe.zip / PSX-Knives.zip** — melee weapons, FBX→GLB conversion needed (P0)
- **HandsPack.zip** — FPS viewmodel hand rig, FBX→GLB conversion needed (P0)
- **PSX Horror-Fantasy Megapack.zip** — additional monsters (P1), filter horror-modern types
- **PSX MEGA Nature Pack** (inside Fantasy Mega Pack) — expanded trees/bushes/grass (P1)

---

## 5-Phase Migration Plan

### Phase 1 — Textures: Replace canvas-drawn materials with Polyhaven PBR (or baked atlases)

**Scope:** `src/utils/textures.ts` — all 10 `createProceduralTexture` variants and the
`getMaterials` cache.

**Work:**
1. Download Polyhaven textures via `assets-library` MCP: `stone_wall`, `rough_wood`, `thatch`,
   `cobblestone`, `grass_path`, `dirt_path` (base color + roughness maps; 512px or 1K).
   Place in `public/assets/textures/`.
2. Rewrite `getMaterials()` to load authored texture files via `THREE.TextureLoader` instead of
   calling `createProceduralTexture`.
3. For PSX-style biome ground materials, use flat `MeshToonMaterial` with baked palette colors
   drawn from the design palette in `docs/DESIGN.md` — no canvas required.
4. Delete `createProceduralTexture`. Keep `getMaterials`, `getBiomeGroundMaterial`,
   `updateWindowEmissive` as the public API.

**Acceptance criteria:**
- Zero calls to `createProceduralTexture` remain in production code.
- Visual regression test (Playwright screenshot) shows textured buildings in town chunk.
- `pnpm tsc --noEmit` passes.

**Risk:** Low. No live game component currently imports `textures.ts` (confirmed by grep). The
module is dead code in the render path. Breaking changes affect only the material cache shape.

---

### Phase 2 — Vegetation: Wire GLB assets to the scatter placement system

**Scope:** `src/utils/vegetation.ts` (placement stays); any chunk renderer that instantiates
vegetation geometry from the placement output.

**Work:**
1. Audit chunk renderer(s) that consume `PlacedVegetation` and currently use procedural box/sphere
   primitives for tree/bush/boulder meshes.
2. Load each authored GLB once via `useGLTF` and extract the `BufferGeometry` and `Material`
   from the relevant mesh node (e.g. `gltf.nodes['Tree_Pine'].geometry`). Do not use
   `scene.clone()` for instanced types — cloning an entire GLTF hierarchy per instance defeats
   the purpose of instancing and will fail the 2 ms frame budget at 65+ instances per chunk.
   (`<primitive object={gltf.scene.clone()} />` is acceptable only for one-off non-instanced
   objects such as interactive prop dressing.)
3. Map placement types to GLBs: `pineTrunk+pineLeaves` → `tree15.glb` (conical);
   `oakTrunk+oakLeaves` → `tree01.glb` or `tree07.glb`; `bush` → `bush01.glb` / `bush05.glb`;
   `boulder` → `rocks.glb`; `deadTree` → `tree07.glb` (dead variant or greyscale material
   override); `heather` → `bush01.glb` scaled flat with purple tint until a dedicated asset
   is sourced from PSX MEGA Nature Pack.
4. Upgrade `placeVegetation` output to include a `meshKey` field so the renderer can select
   the right GLB without re-implementing the biome logic.
5. Build one `THREE.InstancedMesh` per vegetation type using the extracted `BufferGeometry`
   and `Material`. Set instance matrices from `PlacedVegetation` positions/rotations/scales.
   A single `InstancedMesh` per type reduces draw calls to O(types) instead of O(instances).

**Acceptance criteria:**
- World chunks render authored tree/bush/rock GLBs at procedurally-placed positions.
- No `THREE.CylinderGeometry`, `THREE.SphereGeometry`, or `THREE.ConeGeometry` used for
  vegetation rendering.
- Frame budget for a full chunk (worst-case deep\_forest: 65 instances) stays under 2 ms
  measured via Chrome DevTools performance trace.

**Risk:** Medium. Chunk renderer refactor is a hot-path change; InstancedMesh setup requires
extracting `BufferGeometry` and `Material` from the GLB node before building the instanced
mesh — the GLTF scene hierarchy cannot be passed directly to `InstancedMesh`. Must test on
mobile (iOS Safari / Android Chrome) for GPU budget.

---

### Phase 3 — NPC faces: Replace canvas-drawn face textures with authored texture variants

**Scope:** `src/factories/face-texture.ts` (delete); `src/factories/npc-factory.ts` (update
to use authored texture variants).

**Work:**
1. `villagers.glb` already embeds 8 texture variants (4M + 4F). Expose these by mesh/material
   name — no new texture files needed for villager roles.
2. For role-specific NPCs (guard, merchant, priest, blacksmith, bard), map to the existing
   chibi GLB variants in `public/assets/npcs/` by archetype:
   - guard → `knight.glb`
   - merchant → `merchant.glb`
   - bard → `ninja.glb` (closest stylistically until a dedicated bard asset is sourced)
   - blacksmith → `basemesh.glb` with a forge-apron texture swap
   - priest → `student.glb` (robe silhouette)
3. Author a `content/npcs/npc-appearance-map.json` that maps `{ role, variant }` → `{ glbPath,
   meshName, textureVariant }`. Validate against a new Zod schema.
4. Update `npc-factory.ts` to read the appearance map from the content DB instead of calling
   `generateFaceTexture`.
5. Delete `face-texture.ts`.

**Acceptance criteria:**
- `generateFaceTexture` and `createChibiFaceTexture` are gone from the codebase.
- All NPC roles render using authored GLB + baked texture — no `CanvasTexture` in NPC path.
- `npx tsx scripts/validate-content.ts` passes with the new appearance-map schema.

**Risk:** High. This is the most coupled system — `npc-factory.ts` is on the runtime NPC
spawn path. The appearance map introduces a new content dependency that must be present in
`game.db` before NPCs can render. Requires schema addition + DB migration + content authoring
in a single coordinated pass. Must coordinate with any in-flight Koota migration work that
touches NPC traits.

---

### Phase 4 — Chibi config: Replace procedural config generator with authored NPC definitions

**Scope:** `src/factories/chibi-generator.ts` (delete `generateChibiFromSeed`,
`generateTownNPC`); `content/npcs/` (extend existing authored NPC JSON).

**Work:**
1. For **named NPCs** (already in `content/npcs/`): appearance is already authored — just ensure
   the content schema includes the `glbPath` + `textureVariant` fields added in Phase 3.
2. For **ambient townspeople** (anonymous villagers): remove `generateTownNPC`. Replace with a
   weighted random pick from `npc-appearance-map.json` variants at spawn time. The RNG seed
   for variant selection can still be derived from position — only the visual output comes from
   authored assets, not from procedural color/proportion generation.
3. Remove `SKIN_PALETTES`, `HAIR_PALETTES`, `EYE_PALETTES`, `PRIMARY_DYES`, `ACCENT_METALS`
   color arrays — these are superseded by authored texture atlases.
4. Keep `hashString` utility (used for seeded selection) and `NPCRole` type if still needed
   by ECS traits. Move both to `src/utils/rng.ts`.
5. Delete `chibi-generator.ts`.

**Acceptance criteria:**
- No procedural color palette arrays remain in the codebase.
- `generateChibiFromSeed` and `generateTownNPC` are gone.
- Towns spawn ambient NPCs using authored GLB variants with seeded variant selection.
- Benchmark (`src/benchmarks/factories.bench.ts`) updated to reflect new spawn path.

**Risk:** Medium. The chibi config struct (`ChibiConfig`) may still be referenced by ECS traits
(Koota) or Zustand stores — audit those before deleting. The benchmark file will need updating.
`hashString` is independently useful and must not be lost.

---

### Phase 5 — Buildings: Replace box-mesh assembly with authored Village\_Buildings GLB

**Scope:** Any chunk/town renderer that uses `generateBuildingGeometry` output to create
`THREE.BoxGeometry` meshes; `src/factories/building-factory.ts` (reduce to collision/layout
data only).

**Work:**
1. Audit the town/chunk renderer (likely in `src/world/` or a game component) that turns
   `WallSegment[]` + `FloorPlate[]` into rendered meshes. Replace that geometry assembly with
   `useGLTF('assets/buildings/Village_Buildings.glb')` and pose individual mesh nodes from
   the GLB at the positions derived from `generateBuildingGeometry`.
2. `Village_Buildings.glb` contains 15 meshes (houses, roofs, doors, windows). Map archetype
   types to named GLB nodes: `house_small` → `House_Small` node, `tavern` → `Tavern` node, etc.
3. Retain `generateBuildingGeometry` for collision AABB and stair generation — these are
   layout, not appearance.
4. Retire `generateWallSegments`, `generateFloorPlates`, `generateStairs` from the visual
   render path; keep them for collision system use only.
5. Separate `TILE_SIZE` constant into `src/utils/worldCoords.ts` directly (it already re-exports
   it from there) and remove the building-factory dependency from non-rendering importers.

**Acceptance criteria:**
- Town chunks render using `Village_Buildings.glb` nodes, not assembled box geometries.
- No `THREE.BoxGeometry` in the town building renderer.
- Collision AABB generation still passes existing town-layout tests.
- Canvas-drawn building textures (plaster, stone\_block, thatch — completed in Phase 1) are
  no longer referenced in the building render path.

**Risk:** Medium-low. `building-factory.ts` is already pure data (no THREE imports). The risk
is in the renderer side — finding and rewriting the box-mesh assembly code that consumes
`WallSegment[]`. The GLB node naming may not match archetype IDs exactly; a mapping table
in `content/` may be needed.

---

## Summary

| Phase | One-line | Risk |
|-------|----------|------|
| 1 | Replace canvas textures with Polyhaven PBR files | Low |
| 2 | Wire authored nature GLBs to vegetation scatter placement | Medium |
| 3 | Replace canvas face textures with villager GLB texture variants | High |
| 4 | Replace procedural chibi config generator with authored NPC appearance map | Medium |
| 5 | Replace box-mesh building assembly with Village\_Buildings GLB nodes | Medium-low |

**Biggest migration risk: Phase 3.** `face-texture.ts` is a 584-LOC runtime canvas renderer
called on every NPC spawn. Replacing it requires a new content schema, DB migration, and
coordinated GLB texture variant mapping — all of which must land atomically or NPCs will
silently render nothing. This phase must be coordinated with any active Koota migration work
that touches NPC entity traits.
