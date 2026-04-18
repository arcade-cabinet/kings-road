---
title: Zustand → Koota Migration Plan
updated: 2026-04-18
status: current
domain: context
---

# Zustand → Koota Migration Plan

## Overview

Six Zustand stores (~1290 LOC) coexist with a Koota ECS world. Much of the store state
already has ECS equivalents that are authoritative but unused by the React layer — the stores
act as a shadow mirror. This plan collapses the duplication by turning stores into either
Koota traits on a singleton `Session` entity (replacing the whole store) or thin UI-only
wrappers that merely project ECS state into React (the `inventoryStore` pattern, already correct).

**Singleton entity pattern:** `const session = world.spawn(...)` once at New Game. Traits on
`session` replace store state. React components call `useTrait(session, Trait)` or
`useWorld((w) => ...)`. Non-React code (quest executor, dev console) calls
`session.get(Trait)` / `session.set(Trait, patch)`.

---

## Per-Store Analysis

### 1. `gameStore.ts` (532 LOC) — decompose into multiple Session traits

The largest store mixes at least 6 distinct concerns. Strategy: map each concern to a
dedicated trait and add it to the singleton `Session` entity.

| Concern | New Trait | Already in ECS? |
|---------|-----------|-----------------|
| Session flags (`gameActive`, `paused`, `inDialogue`, `seedPhrase`) | `SessionFlags` | No |
| Player physics (`playerPosition`, `velocity`, `cameraYaw/Pitch`, `isGrounded`, `isSprinting`, `playerVelocityY`) | `Position`, `Rotation`, `Movement`, `Velocity` | YES — traits exist, not yet consumed by React |
| Vitals (`health`, `stamina`, `isDead`) | `Health`, `Stamina` | YES — traits exist |
| World chunk state (`currentChunkKey`, `currentChunkName`, `currentChunkType`, `activeChunks`, `globalAABBs`, `globalInteractables`) | `ChunkContext` | No |
| Environment (`timeOfDay`, `gemsCollected`, `currentWeather`, `chunkDeltas`) | `WorldEnvironment` | No |
| Dungeon state (`inDungeon`, `activeDungeon`) | `DungeonContext` | No |
| Combat state (`inCombat`, `activeEncounter`) | Fold into `combatStore` migration | Partial |
| Dialogue state (`currentInteractable`, `dialogueName`, `dialogueText`, `inDialogue`) | `DialogueContext` | No |
| Deprecated input (`keys`, `joystickVector`, `joystickDist`, `mouseDown`) | **Delete** — already flagged DEPRECATED; PlayerInput ECS trait is the replacement | YES |

**Decision: (b) multiple traits on Session entity.** The deprecated input slice should be
deleted at migration time, not migrated.

### 2. `worldStore.ts` (178 LOC) — singleton Session trait

Holds `kingdomMap`, `featurePlacements`, `featureIndex`, generation progress, and config.
All of this is global, session-scoped, and read-only at runtime after `generateWorld()`.

**Decision: (b) one `KingdomContext` trait on Session.** The `generateWorld` async action
becomes a Koota `createActions` factory that spawns/updates the Session entity.
The three exported helper functions (`getKingdomTile`, `getRegionAt`, `getSettlementAt`)
stay as plain TypeScript utilities — they don't need to move.

### 3. `questStore.ts` (222 LOC) — merge into player entity QuestLog + Session traits

`QuestLog` ECS trait already exists on the player entity and holds `activeQuests`,
`completedQuests`, `mainQuestChapter`. The store adds:
- `triggeredQuests` — add to `QuestLog` trait
- `questGraph` / `resolveNarrative` — new `NarrativeGraph` trait on Session
- `events` (transient signals) — new `QuestEvents` trait on Session (cleared each frame)
- `questXpEarned` — add to `QuestLog` or to a `PlayerStats` trait

The `quest-step-executor.ts` calls `useQuestStore.getState()` heavily outside React. After
migration it calls `session.get(QuestEvents)` and `playerEntity.get(QuestLog)`.

**Decision: (b) split across player entity QuestLog (already exists) + two Session traits
(`NarrativeGraph`, `QuestEvents`).** questActions `createActions` factory already partially
mirrors this — extend it.

### 4. `combatStore.ts` (142 LOC) — Session trait, UI-only

