---
title: CLAUDE.md
updated: 2026-04-09
status: current
domain: technical
---

# CLAUDE.md

Project-specific guidance for Claude Code sessions on King's Road.

## Commands

```bash
pnpm dev                    # Dev server at localhost:5173 (Expo web)
pnpm build                  # Production build (expo export --platform web)
pnpm test                   # Run all Vitest unit tests
pnpm test -- src/schemas/   # Run tests in a specific directory
pnpm test:watch             # Watch mode
pnpm test:coverage          # Coverage report (80% thresholds)
pnpm test:e2e               # Playwright e2e tests
pnpm test:ct                # Playwright component tests
pnpm test:all               # Coverage + CT + e2e
pnpm tsc --noEmit           # Full TypeScript check
pnpm tscgo --noEmit         # Fast TypeScript check (native compiler)
npx tsx scripts/validate-content.ts  # Validate JSON content against Zod schemas
npx tsx scripts/compile-content-db.ts  # Compile content JSON into SQLite DB
pnpm exec biome check .     # Lint and format check
```

## Architecture

```
Zod Schemas (src/schemas/) --> JSON Content (content/) --> SQLite DB (src/db/) --> ECS (src/ecs/) --> R3F Rendering (src/game/)
```

All game content is JSON validated against Zod schemas. A build script compiles content into a SQLite database via Drizzle ORM. Koota ECS consumes config at runtime. React Three Fiber renders the ECS world.

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/schemas/` | Zod schemas for all content types (world, quest, NPC, feature, item, building, monster, dungeon, town, weather, dialogue, skill-tree) |
| `src/ecs/` | Koota ECS world, traits (Position, Health, QuestLog, etc.), and actions |
| `src/db/` | Drizzle ORM schema, SQLite content DB loader, save service |
| `src/game/components/` | R3F 3D components and `ui/` overlay components |
| `src/game/systems/` | Game logic: PlayerController, ChunkManager, QuestSystem, EncounterSystem, etc. |
| `src/game/world/` | Road spine, pacing engine, dungeon generator, town layout, kingdom gen |
| `src/game/factories/` | Building, NPC, monster, chibi-generator factories |
| `src/game/stores/` | Zustand stores (game, world, quest, combat, inventory, settings) |
| `src/game/audio/` | Ambient mixer, audio layer factory |
| `content/` | JSON content trove — quests, NPCs, features, towns, monsters, dungeons |
| `scripts/` | Build and validation scripts |

## Content Pipeline

1. Author JSON in `content/` following schemas in `src/schemas/`
2. Validate: `npx tsx scripts/validate-content.ts`
3. Compile DB: `npx tsx scripts/compile-content-db.ts` (runs automatically on `pnpm dev` and `pnpm build`)
4. See `content/CONTRIBUTING.md` for tone guide and authoring rules

Quest tiers: `macro` (1-2h, must branch), `meso` (15-45min, must branch), `micro` (5-15min, linear ok).

## Code Conventions

- **Biome** for formatting and linting (not Prettier/ESLint)
- **Single quotes**, semicolons always, 2-space indent
- **Koota traits** for new game state (not Zustand)
- **`useFrame`** for game logic, never `setInterval`/`setTimeout`
- **`THREE.InstancedMesh`** for repeated geometry, never individual meshes
- **Zod `z.infer<typeof Schema>`** for TypeScript types derived from schemas
- Core game types live in `src/game/types.ts`
- Do not store Three.js objects in React state (use refs)
- Do not create new React context providers (use Koota or Zustand)
- Do not put content JSON in `src/` (it belongs in `content/`)
- Max 300 LOC per file

## Mood

Pastoral, romanticized medieval English. Warm cream backgrounds (#f5f0e8), golden sunlight, honey limestone, lush meadows. Lora serif for display, Crimson Text for body. Holy Grail narrative. No grimdark. See `docs/DESIGN.md` for full palette.

## Road Spine

The world is organized along a 1D road from Ashford (distance 0) to Grailsend (distance 28000). Six anchor points define the main quest chapters. The pacing engine in `src/game/world/pacing-engine.ts` generates deterministic feature placements. See `content/world/road-spine.json`.

## Save System

Game saves use SQLite (expo-sqlite) with Drizzle ORM. Two layers:
- **Content tables**: read-only, populated by `scripts/compile-content-db.ts` at build time
- **Save state tables**: read-write at runtime (save slots, player state, quest progress, inventory, chunk deltas)
