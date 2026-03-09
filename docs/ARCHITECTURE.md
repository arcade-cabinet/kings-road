# Architecture

This document describes the high-level architecture of King's Road.

## Overview

King's Road is a config-driven RPG engine. Content is authored as JSON, validated against Zod schemas at build time, consumed by a Koota ECS world at runtime, and rendered by React Three Fiber. The rendering layer from the original prototype (instanced meshes, chunk streaming, procedural textures) is preserved and adapted as the visual output of the ECS pipeline.

```
┌──────────────────────────────────────────────────────────────────┐
│                        Content Layer                              │
│  Zod Schemas (src/schemas/) --> JSON Trove (content/)             │
│  validate-trove.ts checks schemas + referential integrity         │
├──────────────────────────────────────────────────────────────────┤
│                        ECS Layer (Koota)                          │
│  World (src/ecs/world.ts)                                        │
│  Traits: Position, Health, QuestLog, NPCArchetype, RoadPosition  │
│  Actions: spawnPlayer, updateInput                                │
├──────────────────────────────────────────────────────────────────┤
│                        Rendering Layer (R3F)                      │
│  Canvas --> SceneInit --> Environment --> ChunkManager --> Chunks  │
│  PlayerController --> Camera                                      │
│  InteractionSystem --> DialogueBox                                │
├──────────────────────────────────────────────────────────────────┤
│                        UI Layer                                    │
│  MainMenu | GameHUD | DialogueBox | MobileControls                │
├──────────────────────────────────────────────────────────────────┤
│                        State Layer (Legacy)                        │
│  Zustand Store (gameStore.ts) -- migrating to Koota traits        │
├──────────────────────────────────────────────────────────────────┤
│                        Utilities                                   │
│  types.ts | random.ts | worldGen.ts | textures.ts                 │
└──────────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. Config-Driven Content

All game content (quests, NPCs, features, encounters, items, pacing) is defined as JSON files in `content/`. Zod schemas in `src/schemas/` define the shape of every content type. Nothing is hardcoded -- the engine renders whatever valid config it receives.

### 2. Schema-First Validation

The validation pipeline (`scripts/validate-trove.ts`) runs before deployment:
- Schema conformance (types, lengths, enums)
- Referential integrity (quest prerequisites exist, anchors are valid)
- A/B branch coverage for meso/macro quests
- Dialogue word count minimums
- Duration estimation (paper playtesting heuristics)
- Substance scoring (dialogue density per quest)

### 3. ECS-First Game State

New game state uses Koota ECS traits, not Zustand. The Zustand store is legacy from the original prototype and is being migrated. Koota traits are composable, queryable, and avoid the React re-render overhead of store subscriptions.

### 4. Instanced Rendering

Static world geometry uses `THREE.InstancedMesh` to batch draw calls. A single instanced mesh renders thousands of trees, rocks, or building blocks with one draw call.

### 5. Chunk-Based Streaming

The world is divided into 120x120 unit chunks. Only chunks near the player are loaded, keeping memory constant regardless of world size.

## Data Flow

### Content Pipeline

```
Author (human or Ralph-TUI)
    |
    v
JSON files in content/
    |
    v
validate-trove.ts (Zod + referential integrity)
    |
    v
Road spine loader (runtime)
    |
    v
Koota ECS entities (traits assigned from config)
    |
    v
R3F rendering (instanced meshes, NPCs, features)
```

### Runtime Data Flow

```
┌──────────────┐     reads      ┌──────────────┐
│   useInput   │ ────────────→  │  Game Store  │
│   (hooks)    │     writes     │  (Zustand)   │
└──────────────┘ ←────────────  └──────────────┘
                                       ↑
                           reads/writes │
                                       ↓
┌──────────────┐                ┌──────────────┐
│    Player    │  collisions    │    Chunk     │
│  Controller  │ ←──────────→  │   Manager    │
└──────────────┘                └──────────────┘
       │                               │
       │ updates camera                │ spawns
       ↓                               ↓
