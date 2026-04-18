---
title: Architecture
updated: 2026-04-18
status: current
domain: technical
---

# Architecture

High-level architecture of King's Road. This is the single source of truth for data-flow, build pipeline, and code layout. `CLAUDE.md` and `AGENTS.md` link here rather than repeating these details.

## Overview

King's Road is a config-driven RPG engine. Content is authored as JSON, validated against Zod schemas, compiled into a SQLite database at build time, consumed by a Koota ECS world at runtime, and rendered by React Three Fiber. The web target uses Vite 7 directly; the native target uses Capacitor 7 wrapping the same `dist/`.

```
┌──────────────────────────────────────────────────────────────────┐
│                        Content Layer                              │
│  Zod Schemas (src/schemas/) --> JSON Trove (content/)             │
│  validate-content.ts: schema conformance + referential integrity  │
├──────────────────────────────────────────────────────────────────┤
│                        Build Pipeline                             │
│  compile-content-db.ts --> SQLite DB                             │
│    web:    sql.js (WASM, bundled into public/)                   │
│    native: @capacitor-community/sqlite                           │
│  Drizzle ORM provides type-safe access for both targets          │
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
│                        UI Layer (diegetic-first)                  │
│  MainMenu | LoadingOverlay | DialogueBox | PauseMenu             │
│  Diegetic HUD (vignette health, belt inventory, manuscript HUD)  │
│  MobileControls (virtual joystick + action buttons)              │
├──────────────────────────────────────────────────────────────────┤
│                        State Layer                                 │
│  Zustand: gameStore, worldStore, questStore, combatStore,        │
│           inventoryStore, settingsStore                           │
│  (Migrating to Koota — see docs/plans/2026-04-18-koota-migration.md) │
└──────────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. Config-Driven Content

All game content (quests, NPCs, features, encounters, items, pacing) is defined as JSON files in `content/`. Zod schemas in `src/schemas/` define the shape of every content type. Nothing is hardcoded — the engine renders whatever valid config it receives.

### 2. Schema-First Validation

The validation pipeline (`scripts/validate-content.ts`) runs before deployment:
- Schema conformance (types, lengths, enums)
- Referential integrity (quest prerequisites exist, anchors are valid)
- A/B branch coverage for meso/macro quests
- Dialogue word count minimums
- Duration estimation (paper playtesting heuristics)
- Substance scoring (dialogue density per quest)

### 3. ECS-First Game State

New game state uses Koota ECS traits, not Zustand. The Zustand stores are legacy from the original prototype and are being migrated (see `docs/plans/2026-04-18-koota-migration.md`). Koota traits are composable, queryable, and avoid the React re-render overhead of store subscriptions.

### 4. Instanced Rendering

Static world geometry uses `THREE.InstancedMesh` to batch draw calls. A single instanced mesh renders thousands of trees, rocks, or building blocks with one draw call.

### 5. Chunk-Based Streaming

The world is divided into 120x120 unit chunks. Only chunks near the player are loaded, keeping memory constant regardless of world size.

### 6. Diegetic HUD

The game is mobile-first. HUD elements are embedded in the world: health via screen vignette and heartbeat sound, inventory items on the character's belt/back, dialogue as illuminated-manuscript speech bubbles anchored to the speaker. Panel-style overlays are styled as vellum, not game menus. See `docs/DESIGN.md` for the full HUD spec.

## Build Pipeline

```
pnpm dev / pnpm build
    |
    ├── predev/prebuild:
    │   ├── node copywasm.js        → copies sql-wasm.wasm to public/
    │   └── tsx compile-content-db.ts → compiles content/ into public/game.db
    |
    └── vite build (or vite dev server)
        → dist/   (web output)

pnpm build:native
    |── CAPACITOR=true vite build   → dist/ with relative base paths
    └── cap sync                    → copies dist/ into android/ and ios/

pnpm native:android:debug
    └── cap sync android && cd android && ./gradlew assembleDebug
```

## Data Flow

### Content Pipeline

```
Author (human or AI agent)
    |
    v
JSON files in content/
    |
    v
validate-content.ts (Zod + referential integrity)
    |
    v
compile-content-db.ts → public/game.db (SQLite)
    |
    ├── Web runtime: sql.js loads game.db → in-memory Maps
    └── Native runtime: @capacitor-community/sqlite reads game.db
                |
                v
        src/db/content-queries.ts → typed queries
                |
                v
        Koota ECS entities (traits assigned from config)
                |
                v
        R3F rendering (instanced meshes, NPCs, features)
