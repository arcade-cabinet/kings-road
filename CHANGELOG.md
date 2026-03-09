# Changelog

All notable changes to King's Road will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Config-Driven Content System
- **Zod schema layer** (`src/schemas/`) -- 8 schemas defining all game content
  - `world.schema.ts` -- Road spine, anchor points, regions, biomes
  - `quest.schema.ts` -- Macro/meso/micro tiers with A/B branching
  - `npc.schema.ts` -- NPC archetypes with name and greeting pools
  - `feature.schema.ts` -- Ambient/minor/major roadside features
  - `item.schema.ts` -- Key items, consumables, equipment, quest items
  - `encounter.schema.ts` -- Combat, puzzle, social, stealth, survival
  - `pacing.schema.ts` -- Pacing intervals for feature placement
  - `game-config.schema.ts` -- Master config combining all sub-schemas

#### Koota ECS Architecture
- **ECS world** (`src/ecs/world.ts`) -- Koota world instance
- **Traits** (`src/ecs/traits/`) -- Position, Velocity, Rotation, Health, Stamina, Movement, PlayerInput, DistanceTraveled, QuestLog, IsQuestGiver, IsNPC, NPCArchetype, Dialogue, Interactable, RoadPosition, IsOnRoad, IsAnchor, IsFeature
- **Actions** (`src/ecs/actions/`) -- Player spawning and input handling
- **WorldProvider** -- Koota React integration at app root

#### Content Pipeline
- **Validation script** (`scripts/validate-trove.ts`) -- Validates all JSON content against Zod schemas, checks referential integrity, estimates quest duration, verifies A/B branch coverage, calculates substance score
- **Content contribution guide** (`content/CONTRIBUTING.md`) -- Tone guide, schema examples, length requirements, enum reference
- **Road spine** (`content/world/road-spine.json`) -- 6 anchors from Ashford to Grailsend
- **Ralph-TUI PRD** (`docs/prd/kings-road-content-generation.md`) -- Content generation specification

### Changed

#### Rebrand to King's Road
- Package renamed from generic Vite scaffold to `kings-road`
- HTML title updated to "King's Road"
- Main menu: "Aetheria / Infinite RPG Engine" replaced with "King's Road / Seek the Holy Grail"
- Pastoral warm color palette replacing dark fantasy aesthetic
  - Background: `#030202` (black) to `#f5f0e8` (warm cream)
  - Text: light-on-dark to dark-on-light (warm charcoal `#3d3a34`)
  - Accents: blood red to honey gold and warm brown
- Typography: Cinzel replaced with Lora (display) and Crimson Text (body)
- Scene: black void replaced with sky blue (`#87CEEB`), drei Sky component
- Lighting: cold blue ambient to warm golden sunlight (`#fff8e7`, `#ffd700`)
- Post-processing: reduced vignette darkness (0.6 to 0.3)
- Seed phrase vocabulary: grimdark words to pastoral (Golden, Verdant, Meadow, Glen)
- Procedural textures: dark gray stone to honey limestone, warm oak, lush green grass
- NPC dialogue: dark fantasy removed, pastoral pilgrimage theme
- BloodGem renamed to Relic with warm visual treatment
- HUD: dark overlay to warm parchment palette
- DialogueBox and MobileControls: warm palette treatment

#### Cleanup
- Removed dead `next` and `next-themes` tsconfig path aliases
- Removed Onlook/PageFreezer injection scripts from `index.html`
- Fixed THREE.js shadow map deprecation warning

### Fixed
- White screen after starting new game (scene background initialization)
- Game state properly resets on new game via `resetGame` action

### Removed
- 40+ unused npm dependencies (radix-ui, cmdk, sonner, recharts, etc.)
- Unused type declaration files (next.d.ts, styled-jsx.d.ts, modules.d.ts)
- ThemeProvider wrapper
- styled-jsx babel plugin
- Unused CSS animations and shadcn theme variables

## [1.0.0] - 2024-01-XX

### Added

#### Core Systems
- **Game Store** (`gameStore.ts`) -- Zustand-based centralized state management
- **Player Controller** (`PlayerController.tsx`) -- First-person movement with AABB collision, head bob, sprint/walk
- **Chunk Manager** (`ChunkManager.tsx`) -- Dynamic chunk loading/unloading, NPC spawning, collision generation
- **Environment System** (`Environment.tsx`) -- Day/night cycle, directional sun/moon, player lantern, sky dome, fog
- **Interaction System** (`InteractionSystem.tsx`) -- Raycasting-based NPC detection with line-of-sight

#### World Generation
- Seed-based procedural generation (mulberry32 PRNG, cyrb128 hash)
- Chunk types: TOWN, ROAD, DUNGEON, WILD
- Modular building system (inn, blacksmith, houses)
- Procedural maze dungeons via random walk
- Per-chunk seeded RNG for reproducible worlds

#### 3D Components
- Instanced mesh rendering for static geometry
- NPC component with idle animation and type-specific accessories
- Collectible component with floating animation and glow

#### UI Components
- Main menu with seed phrase display
- HUD with health/stamina bars, location banner, time display
- Dialogue box with decorative corners
- Mobile controls with virtual joystick

#### Input System
- Keyboard (WASD/QE), mouse drag, touch joystick
- Sprint via joystick distance or mobile

#### Post Processing
- SMAA anti-aliasing, bloom, vignette
