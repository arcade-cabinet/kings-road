---
title: King's Road
updated: 2026-04-09
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

Open `http://localhost:8081` in your browser (Expo dev server).

## The Game

You are a traveler walking the King's Road, a 30-kilometer pilgrimage from the farming village of Ashford to the ancient temple of Grailsend. Along the way you encounter friendly villages, ancient ruins, hostile towns, and roadside monasteries. The world is pastoral, warm, and romanticized medieval English -- golden sunlight on rolling meadows, stone bridges over gentle brooks, thatched-roof taverns with glowing hearths.

The main quest follows a Holy Grail narrative across 6 anchor points. Side quests branch from the road in three tiers: macro (1-2 hours, multi-location), meso (15-30 minutes, single location), and micro (5-10 minutes, roadside encounters). Every quest beyond micro tier offers A/B branching -- meaningful choices that change the outcome.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Rendering | React Three Fiber, drei, postprocessing |
| ECS | Koota (pmndrs) |
| Schemas | Zod 4 |
| Database | expo-sqlite, Drizzle ORM |
| State | Zustand (UI/HUD state) |
| UI | React 19, Tailwind CSS v4 |
| Build | Expo (web), Vite (local dev), TypeScript |
| Testing | Vitest, Playwright (e2e + component) |
| Formatting | Biome |
| Audio | Tone.js |

## Project Structure

```
src/
├── schemas/              # Zod schemas for all content types
├── ecs/                  # Koota ECS layer (world, traits, actions)
├── db/                   # Drizzle ORM schema, content DB loader, save service
├── game/
│   ├── components/       # R3F 3D components
│   │   └── ui/           # 2D overlay components (HUD, menus, dialogue)
│   ├── systems/          # Game logic: Player, Chunks, Quests, Combat, etc.
│   ├── world/            # Road spine, pacing engine, dungeon/town/kingdom gen
│   ├── factories/        # Building, NPC, monster, chibi-generator
│   ├── audio/            # Ambient mixer, Tone.js layer factory
│   ├── hooks/            # Input handling
│   └── stores/           # Zustand stores (game, world, quest, combat, settings)
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

### Desktop

| Key | Action |
|-----|--------|
| W/S | Move forward/backward |
| A/D | Turn left/right |
| Q/E | Strafe/turn |
| SHIFT | Walk (slower) |
| SPACE | Jump |
| E | Interact |
| Mouse Drag | Look around |
| ESC | Pause menu |

### Mobile

- Left half: touch area spawns a virtual joystick for movement
- Right side: Jump and Interact buttons
- Push joystick to edge: Sprint

## Content Pipeline

Game content lives in `content/` as JSON. To add quests, NPCs, buildings, or features:

1. Write JSON following the schemas in `src/schemas/`
2. See `content/CONTRIBUTING.md` for tone guide, authoring rules, and examples
3. Validate: `npx tsx scripts/validate-content.ts`
4. Content is compiled into SQLite automatically on next `pnpm dev` or `pnpm build`

## Commands

```bash
pnpm dev                   # Start Expo dev server
pnpm build                 # Production build (expo export --platform web)
pnpm test                  # Run unit tests
pnpm test:watch            # Watch mode
pnpm test:coverage         # Coverage report (80% thresholds)
pnpm test:ct               # Playwright component tests
pnpm test:e2e              # Playwright end-to-end tests
pnpm test:all              # All test suites
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
