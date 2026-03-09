# King's Road

A config-driven 3D RPG engine where you walk the King's Road seeking the Holy Grail. Built with React Three Fiber, Koota ECS, and Zod-validated JSON content.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` in your browser.

## The Game

You are a traveler walking the King's Road, a 30-kilometer pilgrimage from the farming village of Ashford to the ancient temple of Grailsend. Along the way you encounter friendly villages, ancient ruins, hostile towns, and roadside monasteries. The world is pastoral, warm, and romanticized medieval English -- golden sunlight on rolling meadows, stone bridges over gentle brooks, thatched-roof taverns with glowing hearths.

The main quest follows a Holy Grail narrative across 6 anchor points. Side quests branch from the road in three tiers: macro (1-2 hours, multi-location), meso (15-30 minutes, single location), and micro (5-10 minutes, roadside encounters). Every quest beyond micro tier offers A/B branching -- meaningful choices that change the outcome.

## Architecture

```
Zod Schemas --> JSON Content --> Koota ECS --> React Three Fiber
```

All game content (quests, NPCs, features, encounters) is defined as JSON validated against Zod schemas. At runtime, a Koota ECS world consumes the config. React Three Fiber renders the ECS world with instanced meshes, procedural textures, and post-processing.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Rendering | React Three Fiber, drei, postprocessing |
| ECS | Koota (pmndrs) |
| Schemas | Zod 4 |
| State | Zustand (legacy, migrating to Koota) |
| UI | React 19, Tailwind CSS v4 |
| Build | Vite, TypeScript |
| Testing | Vitest, Playwright |
| Formatting | Biome |

## Project Structure

```
src/
├── schemas/              # Zod schemas for all content types
│   ├── world.schema.ts   # Road spine, anchors, regions
│   ├── quest.schema.ts   # Macro/meso/micro quests with A/B branching
│   ├── npc.schema.ts     # NPC archetypes, dialogue pools
│   ├── feature.schema.ts # Roadside features (ambient/minor/major)
│   ├── item.schema.ts    # Items and rewards
│   ├── encounter.schema.ts
│   ├── pacing.schema.ts  # Pacing intervals for feature placement
│   └── game-config.schema.ts
├── ecs/                  # Koota ECS layer
│   ├── world.ts          # ECS world instance
│   ├── traits/           # Position, Health, QuestLog, NPCArchetype, etc.
│   └── actions/          # Player spawning, input handling
├── game/                 # Game runtime
│   ├── components/       # 3D objects and UI overlays
│   │   ├── ui/           # MainMenu, GameHUD, DialogueBox, MobileControls
│   │   ├── GameScene.tsx  # R3F Canvas wrapper
│   │   ├── Chunk.tsx      # World chunk renderer (instanced meshes)
│   │   └── NPC.tsx        # Character component
│   ├── systems/          # PlayerController, ChunkManager, Environment
│   ├── hooks/            # Input handling
│   ├── stores/           # Zustand store (legacy)
│   └── utils/            # RNG, world generation, procedural textures
content/                  # JSON content trove
├── world/
│   └── road-spine.json   # 6 anchors along the 30km road
├── CONTRIBUTING.md       # Tone guide, schema examples, authoring rules
scripts/
└── validate-trove.ts     # Content validation pipeline
```

## Controls

### Desktop

| Key | Action |
|-----|--------|
| W/S | Move forward/backward |
| A/D | Turn left/right |
| Q/E | Strafe/Turn |
| SHIFT | Walk (slower) |
| SPACE | Jump |
| E | Interact |
| Mouse Drag | Look around |

### Mobile

- Left side: Virtual joystick for movement
- Right side: Jump and Interact buttons
- Push joystick to edge: Sprint

## Content Pipeline

Game content lives in `content/` as JSON files. To add new quests, NPCs, or features:

1. Write JSON following the schemas in `src/schemas/`
2. See `content/CONTRIBUTING.md` for tone guide and examples
3. Validate: `npx tsx scripts/validate-trove.ts`

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm test             # Run unit tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
pnpm test:e2e         # Playwright end-to-end tests
pnpm tsc --noEmit     # Type check
npx tsx scripts/validate-trove.ts  # Validate content trove
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) -- System design and data flow
- [Design](docs/DESIGN.md) -- Visual identity, color palette, typography
- [World Generation](docs/WORLD_GENERATION.md) -- Road spine, anchors, pacing engine
- [Game Systems](docs/GAME_SYSTEMS.md) -- Quests, ECS traits, player mechanics
- [Content PRD](docs/prd/kings-road-content-generation.md) -- Ralph-TUI generation spec

## License

MIT
