---
title: State
updated: 2026-04-18
status: current
domain: context
---

# State

Current development state as of 2026-04-18 — v1.4.0 (v1 beta milestone) released.

## Most Recent Milestone: v1.4.0 (v1 beta)

Shipped 2026-04-18 via release-please. Web deployed to GitHub Pages, Android debug APK + iOS artifacts attached to the release. This marks the end of the v1 beta work stream; v1.5+ is the next planning horizon.

## What Is Done

### Engine Core

- Config-driven content pipeline: Zod schemas validate JSON content trove
- SQLite content database: `compile-content-db.ts` compiles all content to SQLite at build time; Drizzle ORM provides type-safe queries
- Save system: Capacitor SQLite on web (via `jeep-sqlite`) and native — single-table `save_slots(slotId, payload)` JSON upsert
- Koota ECS (pmndrs): all session game state lives in traits (no more Zustand). Subpackages: traits/, actions/, hooks/, world, item-registry
- React Three Fiber rendering: instanced meshes, authored PBR Polyhaven textures, SMAA/bloom/vignette postprocessing, @react-three/rapier kinematic character controller

### World Generation

- Road spine: 6 anchor points from Ashford (0) to Grailsend (28,000)
- Pacing engine: deterministic feature placement along the road
- Dungeon generator: procedural room graphs assigned to dungeon anchors
- Town layout: building placement from archetype configs
- Kingdom gen: `generateKingdom()` runs once at New Game, deterministic from (seed, kingdom-config.json)
- Road network: connection graph between anchors
- Terrain gen: simplex noise heightmap
- Chunk streaming: 120-unit chunks loaded within VIEW_DISTANCE of player

### Authored Assets (pure, no procgen appearance)

- 99 GLBs across 8 asset categories in `public/assets/` — Fantasy Mega Pack buildings/villagers/knight/bat/skeleton/bottles/books/crates/mine-props/nature/weapons, PSX Horror-Fantasy Megapack monsters, traps, hands
- 7 Polyhaven CC0 PBR texture sets (1k, diffuse + normal + roughness) at `public/textures/` — plaster, stone_block, thatch, wood, road, grass, cobblestone
- All NPCs driven by authored GLBs via `NPCDefinition.archetype` → `content/npcs/`
- All monsters driven by `MonsterArchetype.glb` → `content/monsters/`
- No runtime mesh/texture generation remains (chibi/face-texture/npc-factory procgen deleted)

### ECS Actions (Koota)

- Player: movement, combat, stamina/health, camera, input
- World/Kingdom: generation progress, tile queries
- Inventory / Equipment: slots, gold, equipped items
- Quest: active/completed/triggered lists with step progression
- Combat: encounter state, damage popups, loot summary
- Settings: audio/display persisted via `@capacitor/preferences` (debounced)

### Game Systems

- PlayerController: rapier-driven movement, camera, sprint/walk/jump
- ChunkManager: chunk streaming, entity spawn/despawn
- Environment: day/night cycle, sun/moon arc, player lantern, weather
- InteractionSystem: raycasting NPC detection, dialogue trigger
- QuestSystem: quest step execution, branch tracking
- EncounterSystem: weighted encounter rolls from content DB
- DungeonEntrySystem: dungeon transitions
- AudioSystem: Tone.js ambient layer management
- WeatherSystem: weather state transitions

### UI Components

- MainMenu with 21st.dev-inspired Continue card
- Diegetic HUD (DiegeticLayer): wound vignette, breath fog, heartbeat, belt pips — no chrome bars
- DialogueBox (illuminated-manuscript speech bubbles)
- PauseMenu, SettingsPanel, QuestLog, InventoryScreen, DeathOverlay, LoadingOverlay, ErrorOverlay, Portrait3D
- Responsive scaling — clamps to viewport on mobile + web

### Testing

- 946+ unit/component tests via Vitest
- Vitest browser mode for WebGL smoke + component integration
- Playwright for E2E (`e2e/game.spec.ts`)
- Content integration tests
- 80% coverage thresholds enforced by CI

### Build and Deployment

- Vite 7 + Capacitor 7 for web and native (`vite build`)
- GitHub Actions CI on PRs: lint, type-check, test, content validation, web build, APK build
- GitHub Actions CD on push to main: deploy to GitHub Pages
- GitHub Actions Release on release-please tag: publish web bundle, Android APK, iOS artifacts
- Dependabot: weekly dependency updates

### Error Handling Policy

Hard-fail to `ErrorBoundary` → `ErrorOverlay`. No silent fallbacks. Missing textures throw, corrupt saves throw, missing dungeon entrance rooms throw.

### Content Trove

- 26 monsters, 55 items, 5 encounter tables, 5 loot tables, 40 named NPCs, 21 NPC pools, 19 building archetypes, 6 towns, 25 features, 28 quests, 2 dungeons, 41 encounters — all schema-validated and compiled to `config/game.db` (500 KB) + `config/game-content.json` (268 KB)

## What Is Next (Post-Beta)

### P1 — Content Volume

Expand quest density (target per `content/CONTRIBUTING.md`: 1-2 micro quests per 1,000 road units, 1 meso quest per anchor, macro quests tied to main story chapters). Current trove is schema-valid but sparse in places.

### P2 — Save Slot Picker UI

Save service supports 4 slots (0 auto, 1-3 manual) but the slot picker UI before game start isn't implemented yet. Main menu shows only Continue for the most recent save.

### P3 — Combat Depth

Combat resolver + EncounterSystem are functional but the skill tree isn't wired to combat modifiers yet. Skills JSON exists; needs EncounterSystem hooks.

### P4 — Gear Equip Flow

Weapon/armor GLBs are integrated into inventory but the equip-from-menu flow has no polish pass. Viewmodel swap on equip works in dev; production polish pending.

### P5 — Audio Polish

Ambient layers are defined per-chunk-type via content JSON; dynamic mixing during combat/dialogue is minimal. Needs ducking rules.

## Architecture Status

| Area | Status |
|------|--------|
| Zustand → Koota migration | **Complete** (zustand removed from package.json in PR #48) |
| Procgen appearance → authored GLBs | **Complete** (chibi/face/npc factories deleted) |
| Canvas textures → Polyhaven PBR | **Complete** (PR #50 / v1.4.0) |
| IndexedDB saves → Capacitor SQLite | **Complete** |
| Panel HUD → Diegetic HUD | **Complete** (DiegeticLayer landed in v1.3.0) |
| Expo/Metro web → Vite+Capacitor | **Complete** |
