# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                    # Dev server at localhost:5173
pnpm build                  # Production build
pnpm test                   # Run all Vitest unit tests
pnpm test -- src/schemas/   # Run tests in a specific directory
pnpm test:watch             # Watch mode
pnpm test:coverage          # Coverage report
pnpm test:e2e               # Playwright e2e tests (requires build first)
pnpm tsc --noEmit           # Full TypeScript check
pnpm tscgo --noEmit         # Fast TypeScript check (native compiler)
npx tsx scripts/validate-trove.ts  # Validate JSON content against Zod schemas
```

## Architecture

```
Zod Schemas (src/schemas/) --> JSON Content (content/) --> Koota ECS (src/ecs/) --> R3F Rendering (src/game/)
```

All game content is JSON validated against Zod schemas. Koota ECS consumes config at runtime. React Three Fiber renders the ECS world. The Zustand store in `gameStore.ts` is legacy -- new state should use Koota traits.

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/schemas/` | Zod schemas for all content types (world, quest, NPC, feature, item, encounter, pacing) |
| `src/ecs/` | Koota ECS world, traits (Position, Health, QuestLog, etc.), and actions |
| `src/game/components/` | R3F 3D components and `ui/` overlay components |
| `src/game/systems/` | Game logic: PlayerController, ChunkManager, Environment, InteractionSystem |
| `src/game/stores/gameStore.ts` | Legacy Zustand store (being migrated to Koota) |
| `src/game/utils/` | Seeded RNG (`random.ts`), world generation (`worldGen.ts`), textures (`textures.ts`) |
| `content/` | JSON content trove -- quests, NPCs, features, road spine |
| `content/world/road-spine.json` | 6 anchor points defining the 30km King's Road |
| `scripts/validate-trove.ts` | Content validation pipeline |

## Content Pipeline

To add game content (quests, NPCs, features):

1. Write JSON following schemas in `src/schemas/`
2. Place in appropriate `content/` subdirectory (see `content/CONTRIBUTING.md`)
3. Run `npx tsx scripts/validate-trove.ts` to validate
4. Schema validation checks types, referential integrity, A/B branches, dialogue word counts

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

## Mood

Pastoral, romanticized medieval English. Warm cream backgrounds, golden sunlight, honey limestone, lush meadows. Lora serif for display, Crimson Text for body. Holy Grail narrative. No grimdark. See `docs/DESIGN.md` for full palette.

## Road Spine

The world is organized along a 1D road from Ashford (distance 0) to Grailsend (distance 28000). Six anchor points define the main quest chapters. See `content/world/road-spine.json`.
