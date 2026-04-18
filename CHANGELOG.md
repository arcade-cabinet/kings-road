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

## [1.1.0](https://github.com/arcade-cabinet/kings-road/compare/kings-road-v1.0.0...kings-road-v1.1.0) (2026-04-18)


### Added

* add ECS actions for player, NPC, and quest management ([9554ced](https://github.com/arcade-cabinet/kings-road/commit/9554ced7a8b0a55a4c95197391da079cb5d841ab))
* add master game config schema combining all sub-schemas ([f2ac063](https://github.com/arcade-cabinet/kings-road/commit/f2ac0638a3c3de94fa28a737364d016708558072))
* add NPC, feature, item, encounter, pacing schemas ([db3ac7a](https://github.com/arcade-cabinet/kings-road/commit/db3ac7a0046338cf084adda34b9b9a009fd6b0f9))
* add pacing engine for deterministic feature placement (E2) ([188c443](https://github.com/arcade-cabinet/kings-road/commit/188c4438ad16f47383a4cea582b18138718d41fd))
* add quest schema — macro/meso/micro tiers with A/B branching ([964d5c2](https://github.com/arcade-cabinet/kings-road/commit/964d5c28a2295f1b43783275188243519712302c))
* add road spine loader with Zod validation and helpers (E1) ([58036fc](https://github.com/arcade-cabinet/kings-road/commit/58036fc504590cbe4634b51d7634d79088e8d38a))
* add trove validation pipeline and contribution guide ([9d58161](https://github.com/arcade-cabinet/kings-road/commit/9d58161606860cdd41d69afb29d9cb3141c30ec9))
* add world schema — road spine, anchor points, regions ([355356d](https://github.com/arcade-cabinet/kings-road/commit/355356debf667b3e10a9e766407833bb5275d892))
* add zod dependency, scaffold schema directory ([60157af](https://github.com/arcade-cabinet/kings-road/commit/60157afe969770e7aee82f2bc5b05376443b9242))
* Capacitor migration, app/src restructure, CI fixes, browser test harness ([#33](https://github.com/arcade-cabinet/kings-road/issues/33)) ([07392df](https://github.com/arcade-cabinet/kings-road/commit/07392dfe911bc9eb821a32b27cad41c16ae30090))
* complete content trove + NPC archetype caricature system ([#8](https://github.com/arcade-cabinet/kings-road/issues/8)) ([c947927](https://github.com/arcade-cabinet/kings-road/commit/c94792784a77471114925638f8273b8b580334ca))
* define core ECS traits -- player, spatial, quest, NPC, pacing ([6742117](https://github.com/arcade-cabinet/kings-road/commit/6742117a650b35d861e6ff80758f0b65f4a6381d))
* dungeon persistence, combat fixes, kingdom map gen ([#9](https://github.com/arcade-cabinet/kings-road/issues/9)) ([39ddd6a](https://github.com/arcade-cabinet/kings-road/commit/39ddd6addc7af5772bd4e881c494cc48b1f4b670))
* Engine v2 — config-driven blueprint architecture ([#5](https://github.com/arcade-cabinet/kings-road/issues/5)) ([f872535](https://github.com/arcade-cabinet/kings-road/commit/f872535ea71c7ddf21d5889063c984a108ccfa35))
* Fix web build and integrate 3DPSX Chibi NPCs ([#13](https://github.com/arcade-cabinet/kings-road/issues/13)) ([526bd80](https://github.com/arcade-cabinet/kings-road/commit/526bd80a33bc4d1d3511aa1702a72186e51964ae))
* install koota, create ECS game world ([fca2328](https://github.com/arcade-cabinet/kings-road/commit/fca2328bc1b6526d70ae4a1cf1b0fd52870b4563))
* King's Road — complete game engine with pastoral medieval redesign ([d15b2d2](https://github.com/arcade-cabinet/kings-road/commit/d15b2d26d8acb509078550341370d2ecb46080c1))
* landing polish, diegetic gameplay frame, app/ reorganization, self-hosted fonts ([#36](https://github.com/arcade-cabinet/kings-road/issues/36)) ([3fa3b85](https://github.com/arcade-cabinet/kings-road/commit/3fa3b852a36b5e3d20be57eec1519e111734fb3c))
* migrate web build from Vite to Expo/Metro ([#11](https://github.com/arcade-cabinet/kings-road/issues/11)) ([c85ec85](https://github.com/arcade-cabinet/kings-road/commit/c85ec8596723664d3aca4d5775646318902bda9c))
* refactor worldGen to be road-aware with optional roadSpine (E3) ([cfdcb2c](https://github.com/arcade-cabinet/kings-road/commit/cfdcb2c04754f3e2d8974713cdd7c0a88f8102d8))
* wire Koota WorldProvider into React app ([c2da24e](https://github.com/arcade-cabinet/kings-road/commit/c2da24e25d2fa01a85eae239e4bc4f713dacdcfb))


### Fixed

* ensure content JSON loads on GitHub Pages ([#12](https://github.com/arcade-cabinet/kings-road/issues/12)) ([b38907f](https://github.com/arcade-cabinet/kings-road/commit/b38907f04f55dc798c7327d5293f33d949a3462c))
* pin @types/node to v22 matching CI Node version ([#4](https://github.com/arcade-cabinet/kings-road/issues/4)) ([b523250](https://github.com/arcade-cabinet/kings-road/commit/b52325077a98f4ff22525bd8521efda74304d7a5))
* resolve all Biome lint errors in game components ([3fb7213](https://github.com/arcade-cabinet/kings-road/commit/3fb72135191dd858c59fd688dbb32d20f1153234))
* resolve CI TypeScript check failures ([#3](https://github.com/arcade-cabinet/kings-road/issues/3)) ([11c8596](https://github.com/arcade-cabinet/kings-road/commit/11c8596a174ddde17dc47f81690977a453fe9030))
* **tsc:** remove vite.config.ts from main tsconfig include (double-include caused TS6305) ([#35](https://github.com/arcade-cabinet/kings-road/issues/35)) ([f70341f](https://github.com/arcade-cabinet/kings-road/commit/f70341f5fc211b53e98639e3f39a5983fb852b80))


### Documentation

* add CLAUDE.md for Claude Code sessions ([2d7ac5b](https://github.com/arcade-cabinet/kings-road/commit/2d7ac5b9b5135201fc94694573b884daae577a1b))
* add Ralph-TUI PRD for overnight content generation ([fefbcc8](https://github.com/arcade-cabinet/kings-road/commit/fefbcc8b5f2af08b67422c67247757e1f77a6a66))
* rewrite all documentation for King's Road redesign ([c4f97fb](https://github.com/arcade-cabinet/kings-road/commit/c4f97fb76e7a5bea64426ec57dc380122d3cd9eb))

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
