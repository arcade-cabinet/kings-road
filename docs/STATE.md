---
title: State
updated: 2026-04-09
status: current
domain: context
---

# State

Current development state as of 2026-04-09.

## What Is Done

### Engine Core

- Config-driven content pipeline: Zod schemas validate JSON content trove
- SQLite content database: `compile-content-db.ts` compiles all content to SQLite at build time; Drizzle ORM provides type-safe queries
- Save system: save slots, player state, quest progress, inventory, chunk deltas, unlocked perks -- all persisted to SQLite
- Koota ECS: world, traits, and actions for player, NPCs, quests, pacing
- React Three Fiber rendering: instanced meshes, procedural textures, SMAA/bloom/vignette

### World Generation

- Road spine: 6 anchor points from Ashford (0) to Grailsend (28,000)
- Pacing engine: deterministic feature placement along the road
- Dungeon generator: procedural room graphs assigned to dungeon anchors
- Town layout: building placement from archetype configs
- Kingdom gen: region-level world structure
- Road network: connection graph between anchors
- Terrain gen: simplex noise heightmap
- Chunk streaming: 120-unit chunks loaded within VIEW_DISTANCE of player

### Factory Systems

- Building factory: BuildingArchetype JSON -> Three.js geometry
- NPC factory: NPCDefinition -> chibi entity with archetype accessories
- Monster factory: MonsterArchetype -> monster entity
- Chibi generator: procedural chibi character geometry
- Face texture: canvas-based procedural NPC face textures

### Schemas (19 schemas)

world, quest, npc, npc-blueprint, feature, building, town, monster, dungeon, encounter, encounter-table, item, pacing, weather, dialogue, skill-tree, crafting, kingdom, game-config

### Game Systems

- PlayerController: first-person movement, AABB collision, head bob, sprint/walk/jump
- ChunkManager: chunk streaming, entity spawn/despawn
- Environment: day/night cycle, sun/moon arc, player lantern, weather
- InteractionSystem: raycasting NPC detection, dialogue trigger
- QuestSystem: quest step execution, branch tracking
- EncounterSystem: combat encounter triggers
- DungeonEntrySystem: dungeon transitions
- AudioSystem: Tone.js ambient layer management
- WeatherSystem: weather state transitions

### UI Components

MainMenu, GameHUD, DialogueBox, PauseMenu, SettingsPanel, QuestLog, InventoryScreen, Minimap, CombatHUD, DeathOverlay, MobileControls, LoadingOverlay, ErrorOverlay, Portrait3D

### Testing

- Unit tests colocated with all major logic modules
- Playwright component tests for all UI components (with snapshots)
- E2E test in `e2e/game.spec.ts`
- Content integration tests
- 80% coverage thresholds enforced by CI

### Build and Deployment

- Vite 7 + Capacitor 7 for web and native (`vite build`)
- GitHub Actions CI: lint, type-check, test, content validation
- GitHub Actions CD: deploy to GitHub Pages on push to main
- Dependabot: weekly dependency updates

### Content Trove

- `content/world/road-spine.json` -- 6 anchors defined
- NPC archetype definitions in `content/npcs/`
- Building archetypes in `content/buildings/`
- Town configurations in `content/towns/`
- Main quest chapters in `content/main-quest/`
- Side quests (macro/meso/micro) in `content/side-quests/`
- Roadside features in `content/features/`
- Monsters in `content/monsters/`
- Encounters in `content/encounters/`
- Dungeons in `content/dungeons/`
- Loot tables in `content/loot/`

## What Is In Progress

### Chibi NPC Integration (most recent -- PR #13)

3DPSX chibi character system merged. Face textures and NPC pool integration tests in place. Need to expand NPC archetype visual variety.

### Pending Asset Integration

`pending-integration/` contains zip archives waiting to be unpacked and integrated:
- `Axe.zip`
- `Fantasy Mega Pack.zip`
- `HandsPack.zip`
- `PSX Horror-Fantasy Megapack.zip` (review for tone compatibility)
- `PSX-Knives.zip`
- `Villager NPCs.zip`

### Known Issues

- The Zustand stores under `src/stores/` have not been migrated to Koota yet; see `docs/plans/2026-04-18-koota-migration.md` for the plan.
- The game currently has no equippable gear — weapon models sit in the gitignored `pending-integration/` directory awaiting review/integration.
- `pending-integration/*.zip` contains asset packs that still need per-pack curation before copying into `public/assets/`.

## What Is Next

### Priority 1: Playability

The `playability-gaps.test.ts` test (in `src/world/`) identified that road tiles may have insufficient ambient content. Roadside features (milestone markers, wayside shrines, crossroads signs) need to spawn on or adjacent to road tiles, not just in wilderness.

### Priority 2: Asset Integration

Unpack and integrate the pending-integration asset archives. Use the hybrid CC0 technique (see `docs/HYBRID_PROCEDURAL_CC0.md`) -- load GLB, extract nodes, map procedurally.

### Priority 3: Content Volume

Current content trove has schema-valid JSON but may lack density. Target per `content/CONTRIBUTING.md`:
- 1-2 micro quests per 1,000 road units
- 1 meso quest per anchor
- Macro quests tied to main story chapters

### Priority 4: Save System Polish

The save service is implemented but save slot selection UI is not wired into the main menu. Need a save slot picker screen before the game starts.

### Priority 5: Combat Depth

Combat resolver is implemented but EncounterSystem is minimal. Skills from the skill tree are not yet applied to combat modifiers.

## Architecture Migrations In Progress

| From | To | Status |
|------|----|--------|
| Zustand `gameStore` | Koota ECS traits | Partial; core game state still in Zustand (see `docs/plans/2026-04-18-koota-migration.md`) |
| Vite raw JSON imports | SQLite content DB | Complete |
| Panel-style HUD overlays | Diegetic HUD | In progress (see `docs/plans/2026-04-18-diegetic-hud.md`) |