Holds transient combat UI state: `DamagePopup[]`, `CombatSummary`, phase, cooldowns.
None of this needs to survive frame boundaries longer than a render cycle. It has no ECS
equivalent yet.

**Decision: (b) `CombatUI` trait on Session.** `addDamagePopup`, `clearExpiredPopups`,
`showSummary` become actions in a `combatUIActions` factory.

### 5. `inventoryStore.ts` (98 LOC) — **already correct, thin migration**

The file comment says it exactly: Koota ECS owns authoritative data; this store is a
React-friendly snapshot. The `sync()` call pushes ECS state into the store for rendering.

**Decision: (c) keep as UI projection layer** — but replace the Zustand store with a
`useSyncExternalStore`-style hook that reads directly from `useTrait(playerEntity, Inventory)`
and `useTrait(playerEntity, Equipment)`. No intermediate Zustand store needed once components
call Koota hooks directly. The `isOpen` boolean moves to a `InventoryOpen` Session trait.

### 6. `settingsStore.ts` (118 LOC) — keep as Zustand with persistence adapter

This store does not belong in ECS. Settings are user preferences, not game-world state.
They outlive a session (persist across app restarts via `localStorage`).

**Decision: (c) keep as Zustand.** Migration effort: zero. Long term: if native support is
needed, swap the `localStorage` adapter for `expo-sqlite` via the save service — but that is
a separate task.

---

## Dependency Graph

```
settingsStore     → standalone, no deps, no migration
inventoryStore    → depends on: player entity (Inventory, Equipment traits — already exist)
combatStore       → depends on: Session entity
questStore        → depends on: player entity QuestLog, Session (NarrativeGraph, QuestEvents)
worldStore        → depends on: Session entity (KingdomContext)
gameStore         → depends on: Session entity + player entity (Health, Stamina, Movement,
                    Position, Rotation, Velocity — all already exist on player)
```

Migration order must respect: Session entity must exist before any trait is added. Player
entity must be spawned before player traits are consumed. Both are already created in
`playerActions.spawnPlayer`.

The `quest-step-executor.ts` is the highest-risk shared logic: it calls `getState()` outside
React at runtime and in tests. It must be updated in the same commit as `questStore`.

---

## Migration Order

Each phase is independently verifiable: `pnpm tsc --noEmit` + `pnpm test` must stay green.

### Phase 0 — Session entity bootstrap (1 commit)
- Add a `getSessionEntity()` accessor to `src/ecs/world.ts` that spawns the session entity lazily on first read and caches it. Do NOT spawn at module scope — module evaluation order is sensitive in Vitest + SSR-style contexts, and `gameWorld.spawn()` at import time would allocate an entity the instant any module imports `world.ts`, including tests that never use it.
- This function is the anchor for all subsequent Session traits. All callers go through `getSessionEntity()`, never a module-level constant.
- Add an `unsafe_resetSessionEntity()` helper gated on `import.meta.env.DEV` so per-test cleanup can reset session state deterministically.
- Tests: tsc clean + existing tests pass (no behaviour change).

### Phase 1 — inventoryStore → Koota hooks (1 commit)
- Replace `useInventoryStore` subscriptions in UI components with `useTrait(playerEntity, Inventory)` and `useTrait(playerEntity, Equipment)`.
- Move `isOpen` to `InventoryOpen` Session trait.
- Delete `inventoryStore.ts` sync boilerplate.
- Tests: `src/ecs/traits/inventory.test.ts` + `src/ecs/actions/inventory.test.ts` stay green.

### Phase 2 — combatStore → `CombatUI` Session trait (1 commit)
- Add `CombatUI` trait to `src/ecs/traits/combat.ts`.
- Create `combatUIActions` in `src/ecs/actions/`.
- Reroute `useCombatStore` callsites to `useTrait(sessionEntity, CombatUI)`.
- Tests: tsc clean + existing combat-resolver tests pass (combatStore is UI-only).

### Phase 3 — questStore → QuestLog + Session traits (1 commit, highest risk)
- Extend `QuestLog` trait: add `triggeredQuests`, `questXpEarned`.
- Add `NarrativeGraph` and `QuestEvents` Session traits.
- Rewrite `quest-step-executor.ts` to use `session.get()` / `playerEntity.get()`.
- Update all `questActions` in `src/ecs/actions/`.
- Update `quest-step-executor.test.ts` to operate on ECS world directly (no `getState()`).
- Tests: `src/quest-step-executor.test.ts`, `src/ecs/actions/actions.test.ts`.

