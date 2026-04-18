---
title: Standards
updated: 2026-04-09
status: current
domain: technical
---

# Standards

Non-negotiable code quality and design constraints for King's Road.

## Code Quality

### File Size

Maximum 300 lines of code per file in any language. Enforced by convention; enforced by CI biome check on TypeScript.

### Formatting and Linting

Biome is the sole formatter and linter. Do not add Prettier, ESLint, or stylelint.

```bash
pnpm exec biome check .          # Check
pnpm exec biome check . --write  # Fix
```

Configuration lives in `biome.json`. Settings:
- Single quotes
- Semicolons always
- 2-space indent
- Trailing commas in multi-line

### TypeScript

- Strict mode enabled in `tsconfig.json`
- No `any` casts without a comment explaining why
- All schema types derived from Zod: `z.infer<typeof SchemaName>`
- Core shared types in `src/game/types.ts`

### Testing

- Coverage thresholds: 80% statements, branches, functions, lines
- Unit tests for all pure logic (schemas, world generators, stores, resolvers)
- Component tests (Playwright CT) for UI components
- E2E tests for full game loop
- Test files colocated with source: `combat-resolver.test.ts` alongside `combat-resolver.ts`

## React Three Fiber Constraints

- Use `useFrame` for all per-frame game logic, never `setInterval` or `setTimeout`
- Access Three.js objects via refs, never React state
- Dispose dynamic geometries and materials in `useEffect` cleanup
- All static repeated geometry uses `THREE.InstancedMesh` (one draw call per geometry type)
- Do not create new React context providers -- use Koota ECS or Zustand

## State Management

- Koota ECS traits for game world state (position, health, quests, NPCs)
- Zustand stores for UI-adjacent state (HUD display values, settings, menus)
- The legacy `gameStore.ts` is being migrated to Koota -- do not add new state to it
- Use selectors for Zustand subscriptions: `useStore(state => state.specificValue)`

## Content Authoring

- All game content belongs in `content/`, never in `src/`
- Every content JSON must validate against its Zod schema in `src/schemas/`
- Content is compiled at build time: web loads the JSON bundle (`game-content.json`) into in-memory Maps, native reads the same bundle via Capacitor SQLite. Never load source-trove JSON files directly from hot paths.
- Tone: pastoral romanticized medieval. No grimdark, no modern slang, no anachronisms

### Quest Rules

- Micro quests: linear allowed, 5-15 estimated minutes
- Meso quests: A/B branch required, 15-45 estimated minutes
- Macro quests: A/B branch required, 30-120 estimated minutes
- A and B branches must be genuinely different approaches, not cosmetic variations

### NPC Naming

English, Celtic, and Norman names only. No Tolkien, no anime, no game references.

Examples: Edwin, Godric, Aldric, Wulfstan, Eadgyth, Leofric, Mildred, Hild.

## Visual Standards

### Color

Do not introduce colors outside the established palette (see `docs/DESIGN.md`).

- Background: `#f5f0e8` (warm cream)
- Primary text: `#3d3a34` (warm charcoal)
- Display text: `#8b6f47` (aged wood)
- Accent: `#c4a747` (honey gold)
- Scene background: `#87CEEB` (sky blue)

Do not use:
- Pure black backgrounds
- Blood red or harsh saturated colors
- Cold blue-gray stone
- Neon or cyberpunk colors

### Typography

- Display/headlines: Lora serif (`font-lora` utility class)
- Body/dialogue: Crimson Text serif (`font-crimson` utility class)
- Do not introduce other typefaces

### 3D Assets

- Static geometry: `THREE.InstancedMesh` only
- Dynamic/unique props: clone from loaded GLB nodes (hybrid CC0 technique, see `docs/HYBRID_PROCEDURAL_CC0.md`)
- Textures: procedural canvas textures via `src/game/utils/textures.ts`
- CHUNK_SIZE = 120 units, BLOCK_SIZE = 5 units

## CI Requirements

All PRs must pass:
1. `pnpm exec biome check .` -- no lint or format errors
2. `pnpm tsc --noEmit` -- no TypeScript errors
3. `pnpm test:coverage` -- coverage thresholds met (80%)
4. `npx tsx scripts/validate-content.ts` -- all content validates

## Dependency Policy

- Do not add dependencies without a clear, specific use case
- Prefer zero-dependency solutions for simple utilities
- Check that a dependency supports both web and React Native before adding it
- Peer dependencies for R3F must use exact version ranges matching `three`
