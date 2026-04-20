---
title: Project Structure
updated: 2026-04-20
status: current
domain: technical
---

# Project Structure

```
app/                        # All TSX: entry, App, Game, scene/, systems/, ui/
├── main.tsx                # Vite entry point
├── App.tsx                 # Root React tree
├── Game.tsx                # Menu vs active game state
├── ErrorBoundary.tsx
├── scene/                  # R3F 3D components (Chunk, Building, NPC, Feature, etc.)
├── systems/                # Game systems (PlayerController, ChunkManager, etc.)
└── ui/                     # Diegetic HUD + panel overlays (MainMenu, DialogueBox, etc.)

src/                        # Logical subpackages (no game/ nesting)
├── schemas/                # Zod schemas for all content types (*.schema.ts)
│                           # Each schema has a co-located test (*.schema.test.ts)
├── ecs/                    # Koota ECS layer
│   ├── world.ts            # Single createWorld() instance
│   ├── traits/             # ECS traits: spatial, player, quest, npc, pacing
│   └── actions/            # ECS actions: player spawning, input handling
├── db/                     # Database layer (Drizzle ORM + sql.js/Capacitor SQLite)
├── stores/                 # Zustand stores (legacy — migrating to Koota)
├── types/                  # Core game types
├── world/                  # World generation (road spine, pacing, dungeon, kingdom)
├── factories/              # Entity generators (NPC, building, monster, chibi)
├── hooks/                  # React hooks (useInput)
├── input/                  # Input system primitives
├── shaders/                # GLSL shaders
├── audio/                  # Audio system (ambient mixer, layer factory)
├── utils/                  # Utilities (RNG, textures)
├── lib/                    # General utilities
├── entities/               # ECS entity templates
└── benchmarks/             # Vitest bench files

content/                    # JSON content trove (never in src/ or app/)
├── world/                  # Road spine, anchors
├── main-quest/             # Main quest chain
├── side-quests/            # macro/, meso/, micro/
├── npcs/                   # NPC definitions
├── features/               # Roadside features (ambient/minor/major)
├── encounters/             # Encounter tables (tiered)
├── monsters/               # Monster definitions
├── items/                  # Item definitions
├── loot/                   # Loot tables
├── towns/                  # Town definitions
├── buildings/              # Building definitions
└── dungeons/               # Dungeon definitions

scripts/                    # Build/validation scripts (run with `npx tsx`)
```

## Data Flow

```
Zod Schemas (src/schemas/) → JSON Content (content/) → SQLite DB → Koota ECS (src/ecs/) → React Three Fiber (app/scene/)
```

## Rendering Hierarchy

```
app/main.tsx → app/App.tsx → app/Game.tsx → app/scene/GameScene.tsx (Canvas)
  ├── app/scene/Environment.tsx (sky, lighting, fog, day/night)
  ├── app/systems/ChunkManager.tsx (world streaming)
  │   └── app/scene/Chunk.tsx (instanced meshes, NPCs)
  ├── app/systems/PlayerController.tsx (physics, camera)
  └── app/systems/InteractionSystem.tsx (NPC detection)
```
