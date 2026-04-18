---
title: Debug Package
updated: 2026-04-18
status: current
domain: technical
---

# src/debug/

**Intent:** Dev-only tooling for Phase 0 benchmarking. Runtime-gated via `import.meta.env.DEV` — all function bodies return immediately in production builds. The module is only tree-shaken from the production bundle if no production code imports it (app startup code must call `applyDebugSpawn()` inside a `if (import.meta.env.DEV)` guard).

**Owner:** Team VFX (Phase 0)

**Layer:** 2c — imports from `core`, `ecs`, `biome`.

**Imports from:** `@/ecs/actions/game`, `@/ecs/actions/inventory-ui`, `@/ecs/traits/inventory`

**Exports:**

| Export | Purpose |
|---|---|
| `parseSpawnParam()` | Parse `?spawn=<biome>` / `VITE_DEBUG_SPAWN` env var |
| `applyDebugSpawn()` | Apply spawn override at startup; returns `true` if active |
| `createBlankSession(device)` | Create a blank live-fire checklist session |
| `downloadLiveFireReport(session)` | Trigger markdown download of a completed session |

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

Every export body is guarded by `if (!import.meta.env.DEV) return false` (or `return`). In production builds these become `if (false) return` and Vite's minifier eliminates the branch. To guarantee the module itself is excluded from the prod bundle, wrap the call site in a `DEV` guard:

```ts
if (import.meta.env.DEV) {
  const { applyDebugSpawn } = await import('@/debug');
  if (applyDebugSpawn()) skipMainMenu();
}
```
