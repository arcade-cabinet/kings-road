# Project Structure

```
src/
├── schemas/            # Zod schemas for all content types (*.schema.ts)
│                       # Each schema has a co-located test (*.schema.test.ts)
├── ecs/                # Koota ECS layer
│   ├── world.ts        # Single createWorld() instance
│   ├── traits/         # ECS traits: spatial, player, quest, npc, pacing, inventory
│   └── actions/        # ECS actions: player spawning, input handling
├── game/
│   ├── components/     # R3F 3D components (Chunk, NPC, Monster, Building, etc.)
│   │   └── ui/         # 2D overlay UI (MainMenu, GameHUD, DialogueBox, MobileControls)
│   ├── systems/        # Game systems (PlayerController, ChunkManager, Environment, etc.)
│   ├── stores/         # Zustand stores (legacy — gameStore, questStore)
│   ├── factories/      # Procedural generators (NPC, building, monster, chibi, face texture)
│   ├── hooks/          # React hooks (useInput)
│   ├── shaders/        # GLSL shaders (gerstner water)
│   ├── audio/          # Audio system (ambient mixer, layer factory)
│   ├── world/          # World generation (road spine, pacing engine, town layout, danger)
│   ├── utils/          # Utilities (RNG, textures, world coords, world gen)
│   ├── Game.tsx        # Top-level game component
│   └── types.ts        # Core game types
├── db/                 # Save system (Drizzle ORM + expo-sqlite)
├── lib/                # General utilities
├── App.tsx             # App entry
└── main.tsx            # Vite entry

content/                # JSON content trove (never in src/)
├── world/              # Road spine, anchors
├── quests/             # Quest definitions
├── side-quests/        # Side quest definitions
├── main-quest/         # Main quest chain
├── npcs/               # NPC definitions
├── features/           # Roadside features (ambient/minor/major)
├── encounters/         # Encounter tables (tiered)
├── monsters/           # Monster definitions
├── items/              # Item definitions
├── loot/               # Loot tables
├── towns/              # Town definitions
├── buildings/          # Building definitions
├── dungeons/           # Dungeon definitions
├── pacing/             # Pacing configuration
└── game-config.json    # Global game configuration

scripts/                # Build/validation scripts (run with `npx tsx`)
app/                    # Expo Router entry (React Native target)
```

## Data Flow

```
Zod Schemas (src/schemas/) → JSON Content (content/) → Koota ECS (src/ecs/) → React Three Fiber (src/game/)
```

## Rendering Hierarchy

```
Game.tsx → GameScene.tsx (Canvas)
  ├── Environment.tsx (sky, lighting, fog, day/night)
  ├── ChunkManager.tsx (world streaming)
  │   └── Chunk.tsx (instanced meshes, NPCs)
  ├── PlayerController.tsx (physics, camera)
  └── InteractionSystem.tsx (NPC detection)
```
