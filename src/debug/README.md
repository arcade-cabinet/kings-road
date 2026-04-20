---
title: Debug Package
updated: 2026-04-18
status: current
domain: technical
---

# src/debug/

**Intent:** Phase-0 spawn-override + live-fire QA tooling. The "debug" name is historical — `applyDebugSpawn` is also the **production entry point for the Pages deploy**: `.github/workflows/cd.yml` ships `VITE_DEBUG_SPAWN=thornfield` so visitors land directly in the biome instead of the main menu. Only `live-fire.ts` is strictly dev-only (guarded with `if (!import.meta.env.DEV) return`).

**Owner:** Team VFX (Phase 0)

**Layer:** 2c — imports from `core`, `ecs`, `biome`.

**Imports from:** `@/ecs/actions/game`, `@/ecs/actions/inventory-ui`, `@/ecs/traits/inventory`

**Exports:**

| Export | Prod or Dev | Purpose |
|---|---|---|
| `parseSpawnParam()` | Both | Parse `?spawn=<biome>` / `VITE_DEBUG_SPAWN` env var |
| `applyDebugSpawn()` | **Both** | Spawn override at startup; returns `true` if active. Load-bearing in prod via `VITE_DEBUG_SPAWN`. |
| `isBenchmarkSpawn()` | Both | True when `?benchmark=<biome>` is in the URL |
| `createBlankSession(device)` | Dev | Create a blank live-fire checklist session |
| `downloadLiveFireReport(session)` | Dev | Trigger markdown download of a completed session |

**Testing:** Run `pnpm test src/debug/` — unit tests in `spawn.test.ts`.

## Usage

### Debug spawn

Append `?spawn=thornfield` (or any biome id) to the dev URL:

```
http://localhost:5173/?spawn=thornfield
```

Or set `VITE_DEBUG_SPAWN=thornfield` in `.env.local`.

Call `applyDebugSpawn()` once at app startup, before the React tree renders. If it returns `true`, skip the main menu.

**Valid biome ids:** `thornfield`, `ashford`, `millbrook`, `ravensgate`, `pilgrims_rest`, `grailsend`

### Prod safety

`applyDebugSpawn`/`parseSpawnParam`/`resolveSpawnPosition` have **no DEV guards** — they run in both dev and prod because the Pages deploy relies on `VITE_DEBUG_SPAWN=thornfield` to land visitors straight in the biome.

Only `live-fire.ts`'s `downloadLiveFireReport` is strictly dev-only (guarded with `if (!import.meta.env.DEV) return`), because the browser-download UX has no place in the shipped game.

If you add new exports that are truly dev-only, follow the live-fire pattern:

```ts
export function someDevHelper(): void {
  if (!import.meta.env.DEV) return;
  // ...
}
```

Don't gate `applyDebugSpawn` without first updating `.github/workflows/cd.yml` to drop `VITE_DEBUG_SPAWN` — the current prod build depends on it firing.
