---
title: Architecture
updated: 2026-04-09
status: current
domain: technical
---

# Architecture

This document describes the high-level architecture of King's Road.

## Overview

King's Road is a config-driven RPG engine. Content is authored as JSON, validated against Zod schemas, compiled into a SQLite database at build time, consumed by a Koota ECS world at runtime, and rendered by React Three Fiber. Factory systems (building, NPC, monster) instantiate typed entities from JSON archetypes.

```
┌──────────────────────────────────────────────────────────────────┐
│                        Content Layer                              │
│  Zod Schemas (src/schemas/) --> JSON Trove (content/)             │
│  validate-content.ts: schema conformance + referential integrity  │
├──────────────────────────────────────────────────────────────────┤
│                        Database Layer                             │
│  compile-content-db.ts --> SQLite (expo-sqlite + Drizzle ORM)    │
│  Content tables: monsters, items, quests, buildings, towns, etc. │
│  Save tables: save_slots, player_state, quest_progress, etc.     │
├──────────────────────────────────────────────────────────────────┤
│                        ECS Layer (Koota)                          │
│  World (src/ecs/world.ts)                                        │
│  Traits: Position, Health, QuestLog, NPCArchetype, RoadPosition  │
│  Actions: spawnPlayer, updateInput                                │
├──────────────────────────────────────────────────────────────────┤
│                        Factory Layer                              │
│  BuildingFactory | NPCFactory | MonsterFactory | ChibiGenerator  │
│  Input: JSON archetype  Output: ECS entity + Three.js geometry   │
├──────────────────────────────────────────────────────────────────┤
│                        Rendering Layer (R3F)                      │
│  Canvas --> Environment --> ChunkManager --> Systems              │
│  PlayerController, QuestSystem, EncounterSystem, AudioSystem     │
├──────────────────────────────────────────────────────────────────┤
│                        UI Layer                                    │
│  MainMenu | GameHUD | DialogueBox | PauseMenu | InventoryScreen  │
│  QuestLog | Minimap | CombatHUD | MobileControls                 │
├──────────────────────────────────────────────────────────────────┤
│                        State Layer                                 │
│  Zustand: gameStore, worldStore, questStore, combatStore,        │
│           inventoryStore, settingsStore                           │
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
├── schemas/                     # Zod schemas (source of truth for content shapes)
│   ├── world.schema.ts          # RoadSpineSchema, AnchorPointSchema, RegionSchema
│   ├── quest.schema.ts          # QuestDefinitionSchema with A/B branching
│   ├── npc.schema.ts            # NPCDefinitionSchema, NPCArchetype enum
│   ├── npc-blueprint.schema.ts  # Named story NPCs
│   ├── feature.schema.ts        # FeatureDefinitionSchema, FeatureTier enum
│   ├── building.schema.ts       # BuildingArchetype for town construction
│   ├── town.schema.ts           # TownConfig: layout, NPCs, buildings
│   ├── monster.schema.ts        # MonsterArchetype with stats and appearance
│   ├── dungeon.schema.ts        # DungeonLayout with room graphs
│   ├── encounter.schema.ts      # Narrative encounter definitions
│   ├── encounter-table.schema.ts# Random encounter pools
│   ├── item.schema.ts           # ItemDefinitionSchema
│   ├── pacing.schema.ts         # PacingConfigSchema for feature intervals
│   ├── weather.schema.ts        # Weather system configuration
│   ├── dialogue.schema.ts       # DialogueLine validation
│   ├── skill-tree.schema.ts     # Player skill tree perks
│   ├── crafting.schema.ts       # Crafting recipes
│   ├── kingdom.schema.ts        # Kingdom-level world structure
│   └── game-config.schema.ts   # Master config combining all sub-schemas
│
├── ecs/                         # Koota ECS layer
│   ├── world.ts                 # createWorld() -- single instance
│   ├── traits/                  # Composable data components
│   │   ├── spatial.ts           # Position, Velocity, Rotation
│   │   ├── player.ts            # IsPlayer, Health, Stamina, Movement, etc.
│   │   ├── quest.ts             # QuestLog, IsQuestGiver
│   │   ├── npc.ts               # IsNPC, NPCArchetype, Dialogue, Interactable
│   │   └── pacing.ts            # RoadPosition, IsOnRoad, IsAnchor, IsFeature
│   └── actions/                 # Entity spawning and state mutations
│
├── db/                          # Database layer (Drizzle ORM + expo-sqlite)
│   ├── schema.ts                # Content tables + save state tables
│   ├── content-queries.ts       # Type-safe queries for content data
│   ├── load-content-db.ts       # DB initialization at runtime
│   └── save-service.ts          # Save slot management
│
├── game/
│   ├── Game.tsx                 # Root game component (menu vs active game)
│   ├── components/
│   │   ├── ui/                  # 2D overlay components
│   │   │   ├── MainMenu.tsx     # Title screen with seed phrase
│   │   │   ├── GameHUD.tsx      # Health/stamina/location/time
│   │   │   ├── DialogueBox.tsx  # NPC conversation, A/B choices
│   │   │   ├── PauseMenu.tsx    # Pause with settings access
│   │   │   ├── SettingsPanel.tsx# Audio/display/controls settings
│   │   │   ├── QuestLog.tsx     # Active/completed quest list
│   │   │   ├── InventoryScreen.tsx
│   │   │   ├── Minimap.tsx
│   │   │   ├── CombatHUD.tsx
│   │   │   ├── DeathOverlay.tsx
│   │   │   └── MobileControls.tsx
│   │   ├── GameScene.tsx        # R3F Canvas, SceneInit, post-processing
│   │   ├── Chunk.tsx            # Instanced mesh rendering per chunk
│   │   ├── Building.tsx         # Factory-built structures
│   │   ├── NPC.tsx              # Chibi character with idle animation
│   │   ├── Monster.tsx          # Monster entity component
│   │   ├── Feature.tsx          # Roadside point of interest
│   │   ├── DungeonRenderer.tsx  # Dungeon room rendering
│   │   └── Relic.tsx            # Collectible with float/glow animation
│   ├── systems/
│   │   ├── PlayerController.tsx # Movement, physics, camera
│   │   ├── ChunkManager.tsx     # Chunk streaming, entity spawning
│   │   ├── Environment.tsx      # Sky, lighting, day/night cycle
│   │   ├── InteractionSystem.tsx# NPC detection and dialogue trigger
│   │   ├── QuestSystem.tsx      # Quest step execution and progression
│   │   ├── EncounterSystem.tsx  # Combat encounter triggers
│   │   ├── DungeonEntrySystem.tsx
│   │   ├── WeatherSystem.tsx
│   │   ├── AudioSystem.tsx      # Tone.js ambient audio
│   │   ├── combat-resolver.ts   # Deterministic combat resolution
│   │   └── quest-step-executor.ts # Quest step state machine
│   ├── world/
│   │   ├── road-spine.ts        # Road spine loader with Zod validation
│   │   ├── pacing-engine.ts     # Deterministic feature placement
│   │   ├── dungeon-generator.ts # Procedural dungeon room graphs
│   │   ├── town-layout.ts       # Town building placement
│   │   ├── town-configs.ts      # Town configuration loader
│   │   ├── kingdom-gen.ts       # Kingdom-level world structure
│   │   ├── road-network.ts      # Road network connections
│   │   ├── terrain-gen.ts       # Simplex noise terrain
│   │   ├── simplex.ts           # Simplex noise implementation
│   │   ├── feature-placement.ts # Feature placement on road/off-road
│   │   ├── dungeon-registry.ts  # Dungeon anchor assignments
│   │   ├── loot-resolver.ts     # Loot table resolution
│   │   └── quest-resolver.ts    # Quest trigger evaluation
│   ├── factories/
│   │   ├── building-factory.ts  # BuildingArchetype --> Three.js geometry
│   │   ├── npc-factory.ts       # NPCDefinition --> chibi entity
│   │   ├── monster-factory.ts   # MonsterArchetype --> monster entity
│   │   ├── chibi-generator.ts   # Chibi character geometry
│   │   └── face-texture.ts      # Procedural NPC face textures
│   ├── audio/
│   │   ├── ambient-mixer.ts     # Tone.js ambient layer management
│   │   └── layer-factory.ts     # Audio layer instantiation
│   ├── hooks/
│   │   └── useInput.ts          # Keyboard, mouse, touch input
│   ├── stores/
│   │   ├── gameStore.ts         # Core game state (position, time, seed)
│   │   ├── worldStore.ts        # Chunk data, AABBs, interactables
│   │   ├── questStore.ts        # Active/completed quests
│   │   ├── combatStore.ts       # Combat state
│   │   ├── inventoryStore.ts    # Player inventory
│   │   └── settingsStore.ts     # Audio/display/control settings (localStorage)
│   └── utils/
│       ├── random.ts            # Seeded RNG (mulberry32, cyrb128)
│       └── textures.ts          # Procedural canvas textures
│
content/                         # JSON content trove
├── world/road-spine.json        # 6 anchors, 30km road
├── main-quest/                  # Chapter JSONs
├── side-quests/                 # macro/, meso/, micro/
├── npcs/                        # NPC archetype definition files
├── features/                    # Roadside feature definitions
├── buildings/                   # Building archetype configs
├── towns/                       # Town configuration files
├── monsters/                    # Monster archetype configs
├── dungeons/                    # Dungeon layout files
├── encounters/                  # Narrative encounter definitions
└── CONTRIBUTING.md              # Authoring guide and tone rules
│
scripts/
├── validate-content.ts          # Content validation pipeline
├── compile-content-db.ts        # Compile JSON content to SQLite
└── assemble-game-config.ts      # Assemble master game config
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
