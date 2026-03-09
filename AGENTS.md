# AGENTS.md - AI Agent Guidelines

## Project Overview

King's Road is a config-driven 3D RPG engine. A player walks the King's Road from Ashford to Grailsend seeking the Holy Grail. Content is defined as Zod-validated JSON, consumed by a Koota ECS world, and rendered with React Three Fiber.

## Architecture

### Pipeline

```
Zod Schemas (src/schemas/)
    |
    v
JSON Content (content/)  -->  validate-trove.ts
    |
    v
Koota ECS (src/ecs/)     -->  traits, actions, world
    |
    v
React Three Fiber         -->  GameScene, Chunks, NPCs
    |
    v
Zustand (legacy store)   -->  gameStore.ts (being migrated to Koota)
```

### Rendering Pipeline

```
Game.tsx
└── GameScene.tsx (Canvas)
    ├── SceneInit (scene background)
    ├── Environment.tsx (Sky, lighting, fog, day/night)
    ├── ChunkManager.tsx (world streaming)
    │   └── Chunk.tsx (instanced meshes, NPCs)
    ├── PlayerController.tsx (physics, camera)
    └── InteractionSystem.tsx (NPC detection)
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/schemas/` | Zod schemas defining all content types |
| `src/ecs/` | Koota ECS world, traits, and actions |
| `src/game/components/` | R3F 3D components and UI overlays |
| `src/game/systems/` | Game logic (no visual output) |
| `src/game/stores/` | Zustand store (legacy, migrating to Koota) |
| `src/game/utils/` | RNG, world generation, procedural textures |
| `content/` | JSON content trove (quests, NPCs, features) |
| `scripts/` | Validation and build scripts |

## Content System

### Adding Quests

1. Create a JSON file in the appropriate `content/` subdirectory
2. Follow the schema shape from `src/schemas/quest.schema.ts`
3. Reference valid anchors from `content/world/road-spine.json`
4. See `content/CONTRIBUTING.md` for tone guide and examples
5. Validate: `npx tsx scripts/validate-trove.ts`

### Quest Tiers

- **macro**: 1-2 hours, multi-location, A/B branches required
- **meso**: 15-45 minutes, single location, A/B branches required
- **micro**: 5-15 minutes, roadside encounter, linear steps allowed

### Adding NPCs

1. Create a JSON file in `content/npcs/`
2. Follow `src/schemas/npc.schema.ts`
3. Valid archetypes: blacksmith, innkeeper, merchant, wanderer, healer, knight, hermit, farmer, priest, noble, bandit, scholar

### Adding Features

1. Create or edit files in `content/features/`
2. Follow `src/schemas/feature.schema.ts`
3. Tiers: ambient (background), minor (interactable), major (significant)

## ECS Architecture (Koota)

### Traits

Defined in `src/ecs/traits/`:

- **Spatial**: `Position`, `Velocity`, `Rotation`
- **Player**: `IsPlayer`, `Health`, `Stamina`, `Movement`, `PlayerInput`, `DistanceTraveled`
- **Quest**: `QuestLog`, `IsQuestGiver`
- **NPC**: `IsNPC`, `NPCArchetype`, `Dialogue`, `Interactable`
- **Pacing**: `RoadPosition`, `IsOnRoad`, `IsAnchor`, `IsFeature`

### Actions

Defined in `src/ecs/actions/`:

- `spawnPlayer(x, y, z)` -- creates player entity with all traits
- `updateInput(entity, input)` -- updates player input state

### World

`src/ecs/world.ts` -- single `createWorld()` instance wrapped in `WorldProvider` at the app root.

## Code Conventions

### Formatting

- Biome for formatting and linting
- Single quotes, semicolons always
- 2-space indent

### State Management

- Use Koota traits for new game state (not Zustand)
- The Zustand store in `gameStore.ts` is legacy -- it works but new features should use ECS
- Use selectors to minimize re-renders: `useGameStore(state => state.specificValue)`

### React Three Fiber

- Use `useFrame` for animation/physics, not `requestAnimationFrame`
- Access Three.js objects via refs
- Dispose of dynamic geometries/materials on unmount
- All static geometry uses `THREE.InstancedMesh`

### TypeScript

- Strict mode enabled
- Core types in `src/game/types.ts`
- Schema types inferred from Zod (`z.infer<typeof SchemaName>`)

## Mood Direction

Pastoral, romanticized medieval English. Warm cream backgrounds, golden sunlight, Lora/Crimson Text typography. No grimdark. See `docs/DESIGN.md` for the full color palette.

## Testing

```bash
pnpm test                # Vitest unit tests
pnpm test:e2e            # Playwright e2e tests
pnpm tsc --noEmit        # Type check
npx tsx scripts/validate-trove.ts  # Content validation
```

## Do Not

- Create new React context providers (use Koota or Zustand)
- Use `setInterval`/`setTimeout` for game loops (use `useFrame`)
- Store Three.js objects in React state (use refs)
- Add unused dependencies
- Use grimdark, edgy, or nihilistic tone in any content
- Put content JSON in `src/` (it belongs in `content/`)