┌──────────────┐                ┌──────────────┐
│  R3F Camera  │                │  Chunk       │
│              │                │  Components  │
└──────────────┘                └──────────────┘
```

### Input --> State --> Render

1. Input hooks capture keyboard/mouse/touch events
2. Store actions update state
3. PlayerController reads input in `useFrame`
4. Physics produce new position
5. Camera updates to match
6. ChunkManager loads/unloads chunks based on position

## Directory Structure

```
src/
├── schemas/                  # Zod schemas (source of truth for content shapes)
│   ├── world.schema.ts       # RoadSpineSchema, AnchorPointSchema, RegionSchema
│   ├── quest.schema.ts       # QuestDefinitionSchema, QuestStepSchema, QuestBranchSchema
│   ├── npc.schema.ts         # NPCDefinitionSchema, NPCArchetype enum
│   ├── feature.schema.ts     # FeatureDefinitionSchema, FeatureTier enum
│   ├── item.schema.ts        # ItemDefinitionSchema
│   ├── encounter.schema.ts   # EncounterDefinitionSchema
│   ├── pacing.schema.ts      # PacingConfigSchema
│   └── game-config.schema.ts # GameConfigSchema (combines all)
│
├── ecs/                      # Koota ECS layer
│   ├── world.ts              # createWorld() -- single instance
│   ├── traits/               # Composable data components
│   │   ├── spatial.ts        # Position, Velocity, Rotation
│   │   ├── player.ts         # IsPlayer, Health, Stamina, Movement, etc.
│   │   ├── quest.ts          # QuestLog, IsQuestGiver
│   │   ├── npc.ts            # IsNPC, NPCArchetype, Dialogue, Interactable
│   │   └── pacing.ts         # RoadPosition, IsOnRoad, IsAnchor, IsFeature
│   └── actions/              # Entity spawning and state mutations
│
├── game/
│   ├── Game.tsx              # Root game component (menu vs active game)
│   ├── components/
│   │   ├── ui/               # 2D overlay components
│   │   ├── GameScene.tsx      # R3F Canvas, SceneInit, post-processing
│   │   ├── Chunk.tsx          # Instanced mesh rendering per chunk
│   │   ├── NPC.tsx            # Character model with idle animation
│   │   └── Relic.tsx          # Collectible with float/glow animation
│   ├── systems/
│   │   ├── PlayerController.tsx  # Movement, physics, camera
│   │   ├── ChunkManager.tsx      # Chunk streaming, NPC spawning
│   │   ├── Environment.tsx       # Sky, lighting, day/night cycle
│   │   └── InteractionSystem.tsx # NPC detection
│   ├── hooks/
│   │   └── useInput.ts       # Keyboard, mouse, touch input
│   ├── stores/
│   │   └── gameStore.ts      # Legacy Zustand store
│   └── utils/
│       ├── random.ts         # Seeded RNG (mulberry32, cyrb128)
│       ├── worldGen.ts       # Chunk type assignment, NPC generation
│       └── textures.ts       # Procedural canvas textures
│
content/                      # JSON content trove
├── world/
│   └── road-spine.json       # 6 anchors, 30km road
├── CONTRIBUTING.md           # Authoring guide
│
scripts/
└── validate-trove.ts         # Content validation pipeline
```

## Road Spine System

The world is organized along a 1D road spine defined in `content/world/road-spine.json`. The spine has a `totalDistance` of 30,000 units and 6 anchor points:

| Anchor | Distance | Type | Chapter |
|--------|----------|------|---------|
| Ashford | 0 | VILLAGE_FRIENDLY | chapter-00 |
| Millbrook | 6,000 | VILLAGE_FRIENDLY | chapter-01 |
| Thornfield Ruins | 12,000 | DUNGEON | chapter-02 |
| Ravensgate | 17,000 | VILLAGE_HOSTILE | chapter-03 |
| The Pilgrim's Rest | 21,000 | WAYPOINT | chapter-04 |
| Grailsend | 28,000 | DUNGEON | chapter-05 |

Chunks on the road are typed by their nearest anchor. Chunks off the road become pastoral countryside (meadow, forest, farmland) based on region config.

## Extension Points

### Adding New Content Types

1. Define a Zod schema in `src/schemas/`
2. Add to the barrel export in `src/schemas/index.ts`
3. Add schema routing in `scripts/validate-trove.ts`
4. Create content JSON in `content/`

### Adding New ECS Systems

1. Define traits in `src/ecs/traits/`
2. Create system component in `src/game/systems/`
3. Add to `SceneContent` in `GameScene.tsx`

### Adding New Renderers

1. Create component in `src/game/components/`
2. Use instanced meshes for repeated geometry
3. Add collision AABBs if the object is solid
