---
title: Debug Package
updated: 2026-04-18
status: current
domain: technical
---

# src/debug/

**Intent:** Dev-only tooling for Phase 0 benchmarking. Compile-time gated — zero production impact.

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

### Prod strip

Every export body is guarded by `if (!import.meta.env.DEV) return`. Vite tree-shakes them in prod builds. Verify with:

```bash
grep 'spawn=' dist/assets/*.js
```

Expected: no output.
