---
title: Testing
updated: 2026-04-09
status: current
domain: quality
---

# Testing

Test strategy, commands, coverage targets, and what each layer verifies.

## Test Layers

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | Pure logic: schemas, stores, world generators, resolvers |
| Component | Playwright CT | React UI components in isolation |
| E2E | Playwright | Full game loop in a real browser |
| Content | validate-content.ts | JSON content schema conformance + referential integrity |

## Commands

```bash
pnpm test                  # Vitest unit tests (single run)
pnpm test:watch            # Vitest watch mode
pnpm test:coverage         # Vitest with v8 coverage report
pnpm test:ct               # Playwright component tests
pnpm test:ct:ui            # Playwright CT with interactive UI
pnpm test:e2e              # Playwright e2e tests (headless)
pnpm test:e2e:headed       # Playwright e2e with visible browser
pnpm test:all              # pnpm test:coverage && pnpm test:ct && pnpm test:e2e
npx tsx scripts/validate-content.ts  # Content trove validation
```

## Coverage

Coverage is collected for:
- `src/game/stores/**` -- Zustand store logic
- `src/game/utils/**` -- RNG, textures, utilities
- `src/game/hooks/**` -- useInput
- `src/game/types.ts`
- `src/lib/**`

Excluded from coverage (intentionally):
- `src/game/components/**` -- React Three Fiber components (WebGL context required)
- `src/game/systems/**` -- Game systems (R3F dependency)
- `src/game/Game.tsx`

Coverage thresholds (all must pass):
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## Unit Tests

Test files are colocated with source files:

```
src/
├── schemas/
│   ├── quest.schema.ts
│   ├── quest.schema.test.ts       # Schema validation edge cases
│   ├── building.schema.ts
│   └── building.schema.test.ts
├── game/
│   ├── systems/
│   │   ├── combat-resolver.ts
│   │   ├── combat-resolver.test.ts  # Deterministic combat outcomes
│   │   ├── quest-step-executor.ts
│   │   └── quest-step-executor.test.ts
│   ├── world/
│   │   ├── pacing-engine.ts
│   │   ├── pacing-engine.test.ts    # Feature placement intervals
│   │   ├── kingdom-gen.ts
│   │   ├── kingdom-gen.test.ts
│   │   ├── dungeon-generator.ts
│   │   └── dungeon-generator.test.ts
│   ├── factories/
│   │   ├── building-factory.ts
│   │   ├── building-factory.test.ts
│   │   ├── npc-factory.ts
│   │   ├── npc-factory.test.ts
│   │   ├── chibi-generator.ts
│   │   └── chibi-generator.test.ts
│   └── stores/
│       ├── gameStore.ts
│       ├── gameStore.test.ts
│       ├── questStore.ts
│       └── questStore.test.ts
```

## Component Tests (Playwright CT)

Component tests use `@playwright/experimental-ct-react` to mount UI components in isolation with a real browser:

```
src/game/components/ui/
├── MainMenu.ct.tsx
├── GameHUD.ct.tsx
├── DialogueBox.ct.tsx
├── MobileControls.ct.tsx
├── QuestLog.ct.tsx
├── LoadingOverlay.ct.tsx
└── ErrorOverlay.ct.tsx
```

Run with:
```bash
pnpm test:ct
```

Snapshots are stored in `*.ct.tsx-snapshots/`. Update snapshots:
```bash
pnpm test:ct -- --update-snapshots
```

## E2E Tests

Located in `e2e/game.spec.ts`. Tests use Playwright to drive a real browser against the built game.

```bash
pnpm build && pnpm test:e2e
```

The CI workflow runs e2e with `xvfb-run --auto-servernum` for headless display.

## Content Validation

The content validation script checks all JSON files in `content/`:

```bash
npx tsx scripts/validate-content.ts
```

Checks:
1. Schema conformance (Zod validation per directory)
2. Referential integrity (quest prerequisites exist, anchor IDs valid, encounter IDs valid)
3. A/B branch coverage for meso and macro quests
4. Dialogue word count minimums
5. Duration estimation vs declared `estimatedMinutes` (warns if >50% deviation)
6. Substance scoring (dialogue density per quest)

Exit codes: `0` for pass (may have warnings), `1` if any schema validation fails.

## Integration Tests

Select integration tests are marked and run as part of the standard Vitest suite:

- `pacing-engine.integration.test.ts` -- end-to-end pacing with real content
- `town-configs.integration.test.ts` -- town config loading against real content
- `pacing-config.integration.test.ts` -- pacing config schema with real JSON
- `npc-pool.integration.test.ts` -- NPC factory pool with real content
- `content-trove.integration.test.ts` -- full content trove validation

## Benchmarks

World generation performance:

```
src/game/world/
└── kingdom-gen.bench.test.ts   # Kingdom gen performance
```

Run benchmarks:
```bash
pnpm test -- --reporter=verbose src/game/world/kingdom-gen.bench.test.ts
```

## What to Test When

| Changing | Run |
|---------|-----|
| Schema changes | `pnpm test -- src/schemas/` |
| Content JSON | `npx tsx scripts/validate-content.ts` |
| Store logic | `pnpm test -- src/game/stores/` |
| World generation | `pnpm test -- src/game/world/` |
| Factory logic | `pnpm test -- src/game/factories/` |
| UI components | `pnpm test:ct` |
| Full game | `pnpm test:e2e` |
| All | `pnpm test:all` |
