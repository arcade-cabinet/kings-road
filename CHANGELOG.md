---
title: Changelog
updated: 2026-04-09
status: current
domain: technical
---

# Changelog

All notable changes to King's Road will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `docs/TESTING.md`, `docs/STATE.md`, `docs/LORE.md` -- standardized documentation
- YAML frontmatter on all root and docs markdown files

### Changed

- Updated CLAUDE.md, AGENTS.md, README.md for current codebase state (Expo/Metro build, full factory systems, SQLite save layer)
- Removed stale plan/implementation documents from `docs/plans/`

---

## [1.3.0] - 2026-04-09

### Added (feat: Fix web build and integrate 3DPSX Chibi NPCs -- #13)

- 3DPSX chibi NPC character system via `chibi-generator.ts`
- Face texture generation for NPC caricature portraits (`face-texture.ts`)
- NPC pool integration tests

### Fixed

- Web build compatibility for GitHub Pages

---

## [1.2.0] - 2026-03-14

### Added (feat: migrate web build from Vite to Expo/Metro -- #11)

- Expo SDK 55 as build platform, replacing standalone Vite
- `expo-sqlite` for save state and content DB
- Drizzle ORM (`drizzle-orm`, `drizzle-kit`) for type-safe SQLite access
- `src/db/schema.ts` -- content tables (monsters, items, quests, towns, etc.) and save state tables (save slots, player state, quest progress, inventory, chunk deltas, unlocked perks)
- `scripts/compile-content-db.ts` -- build-time content compilation to SQLite
- `src/db/save-service.ts` -- save slot management
- Tone.js audio system (`src/game/audio/`)
- Weather system (`src/game/systems/WeatherSystem.tsx`, `src/schemas/weather.schema.ts`)
- Skill tree system (`src/schemas/skill-tree.schema.ts`)
- Crafting schema (`src/schemas/crafting.schema.ts`)
- Kingdom-level world generation (`src/game/world/kingdom-gen.ts`)
- Dungeon generator (`src/game/world/dungeon-generator.ts`)
- Town layout system (`src/game/world/town-layout.ts`)
- Road network system (`src/game/world/road-network.ts`)

---

## [1.1.0] - 2026-03-09

### Added (feat: dungeon persistence, combat fixes, kingdom map gen -- #9)

- `DungeonEntrySystem.tsx` -- dungeon transitions
- `EncounterSystem.tsx` -- combat trigger system
- `combat-resolver.ts` + tests -- deterministic combat resolution
- `quest-step-executor.ts` + tests -- quest step state machine
- `QuestSystem.tsx` -- quest progression
- `inventoryStore.ts`, `combatStore.ts`, `questStore.ts`, `worldStore.ts`, `settingsStore.ts`
- Monster factory (`src/game/factories/monster-factory.ts`)
- Building factory (`src/game/factories/building-factory.ts`)
- NPC factory (`src/game/factories/npc-factory.ts`)
- Loot resolver (`src/game/world/loot-resolver.ts`)
- `InventoryScreen.tsx`, `Minimap.tsx`, `DeathOverlay.tsx`, `CombatHUD.tsx`, `PauseMenu.tsx`, `SettingsPanel.tsx`
- `Portrait3D.tsx` for NPC portraits
- Dungeon renderer and dungeon props

---

## [1.0.0] - 2026-03-03

### Added (feat: Engine v2 -- config-driven blueprint architecture -- #5)

- Building, NPC, and monster schema layer (`src/schemas/building.schema.ts`, `npc-blueprint.schema.ts`, `monster.schema.ts`, `town.schema.ts`, `kingdom.schema.ts`, `encounter-table.schema.ts`)
- Factory pattern for all entity types
- Content trove with NPC archetypes, features, and quests (`content/`)
- Pacing engine for deterministic feature placement (`src/game/world/pacing-engine.ts`)
- Road spine loader with Zod validation (`src/game/world/road-spine.ts`)
- Terrain and simplex noise generation (`src/game/world/terrain-gen.ts`, `simplex.ts`)
- `validate-trove.ts` content validation script

### Changed (feat: King's Road -- pastoral redesign -- d15b2d2)

- Rebranded from generic Vite/Aetheria scaffold to King's Road
- Warm cream color palette replacing dark fantasy aesthetic
- Typography: Lora (display) + Crimson Text (body), replacing Cinzel
- Scene: sky blue (`#87CEEB`) replacing black void
- Lighting: warm golden sunlight replacing cold blue ambient
- Post-processing: reduced vignette intensity (0.6 to 0.3)
- Seed vocabulary: pastoral words replacing grimdark
- NPC dialogue: pastoral pilgrimage theme replacing dark fantasy
- HUD: warm parchment palette
- Removed 40+ unused npm dependencies (radix-ui, cmdk, sonner, recharts, etc.)
- Fixed THREE.js shadow map deprecation warning

### Added (initial engine -- 60157af to d15b2d2)

- Koota ECS world, traits, and actions (`src/ecs/`)
- Zod schemas: world, quest, NPC, feature, item, encounter, pacing (`src/schemas/`)
- Content validation pipeline (`scripts/validate-trove.ts`)
- Road spine JSON with 6 anchor points (`content/world/road-spine.json`)
- Game Store (Zustand) for centralized state
- Player Controller: first-person movement with AABB collision, head bob, sprint/walk
- Chunk Manager: dynamic chunk loading/unloading, NPC spawning
- Environment System: day/night cycle, sun/moon, player lantern, fog
- Interaction System: raycasting-based NPC detection
- Seed-based procedural world generation (mulberry32 PRNG, cyrb128 hash)
- Instanced mesh rendering for static geometry
- NPC component with idle animation
- Collectible (Relic) with floating animation
- Main menu, HUD, dialogue box, mobile controls
- SMAA, bloom, vignette post-processing
- Keyboard, mouse drag, touch joystick input
