---
title: CLAUDE.md
updated: 2026-04-18
status: current
domain: technical
---

# CLAUDE.md

Project-specific guidance for Claude Code sessions on King's Road.

## Stack at a Glance

- **Web**: Vite 7 + React 19 + React Three Fiber. Dev server on `localhost:5173`.
- **Native**: Capacitor 7 wrapping `dist/`. Android/iOS builds via `pnpm build:native` + `pnpm cap:sync`.
- **Database**: sql.js (web) + `@capacitor-community/sqlite` (native) via Drizzle ORM. Content compiled at build time; save state written at runtime.
- **ECS**: Koota (pmndrs). New game state goes in Koota traits, not Zustand.
- **Rendering**: React Three Fiber + drei + postprocessing.
- **Testing**: Vitest unit + `happy-dom`; Vitest browser mode (`@vitest/browser` + `@vitest/browser-playwright` + `vitest-browser-react`) for component + WebGL smoke; Playwright for E2E only.
- **Formatting**: Biome (not Prettier/ESLint).

See `docs/ARCHITECTURE.md` for the full data-flow diagram and code layout.

## Commands

```bash
# Development
pnpm dev                    # Vite dev server at localhost:5173

# Web production build
pnpm build                  # tsc --noEmit && vite build

# Native (Capacitor)
pnpm build:native           # Build dist/ for Capacitor
pnpm cap:sync               # Sync dist/ into android/ios
pnpm native:android:debug   # Full Android debug APK pipeline

# Tests — see docs/TESTING.md for full reference
pnpm test                   # Vitest unit tests
pnpm test:coverage          # Coverage report (80% thresholds)
pnpm test:browser           # Vitest browser mode (component + WebGL smoke)
pnpm test:e2e               # Playwright e2e tests
pnpm test:all               # Coverage + browser + e2e

# Type checking
pnpm tsc --noEmit           # Full TypeScript check

# Content pipeline
npx tsx scripts/validate-content.ts   # Validate JSON content
npx tsx scripts/compile-content-db.ts # Recompile content DB

# Lint
pnpm exec biome check .     # Lint and format check
```

## Code Layout

```text
app/                        # All TSX entry points + views + components + systems
├── main.tsx                # Vite entry
├── App.tsx                 # Root React tree
├── Game.tsx                # Menu vs active game
├── ErrorBoundary.tsx
├── scene/                  # R3F 3D components (Chunk, Building, NPC, etc.)
├── systems/                # R3F useFrame-driven systems (PlayerController, ...)
├── views/                  # Full-screen views grouped by route
│   ├── MainMenu/           # Landing (MainMenu, ShaderBackdrop, VellumOrnaments)
│   ├── Gameplay/           # In-game HUD cluster (GameplayFrame, DialogueBox, ...)
│   ├── DeathOverlay.tsx
│   ├── ErrorOverlay.tsx
│   └── SettingsPanel.tsx
├── components/             # Shared UI primitives (Portrait3D, ...)
└── __tests__/              # Vitest browser smoke tests

src/                        # Logical subpackages (no game/ subdirectory)
├── schemas/                # Zod schemas for all content types
├── ecs/                    # Koota world, traits, actions
├── db/                     # Drizzle ORM schema, DB loader, save service
├── stores/                 # Zustand stores (game, world, quest, combat, inventory, settings)
├── types/                  # Shared TypeScript types
├── world/                  # Road spine, pacing engine, dungeon gen, kingdom gen
├── factories/              # Building, NPC, monster, chibi-generator factories
├── audio/                  # Ambient mixer, audio layer factory
├── hooks/                  # useInput and other React hooks
├── input/                  # Input system primitives
├── shaders/                # GLSL shader files
├── utils/                  # Random, textures, etc.
├── lib/                    # Shared utilities
├── entities/               # ECS entity templates
└── benchmarks/             # Vitest bench files

content/                    # JSON content trove (quests, NPCs, features, etc.)
scripts/                    # validate-content.ts, compile-content-db.ts
```

Path aliases: `@/*` → `src/*`, `@app/*` → `app/*`.

## Content Pipeline

1. Author JSON in `content/` following schemas in `src/schemas/`
2. Validate: `npx tsx scripts/validate-content.ts`
3. Compile DB: `npx tsx scripts/compile-content-db.ts` (auto on `pnpm dev` / `pnpm build`)
4. See `content/CONTRIBUTING.md` for tone guide and authoring rules

Quest tiers: `macro` (1-2h, must branch), `meso` (15-45min, must branch), `micro` (5-15min, linear ok).

## Code Conventions

- **Biome** for formatting and linting (not Prettier/ESLint)
- **Single quotes**, semicolons always, 2-space indent
- **Koota traits** for new game state (not Zustand). Zustand stores are being migrated — do not add new state to them; see `docs/plans/2026-04-18-koota-migration.md`.
- **`useFrame`** for game logic, never `setInterval`/`setTimeout`
- **`THREE.InstancedMesh`** for repeated geometry, never individual meshes
- **Zod `z.infer<typeof Schema>`** for TypeScript types derived from schemas
- Core game types live in `src/types/game.ts`
- Do not store Three.js objects in React state (use refs)
- Do not create new React context providers (use Koota or Zustand)
- Do not put content JSON in `src/` or `app/` (it belongs in `content/`)
- Max 300 LOC per file

## Mood

Pastoral, romanticized medieval English. Warm cream backgrounds (#f5f0e8), golden sunlight, honey limestone, lush meadows. Lora serif for display, Crimson Text for body. Holy Grail narrative. No grimdark. HUD is **diegetic** — health via vignette/heartbeat, inventory on the character, dialogue as illuminated-manuscript speech bubbles. See `docs/DESIGN.md` for full palette and HUD spec.

## Road Spine

The world is organized along a 1D road from Ashford (distance 0) to Grailsend (distance 28000). Six anchor points define the main quest chapters. The pacing engine in `src/world/pacing-engine.ts` generates deterministic feature placements. See `content/world/road-spine.json`.

## Save System

Game saves use SQLite with Drizzle ORM. Two layers:
- **Content tables**: read-only, populated by `scripts/compile-content-db.ts` at build time
- **Save state tables**: read-write at runtime (save slots, player state, quest progress, inventory, chunk deltas)

Web runtime uses sql.js; native runtime uses `@capacitor-community/sqlite`.
