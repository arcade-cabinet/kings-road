---
title: AGENTS.md
updated: 2026-04-09
status: current
domain: technical
---

# AGENTS.md

Extended AI agent operating protocols for King's Road.

## Project Overview

King's Road is a config-driven 3D RPG. A player walks the King's Road from Ashford to Grailsend seeking the Holy Grail. Content is defined as Zod-validated JSON, compiled into a SQLite database, consumed by a Koota ECS world, and rendered with React Three Fiber.

## Architecture Pipeline

```
Zod Schemas (src/schemas/)
    |
    v
JSON Content (content/)  -->  validate-content.ts
    |
    v
SQLite DB (src/db/)       -->  compile-content-db.ts (Drizzle ORM)
    |
    v
Koota ECS (src/ecs/)     -->  traits, actions, world
    |
    v
React Three Fiber         -->  GameScene, Chunks, Factories
    |
    v
Zustand (stores)          -->  game, world, quest, combat, inventory, settings
```

## Rendering Pipeline

```
Game.tsx
└── GameScene.tsx (Canvas)
    ├── SceneInit (scene background)
    ├── Environment.tsx (Sky, lighting, fog, day/night, weather)
    ├── ChunkManager.tsx (world streaming)
    │   ├── Chunk.tsx (instanced meshes)
    │   ├── Building.tsx (factory-built structures)
    │   ├── NPC.tsx (chibi factory characters)
    │   └── Feature.tsx (roadside points of interest)
    ├── PlayerController.tsx (physics, camera)
    ├── InteractionSystem.tsx (NPC detection)
    ├── QuestSystem.tsx (quest step executor)
    ├── EncounterSystem.tsx (combat triggers)
    └── AudioSystem.tsx (ambient layers, Tone.js)
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/schemas/` | Zod schemas defining all content types |
| `src/ecs/` | Koota ECS world, traits, and actions |
| `src/db/` | Drizzle ORM schema and SQLite loader |
| `src/game/components/` | R3F 3D components and UI overlays |
| `src/game/systems/` | Game logic (no direct visual output) |
| `src/game/world/` | World generation: road spine, pacing, dungeon, town, kingdom |
| `src/game/factories/` | Building, NPC, monster, chibi-generator |
| `src/game/audio/` | Ambient mixer, audio layer factory |
| `src/game/stores/` | Zustand stores |
| `content/` | JSON content trove |
| `scripts/` | Validation and build scripts |

## Content System

### Schemas (src/schemas/)

| Schema file | Validates |
|-------------|-----------|
| `world.schema.ts` | Road spine, anchor points, biome regions |
| `quest.schema.ts` | Macro/meso/micro quests with A/B branching |
| `npc.schema.ts` | NPC archetype definitions |
| `npc-blueprint.schema.ts` | Named story NPCs |
| `feature.schema.ts` | Roadside features (ambient/minor/major) |
| `building.schema.ts` | Building archetypes |
| `town.schema.ts` | Town configurations |
| `monster.schema.ts` | Monster archetypes |
| `dungeon.schema.ts` | Dungeon layouts |
| `encounter.schema.ts` | Narrative encounter definitions |
| `encounter-table.schema.ts` | Random encounter pools |
| `item.schema.ts` | Item definitions |
| `pacing.schema.ts` | Pacing intervals for feature placement |
| `weather.schema.ts` | Weather system config |
| `dialogue.schema.ts` | Dialogue line validation |
| `skill-tree.schema.ts` | Player skill tree perks |
| `crafting.schema.ts` | Crafting recipes |
| `kingdom.schema.ts` | Kingdom-level world structure |
| `game-config.schema.ts` | Master config combining sub-schemas |

### Adding Quests

1. Create a JSON file in the appropriate `content/` subdirectory
2. Follow `src/schemas/quest.schema.ts`
3. Reference valid anchors from `content/world/road-spine.json`
4. See `content/CONTRIBUTING.md` for tone guide and examples
5. Validate: `npx tsx scripts/validate-content.ts`

### Quest Tiers

- **macro**: 1-2 hours, multi-location, A/B branches required
- **meso**: 15-45 minutes, single location, A/B branches required
- **micro**: 5-15 minutes, roadside encounter, linear steps allowed

### Adding NPCs

1. Create JSON in `content/npcs/`
2. Follow `src/schemas/npc.schema.ts`
3. Valid archetypes: blacksmith, innkeeper, merchant, wanderer, healer, knight, hermit, farmer, priest, noble, bandit, scholar

### Adding Buildings

1. Create JSON in `content/buildings/`
2. Follow `src/schemas/building.schema.ts`
3. Building factory (`src/game/factories/building-factory.ts`) instantiates from config

### Adding Monsters

1. Create JSON in `content/monsters/`
2. Follow `src/schemas/monster.schema.ts`
3. Monster factory (`src/game/factories/monster-factory.ts`) instantiates from config

## ECS Architecture (Koota)

### Traits (src/ecs/traits/)

- **Spatial**: `Position`, `Velocity`, `Rotation`
- **Player**: `IsPlayer`, `Health`, `Stamina`, `Movement`, `PlayerInput`, `DistanceTraveled`
- **Quest**: `QuestLog`, `IsQuestGiver`
- **NPC**: `IsNPC`, `NPCArchetype`, `Dialogue`, `Interactable`
- **Pacing**: `RoadPosition`, `IsOnRoad`, `IsAnchor`, `IsFeature`

### Actions (src/ecs/actions/)

- `spawnPlayer(x, y, z)` -- creates player entity with all traits
- `updateInput(entity, input)` -- updates player input state

### World

`src/ecs/world.ts` -- single `createWorld()` instance wrapped in `WorldProvider` at the app root.

## Code Conventions

### Formatting

- Biome for formatting and linting (not Prettier/ESLint)
- Single quotes, semicolons always
- 2-space indent

### State Management

- Use Koota traits for new game state (not Zustand)
- Zustand stores for UI-adjacent state (settings, HUD display values)
- Use selectors to minimize re-renders: `useGameStore(state => state.specificValue)`

### React Three Fiber

- Use `useFrame` for animation/physics, not `requestAnimationFrame`
- Access Three.js objects via refs, not state
- Dispose of dynamic geometries/materials on unmount
- All static geometry uses `THREE.InstancedMesh`

### TypeScript

- Strict mode enabled
- Core types in `src/game/types.ts`
- Schema types inferred from Zod: `z.infer<typeof SchemaName>`

### Factory Pattern

Building, NPC, and monster factories follow: JSON archetype config → ECS entity + 3D geometry.
Face textures are generated via canvas (`src/game/factories/face-texture.ts`).
Chibi character generator: `src/game/factories/chibi-generator.ts`.

## Database Layer

Content compiled into SQLite at build time via `scripts/compile-content-db.ts`.
Drizzle schema at `src/db/schema.ts`. Content queries at `src/db/content-queries.ts`.
Save service at `src/db/save-service.ts`.

## Testing

```bash
pnpm test                # Vitest unit tests
pnpm test:ct             # Playwright component tests
pnpm test:e2e            # Playwright e2e tests
pnpm tsc --noEmit        # Type check
npx tsx scripts/validate-content.ts  # Content validation
```

## Do Not

- Create new React context providers (use Koota or Zustand)
- Use `setInterval`/`setTimeout` for game loops (use `useFrame`)
- Store Three.js objects in React state (use refs)
- Add unused dependencies
- Use grimdark, edgy, or nihilistic tone in any content
- Put content JSON in `src/` (it belongs in `content/`)
- Exceed 300 LOC per file