### Phase 4 — worldStore → `KingdomContext` Session trait (1 commit)
- Add `KingdomContext` trait (holds `kingdomMap`, `featurePlacements`, `featureIndex`, progress fields).
- Move `generateWorld` logic into a `worldActions` factory.
- Reroute `useWorldStore.getState()` callsites in `devConsole.ts`.
- Exported helper functions (`worldToGrid`, `gridToWorldOrigin`) stay as plain utilities.
- Tests: `src/world/kingdom-gen.test.ts`.

### Phase 5 — gameStore decomposition (2–3 commits, largest scope)

**5a — delete deprecated input slice:**
- Remove `keys`, `joystickVector`, `joystickDist`, `mouseDown`, all deprecated actions.
- Update `useInput.ts` tests (they test the deprecated path — update or delete them).

**5b — player physics/vitals → existing ECS traits:**
- Remove `playerPosition`, `velocity`, `cameraYaw/Pitch`, `isGrounded`, `isSprinting`,
  `health`, `stamina`, `isDead` from the store.
- Replace with `useTrait(playerEntity, Position)` etc. in all callers.
- `devConsole.ts` `getState()` calls → `playerEntity.get(Health)` etc.

**5c — remaining slices → Session traits:**
- Add `SessionFlags` (gameActive, paused, seedPhrase), `ChunkContext`,
  `WorldEnvironment`, `DungeonContext`, `DialogueContext` traits.
- Create corresponding actions factories.
- Delete `gameStore.ts` once all callers migrated.

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| `quest-step-executor.ts` calls `getState()` 10+ times outside React | HIGH | Migrate in one atomic commit (Phase 3); update all tests simultaneously |
| `devConsole.ts` uses `getState()` on gameStore and worldStore in 15+ places | MEDIUM | Migrate devConsole in same commit as each store phase; dev-only code, not in critical path |
| `useInput.ts` hooks call `getState()` inside event handlers (not in render) | MEDIUM | Replace with `sessionEntity.get(SessionFlags)` in Phase 5b; hooks are tested |
| `localStorage` persistence for `settingsStore` | LOW | Kept as Zustand — no migration |
| `KingdomMap` holds non-serialisable `Map<>` (`featureIndex`) | MEDIUM | Keep `featureIndex` outside the trait (in a module-level ref); store only the `PlacedFeature[]` array in the trait |
| Koota trait factory functions (e.g. `QuestLog(() => ({...}))`) create new objects per entity — OK for singleton, but must not be shared references | LOW | Always use factory-function form for array/object traits |
| `playerEntity` reference must be stable before traits are consumed | MEDIUM | Export `playerEntity` from `src/ecs/world.ts` after spawnPlayer; guard with null check in hooks during menu phase |
| Tests use `useXxxStore.getState()` extensively — test rewrites are required | MEDIUM | Rewrite tests to use `entity.get(Trait)` directly; simpler and faster |

---

## Koota Patterns Reference

| Zustand idiom | Koota equivalent |
|---------------|-----------------|
| `useStore(s => s.field)` | `useTrait(entity, Trait).field` |
| `useStore.getState().field` (outside React) | `entity.get(Trait)?.field` |
| `store.action(args)` | `actions.actionName(entity, args)` via `createActions` |
| `store.getState().action(args)` (outside React) | `actions.actionName(entity, args)` directly |
| `set((s) => ({ ...s, field: v }))` | `entity.set(Trait, { field: v })` |
| Zustand `subscribe` | `world.onChange(Trait, callback)` |
| Computed derived state | `useWorld((w) => ...)` with selector |

---

## Acceptance Criteria

- [ ] `pnpm tsc --noEmit` passes after each phase commit
- [ ] `pnpm test` passes after each phase commit (no `useXxxStore.getState()` in test files except `settingsStore`)
- [ ] `settingsStore.ts` is the only remaining Zustand store
- [ ] `inventoryStore.ts` deleted (UI reads from `useTrait` directly)
- [ ] No `getState()` calls on any game/quest/world/combat store remain in non-test source
- [ ] All ECS trait files stay under 300 LOC
- [ ] `devConsole.ts` operates via entity getters, not store snapshots
