---
title: Architecture — Future Improvements Backlog
updated: 2026-04-18
status: current
domain: technical
---

# Future Improvements — Architecture Backlog

Non-blocking architectural improvements spotted during regular work. Each entry has enough context for a future maintainer (human or agent) to pick it up cleanly.

## 1. Replace string-literal chunk types with proper types + Koota queries

**Current state (brittle):**

Chunk-type classification is driven by string literals sprinkled across the rendering pipeline:

```ts
// app/scene/Chunk.tsx
if (type === 'TOWN' && !hasConfigTown) { ... }
else if (type === 'TOWN' && hasConfigTown) { ... }

// many sites in app/systems/ChunkManager.tsx, app/scene/Chunk.tsx
chunkData.type === 'TOWN'
chunkData.type === 'OCEAN'
chunkData.type === 'FOREST'
// etc.
```

Problems:
- No autocomplete. No compile-time guarantee that a `type === 'TONW'` typo will surface.
- No exhaustive-match discipline — adding a new chunk type means grepping for `'TOWN'` and hoping to find every check.
- No way to *query* entities by chunk type via Koota — the chunk type is a field on a plain-object, not a trait.
- Comparison logic repeats the same boolean combos (`type === 'TOWN' && hasConfig`, `type === 'TOWN' && !hasConfig`) across files — easy to drift.
- Content authors can type any string in JSON with no schema enforcement beyond a Zod `z.string()`.

**Target shape:**

A single `ChunkType` union + tag traits per type + helper queries:

```ts
// src/core/types/chunk-type.ts
export const CHUNK_TYPES = [
  'ocean',
  'coast',
  'meadow',
  'farmland',
  'forest',
  'deep_forest',
  'hills',
  'highland',
  'mountain',
  'moor',
  'swamp',
  'town',
  'dungeon',
] as const;
export type ChunkType = (typeof CHUNK_TYPES)[number];

// Zod refinement:
export const ChunkTypeSchema = z.enum(CHUNK_TYPES);
```

```ts
// src/ecs/traits/chunk.ts — tag traits so Koota can query by type
export const IsOceanChunk = trait();
export const IsTownChunk = trait(() => ({
  townId: '' as string,
  hasConfig: false,
}));
export const IsDungeonChunk = trait(() => ({ dungeonId: '' as string }));
// etc.
```

```ts
// Queries instead of string comparisons
const townChunks = world.query(Chunk, IsTownChunk);
const nonOceanChunks = world.query(Chunk).filter(c => !c.has(IsOceanChunk));
```

**Why this matters for the Thornfield Phase 0 work:**

The biome-as-root-config design maps naturally to biome traits on chunks. If we do this cleanly now, `BiomeService.getCurrentBiome(playerPos)` becomes `world.query(Chunk, Biome).where(...)` — no string lookups, trivially testable, discoverable in the ECS tree.

**Complementary improvements in the same pass:**

1. **Chunk streaming in Koota** — the `ChunkState` trait currently holds `activeChunks: Map<string, ChunkData>` plus `globalAABBs` + `globalInteractables`. Move each chunk to its own entity with Chunk + type traits; flat global lists become queries.
2. **Interactables** as entity traits, not an array in `ChunkState`. `world.query(Interactable)` replaces `getGlobalInteractables()`.
3. **AABBs** as `CollisionBox` traits on obstacle entities. Player controller queries nearby collision entities via spatial index instead of scanning a flat list.
4. **Declarative chunk generation rules** — `ChunkGeneratorRule` resources keyed by biome+type, instead of imperative `if (type === 'TOWN') { ... } else if (type === 'OCEAN') { ... }` blocks in `ChunkManager.generateChunkData()`.

**Scope estimate:** 2–3 days, team-parallelizable (types → traits → migration → cleanup).

**Depends on:** none. Could ship before Thornfield Phase 0, OR as part of the Phase 0 `src/core/types/` + `src/ecs/traits/` work.

**Acceptance:**
- `grep -r "type === 'TOWN'" app src` returns zero hits.
- `grep -r "chunkData.type ===" app src` returns zero hits.
- All chunk-type decisions go through typed traits or `ChunkType` union switches.
- A typo like `'TONW'` is a compile error.
- Adding a new chunk type forces the switch exhaustiveness checker to flag every call site.

---

## Adding to this file

- **Keep entries self-contained.** Someone picking up an entry 3 months from now shouldn't need to read a Slack thread to understand it.
- **Always include acceptance criteria.** "Done" must be unambiguous.
- **Always include scope estimate.** So priority choices are informed.
- **Remove entries when complete.** Don't leave ticked-off ghosts.
