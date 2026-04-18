---
title: King's Road
updated: 2026-04-18
status: current
domain: product
---

# King's Road

A config-driven 3D RPG where you walk the King's Road seeking the Holy Grail. Built with React Three Fiber, Koota ECS, and Zod-validated JSON content.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` in your browser (Vite dev server).

## The Game

You are a traveler walking the King's Road, a 30-kilometer pilgrimage from the farming village of Ashford to the ancient temple of Grailsend. Along the way you encounter friendly villages, ancient ruins, hostile towns, and roadside monasteries. The world is pastoral, warm, and romanticized medieval English -- golden sunlight on rolling meadows, stone bridges over gentle brooks, thatched-roof taverns with glowing hearths.

The main quest follows a Holy Grail narrative across 6 anchor points. Side quests branch from the road in three tiers: macro (1-2 hours, multi-location), meso (15-30 minutes, single location), and micro (5-10 minutes, roadside encounters). Every quest beyond micro tier offers A/B branching -- meaningful choices that change the outcome.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Rendering | React Three Fiber, drei, postprocessing |
| ECS | Koota (pmndrs) |
| Schemas | Zod 4 |
| Database | sql.js (web) + @capacitor-community/sqlite (native), Drizzle ORM |
| State | Zustand (UI/HUD state, migrating to Koota) |
| UI | React 19, Tailwind CSS v4 |
| Build | Vite 7 (web + native dist), Capacitor 7 (native wrapper), TypeScript |
| Testing | Vitest, Playwright (e2e + component) |
| Formatting | Biome |
| Audio | Tone.js |

## Project Structure

```
app/                      # All TSX: entry, App, Game, scene/, systems/, ui/
├── main.tsx              # Vite entry point
├── App.tsx               # Root React tree
├── Game.tsx              # Menu vs active game
├── ErrorBoundary.tsx
├── scene/                # R3F 3D components (Chunk, Building, NPC, Feature, etc.)
├── systems/              # Game logic (PlayerController, ChunkManager, etc.)
└── ui/                   # 2D overlay and diegetic HUD components

src/                      # Logical subpackages
├── schemas/              # Zod schemas for all content types
├── ecs/                  # Koota ECS layer (world, traits, actions)
├── db/                   # Drizzle ORM schema, content DB loader, save service
├── stores/               # Zustand stores (game, world, quest, combat, settings)
├── types/                # Shared TypeScript types
├── world/                # Road spine, pacing engine, dungeon/town/kingdom gen
├── factories/            # Building, NPC, monster, chibi-generator
├── audio/                # Ambient mixer, Tone.js layer factory
├── hooks/                # useInput and other React hooks
└── utils/                # RNG, textures, utilities

content/                  # JSON content trove
├── world/road-spine.json # 6 anchors along the 30km road
├── main-quest/           # Main story chapters
├── side-quests/          # macro/, meso/, micro/
├── npcs/                 # NPC archetype definitions
├── features/             # Roadside features
├── buildings/            # Building archetypes
├── towns/                # Town configurations
├── monsters/             # Monster archetypes
├── dungeons/             # Dungeon layouts
├── encounters/           # Narrative encounter definitions
└── CONTRIBUTING.md       # Tone guide, schema examples, authoring rules

scripts/
├── validate-content.ts   # Content validation pipeline
├── compile-content-db.ts # Compile JSON content to SQLite
└── assemble-game-config.ts

e2e/
└── game.spec.ts          # Playwright end-to-end test
```

## Controls

This is a mobile-first game. The web build exists for development and testing.

### Touch (primary)

- **Left half**: touch anywhere to spawn a floating joystick for movement. Push to the edge to sprint.
- **Right half**: swipe to look around; tap on highlighted world elements to interact (NPCs glow, signposts shimmer, interactables draw a subtle halo).
- **Jump**: two-finger tap anywhere.
- **Pause**: tap the quill icon (top-left corner, part of the in-world parchment frame).

The HUD is **diegetic** — health shown via vignette + heartbeat, not numbers; inventory items appear on the character's belt/back; dialogue surfaces as illuminated-manuscript speech bubbles anchored to the speaker. If a panel-style overlay is needed, it's styled as vellum, not a game menu.

### Keyboard (debug only)

Desktop keyboard shortcuts exist for development workflow (WASD movement, F to interact, ESC pause) but are not the intended UX and may drift from mobile parity.

## Content Pipeline

Game content lives in `content/` as JSON. To add quests, NPCs, buildings, or features:

1. Write JSON following the schemas in `src/schemas/`
2. See `content/CONTRIBUTING.md` for tone guide, authoring rules, and examples
3. Validate: `npx tsx scripts/validate-content.ts`
4. Content is compiled into SQLite automatically on next `pnpm dev` or `pnpm build`

## Commands

```bash
# Development
pnpm dev                   # Vite dev server at localhost:5173
pnpm build                 # Production web build

# Native (Capacitor)
pnpm build:native          # Build dist/ for Capacitor
pnpm cap:sync              # Sync dist/ into android/ios
pnpm native:android:debug  # Full Android debug APK pipeline

# Tests (see docs/TESTING.md for full reference)
pnpm test                  # Vitest unit tests
pnpm test:watch            # Watch mode
pnpm test:coverage         # Coverage report (80% thresholds)
pnpm test:ct               # Playwright component tests
pnpm test:e2e              # Playwright end-to-end tests
pnpm test:all              # All test suites

# Other
pnpm tsc --noEmit          # Type check
npx tsx scripts/validate-content.ts    # Validate content trove
npx tsx scripts/compile-content-db.ts  # Recompile content DB
pnpm exec biome check .    # Lint and format check
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) -- System design and data flow
- [Design](docs/DESIGN.md) -- Visual identity, color palette, typography
- [Game Systems](docs/GAME_SYSTEMS.md) -- Quests, ECS traits, player mechanics
- [World Generation](docs/WORLD_GENERATION.md) -- Road spine, anchors, pacing engine
- [Testing](docs/TESTING.md) -- Test strategy and coverage
- [State](docs/STATE.md) -- What is done, what is next
- [Lore](docs/LORE.md) -- World lore, narrative, characters

## License

MIT