```

### Runtime Input → State → Render

```
┌──────────────┐     reads      ┌──────────────┐
│   useInput   │ ────────────→  │  Game Store  │
│  (src/hooks) │     writes     │  (Zustand)   │
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

## Directory Structure

```
app/                                 # All TSX entry points, scene, systems, UI
├── main.tsx                         # Vite entry
├── App.tsx                          # Root React tree (WorldProvider, etc.)
├── Game.tsx                         # Menu vs active game state
├── ErrorBoundary.tsx
├── scene/
│   ├── GameScene.tsx                # R3F Canvas + post-processing
│   ├── Chunk.tsx                    # Instanced mesh rendering per chunk
│   ├── Building.tsx                 # Factory-built structures
│   ├── NPC.tsx                      # Chibi character with idle animation
│   ├── Monster.tsx                  # Monster entity component
│   ├── Feature.tsx                  # Roadside point of interest
│   ├── DungeonRenderer.tsx          # Dungeon room rendering
│   ├── Relic.tsx                    # Collectible with float/glow animation
│   ├── Environment.tsx              # Sky, lighting, fog, day/night, weather
│   ├── Foliage.tsx                  # Instanced trees and vegetation
│   ├── RoadSurface.tsx              # Road mesh
│   └── OceanPlane.tsx               # Horizon ocean plane
├── systems/
│   ├── PlayerController.tsx         # Movement, physics, camera
│   ├── ChunkManager.tsx             # Chunk streaming, entity spawning
│   ├── InteractionSystem.tsx        # NPC detection and dialogue trigger
│   ├── QuestSystem.tsx              # Quest step execution and progression
│   ├── EncounterSystem.tsx          # Combat encounter triggers
│   ├── DungeonEntrySystem.tsx       # Dungeon transitions
│   ├── WeatherSystem.tsx            # Weather state transitions
│   ├── AudioSystem.tsx              # Tone.js ambient audio
│   ├── FeatureSpawner.tsx           # Roadside feature placement
│   └── CombatFeedback.tsx           # Visual combat feedback
└── ui/
    ├── MainMenu.tsx                 # Title screen with seed phrase
    ├── GameHUD.tsx                  # Diegetic health / location / time
    ├── DialogueBox.tsx              # Illuminated-manuscript NPC conversation
    ├── PauseMenu.tsx
    ├── SettingsPanel.tsx            # Audio/display/controls tabs
    ├── QuestLog.tsx
    ├── InventoryScreen.tsx
    ├── Minimap.tsx
    ├── CombatHUD.tsx
    ├── DeathOverlay.tsx
    ├── MobileControls.tsx           # Virtual joystick + action buttons
    ├── LoadingOverlay.tsx
    └── ErrorOverlay.tsx

src/                                 # Logical subpackages (no game/ nesting)
├── schemas/                         # Zod schemas (source of truth for content shapes)
│   ├── world.schema.ts              # RoadSpineSchema, AnchorPointSchema, RegionSchema
│   ├── quest.schema.ts              # QuestDefinitionSchema with A/B branching
│   ├── npc.schema.ts                # NPCDefinitionSchema, NPCArchetype enum
│   ├── npc-blueprint.schema.ts      # Named story NPCs
│   ├── feature.schema.ts            # FeatureDefinitionSchema, FeatureTier enum
│   ├── building.schema.ts           # BuildingArchetype for town construction
│   ├── town.schema.ts               # TownConfig: layout, NPCs, buildings
│   ├── monster.schema.ts            # MonsterArchetype with stats and appearance
│   ├── dungeon.schema.ts            # DungeonLayout with room graphs
│   ├── encounter.schema.ts          # Narrative encounter definitions
│   ├── encounter-table.schema.ts    # Random encounter pools
│   ├── item.schema.ts               # ItemDefinitionSchema
│   ├── pacing.schema.ts             # PacingConfigSchema for feature intervals
│   ├── weather.schema.ts            # Weather system configuration
│   ├── dialogue.schema.ts           # DialogueLine validation
│   ├── skill-tree.schema.ts         # Player skill tree perks
│   ├── crafting.schema.ts           # Crafting recipes
│   ├── kingdom.schema.ts            # Kingdom-level world structure
│   └── game-config.schema.ts        # Master config combining all sub-schemas
│
├── ecs/                             # Koota ECS layer
│   ├── world.ts                     # createWorld() — single instance
│   ├── traits/                      # Composable data components
│   │   ├── spatial.ts               # Position, Velocity, Rotation
│   │   ├── player.ts                # IsPlayer, Health, Stamina, Movement, etc.
│   │   ├── quest.ts                 # QuestLog, IsQuestGiver
│   │   ├── npc.ts                   # IsNPC, NPCArchetype, Dialogue, Interactable
│   │   └── pacing.ts                # RoadPosition, IsOnRoad, IsAnchor, IsFeature
│   └── actions/                     # Entity spawning and state mutations
│
├── db/                              # Database layer
│   ├── schema.ts                    # Drizzle: content tables + save state tables
│   ├── content-queries.ts           # Type-safe queries for content data
│   ├── load-content-db.ts           # DB initialization at runtime
│   └── save-service.ts              # Save slot management
│
├── stores/                          # Zustand stores (being migrated to Koota)
│   ├── gameStore.ts                 # Core game state (position, time, seed)
│   ├── worldStore.ts                # Chunk data, AABBs, interactables
│   ├── questStore.ts                # Active/completed quests
│   ├── combatStore.ts               # Combat state
│   ├── inventoryStore.ts            # Player inventory
│   └── settingsStore.ts             # Audio/display/control settings (localStorage)
│
├── types/
│   └── game.ts                      # Core shared TypeScript types
│
├── world/                           # World generation logic
│   ├── road-spine.ts                # Road spine loader with Zod validation
│   ├── pacing-engine.ts             # Deterministic feature placement
│   ├── dungeon-generator.ts         # Procedural dungeon room graphs
│   ├── town-layout.ts               # Town building placement
│   ├── kingdom-gen.ts               # Kingdom-level world structure
│   ├── road-network.ts              # Road network connections
│   ├── terrain-gen.ts               # Simplex noise terrain
│   ├── simplex.ts                   # Simplex noise implementation
│   ├── feature-placement.ts         # Feature placement on/off road
│   ├── dungeon-registry.ts          # Dungeon anchor assignments
│   ├── loot-resolver.ts             # Loot table resolution
│   └── quest-resolver.ts            # Quest trigger evaluation
│
├── factories/                       # Entity factories
│   ├── building-factory.ts          # BuildingArchetype → Three.js geometry
│   ├── npc-factory.ts               # NPCDefinition → chibi entity
│   ├── monster-factory.ts           # MonsterArchetype → monster entity
│   ├── chibi-generator.ts           # Chibi character geometry
│   └── face-texture.ts              # Procedural NPC face textures
│
├── audio/
│   ├── ambient-mixer.ts             # Tone.js ambient layer management
│   └── layer-factory.ts             # Audio layer instantiation
│
├── hooks/
│   └── useInput.ts                  # Keyboard, mouse, touch input
│
├── input/                           # Input system primitives
├── shaders/                         # GLSL shader files
├── utils/
│   ├── random.ts                    # Seeded RNG (mulberry32, cyrb128)
│   └── textures.ts                  # Procedural canvas textures
├── lib/                             # Shared utilities
├── entities/                        # ECS entity templates
└── benchmarks/                      # Vitest bench files

content/                             # JSON content trove
├── world/road-spine.json            # 6 anchors, 30km road
├── main-quest/                      # Chapter JSONs
├── side-quests/                     # macro/, meso/, micro/
├── npcs/                            # NPC archetype definition files
├── features/                        # Roadside feature definitions
├── buildings/                       # Building archetype configs
├── towns/                           # Town configuration files
├── monsters/                        # Monster archetype configs
├── dungeons/                        # Dungeon layout files
├── encounters/                      # Narrative encounter definitions
└── CONTRIBUTING.md                  # Authoring guide and tone rules

scripts/
├── validate-content.ts              # Content validation pipeline
├── compile-content-db.ts            # Compile JSON content to SQLite
└── assemble-game-config.ts          # Assemble master game config
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
3. Add schema routing in `scripts/validate-content.ts`
4. Create content JSON in `content/`

### Adding New ECS Systems

1. Define traits in `src/ecs/traits/`
2. Create system component in `app/systems/`
3. Add to `SceneContent` in `app/scene/GameScene.tsx`

### Adding New Renderers

1. Create component in `app/scene/`
2. Use instanced meshes for repeated geometry
3. Add collision AABBs if the object is solid
