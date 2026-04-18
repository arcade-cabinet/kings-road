---
title: Architecture — Future Improvements Backlog
updated: 2026-04-18
status: current
domain: technical
---

# Future Improvements — Architecture Backlog

Non-blocking architectural improvements spotted during regular work. Each entry has enough context for a future maintainer (human or agent) to pick it up cleanly.

## 1. Chunk-type string literals — migrate to tag traits + Koota queries

**Design context — two orthogonal dimensions:**

A "chunk type" in this codebase carries two independent pieces of information, which is easy to conflate and important not to:

1. **Role tag** — `ChunkRoleTag` in `src/types/game.ts`, values `'WILD' | 'TOWN' | 'DUNGEON' | 'ROAD'`. Answers "what *is* this chunk functionally?" — a named settlement, a dungeon entrance, a road tile, or generic wilderness. Drives gameplay decisions: `src/world/danger.ts` gives TOWN/ROAD tier 0 (safe), DUNGEON tier 4 (extreme), and everything else falls through to the region danger tier. `app/views/Gameplay/GameplayFrame.tsx` uses it to decide whether to show a "you have arrived" banner.
2. **Biome tag** — `ChunkType` in `@/core` (`src/core/types/chunk-type.ts`), values `'ocean' | 'coast' | 'meadow' | 'forest' | ...`. Answers "what terrain is under this chunk?" — drives terrain rendering, foliage, weather, audio, via `BiomeService.getCurrentBiome`.

Both coexist because they're genuinely different signals: a **road tile running through the moor** has `ChunkRoleTag === 'ROAD'` (safe, has arrival banner) AND `biome === 'moor'` (grey overcast sky, bog audio, no towns nearby). Collapsing them into one union loses information and was caught during PR #60 review — see the "ROAD → meadow would regress danger-tier lookup" discussion. Don't collapse them again.

**Current state (brittle):**

Both tags are plain string literals sprinkled across the rendering pipeline:

```ts
// app/scene/Chunk.tsx — role tag + biome string matching
if (type === 'TOWN' && !hasConfigTown) { ... }
chunkData.type === 'TOWN'   // role
tile.biome === 'forest'     // biome, stringly-typed in kingdom.schema
```

Problems:
- No autocomplete. No compile-time guarantee that a `'TONW'` typo will surface.
- No exhaustive-match discipline — adding a new role or biome means grepping for every call site.
- No way to *query* entities by role or biome via Koota — both are fields on plain-objects, not traits.
- Comparison logic repeats the same boolean combos across files — easy to drift.
- Content authors can type any string in JSON with no schema enforcement beyond `z.string()`.

**Target shape — dual tag traits + exhaustive types:**

```ts
// Already shipped (PR #57):
// src/core/types/chunk-type.ts
export const CHUNK_TYPES = [
  'ocean', 'coast', 'meadow', 'farmland', 'forest', 'deep_forest',
  'hills', 'highland', 'mountain', 'moor', 'swamp', 'town', 'dungeon',
] as const;
export type ChunkType = (typeof CHUNK_TYPES)[number];

// src/types/game.ts (post-PR #60 follow-up):
export type ChunkRoleTag = 'WILD' | 'TOWN' | 'DUNGEON' | 'ROAD';
```

```ts
// src/ecs/traits/chunk.ts — tag traits so Koota can query by either dimension
export const IsTownChunk = trait(() => ({ townId: '' as string, hasConfig: false }));
export const IsDungeonChunk = trait(() => ({ dungeonId: '' as string }));
export const IsRoadChunk = trait();
export const IsWildernessChunk = trait();

export const Biome = trait(() => ({ id: '' as BiomeId }));
// or per-biome tag traits: IsMeadowChunk, IsForestChunk, IsMoorChunk, ...
```

```ts
// Queries instead of string comparisons
const townChunks = world.query(Chunk, IsTownChunk);
const forestChunks = world.query(Chunk, Biome).where(({ id }) => id === 'forest');
```

**Complementary improvements in the same pass:**

1. **Chunk streaming in Koota** — the `ChunkState` trait currently holds `activeChunks: Map<string, ChunkData>` plus `globalAABBs` + `globalInteractables`. Move each chunk to its own entity with Chunk + role tag + biome tag; flat global lists become queries.
2. **Interactables** as entity traits, not an array in `ChunkState`. `world.query(Interactable)` replaces `getGlobalInteractables()`.
3. **AABBs** as `CollisionBox` traits on obstacle entities. Player controller queries nearby collision entities via spatial index instead of scanning a flat list.
4. **Declarative chunk generation rules** — `ChunkGeneratorRule` resources keyed by `(role, biome)`, instead of imperative `if (type === 'TOWN') { ... } else if (type === 'OCEAN') { ... }` blocks in `ChunkManager.generateChunkData()`.
5. **Session-save contract** — `ChunkData.type: ChunkRoleTag` in `src/types/game.ts` is what gets persisted. Any schema change here cascades into the save-state format; design the save-migration path before widening `ChunkData.type` or adding a sibling `ChunkData.biome` field.

**Scope estimate:** 2–3 days, team-parallelizable (types → traits → migration → cleanup), plus save-migration if `ChunkData` gains a biome field.

**Depends on:** foundational core + biome packages (PR #57, #60 — both merged).

**Acceptance:**
- `grep -r "type === 'TOWN'" app src` returns zero hits.
- `grep -r "chunkData.type ===" app src` returns zero hits.
- Role decisions go through `IsTownChunk`/`IsDungeonChunk`/... tag traits or `ChunkRoleTag` exhaustive switches.
- Biome decisions go through `Biome` trait queries or `ChunkType` exhaustive switches.
- A typo like `'TONW'` or biome `'meedow'` is a compile error.
- Adding a new role or biome forces switch-exhaustiveness to flag every call site.

---

## Adding to this file

- **Keep entries self-contained.** Someone picking up an entry 3 months from now shouldn't need to read a Slack thread to understand it.
- **Always include acceptance criteria.** "Done" must be unambiguous.
- **Always include scope estimate.** So priority choices are informed.
- **Remove entries when complete.** Don't leave ticked-off ghosts.
