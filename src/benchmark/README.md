---
title: Benchmark Harness
updated: 2026-04-19
status: current
domain: technical
---

# src/benchmark/

**Intent:** Automated Phase 0 measurement instrument. Scripted route replay + per-frame metric capture + JSON export + Playwright CI regression guard.

**Owner:** Team VFX (Phase 0)

**Layer:** 2c — imports from `core`, `ecs`.

**Imports from:** `@/ecs/actions/game`, `@/input/types`

**Exports:**

| Export | Purpose |
|---|---|
| `BENCHMARK_ROUTES` | Array of all 4 scripted routes |
| `getRoute(id)` | Look up a route by id |
| `getFrameAtTime(route, elapsed)` | Resolve scripted InputFrame at elapsed seconds |
| `BenchmarkCapture` | Frame sampler — call `.sample(gl.info)` per frame, `.finish()` at end |
| `exportBenchmarkJson(summary)` | Trigger Blob download |
| `buildMarkdownReport(summary)` | Produce markdown with summary table + frame-time distribution |
| `BenchmarkRunner` | In-Canvas sampler — mount inside `<Canvas>` children |
| `BenchmarkHUD` | Out-of-Canvas HUD overlay — mount as a Canvas sibling |
| `parseBenchParam()` | Parse `?bench=<route-id>` **or** `?benchmark=<biome>` from URL |
| `isBenchmarkAliasRoute()` | True when `?benchmark=<biome>` triggered the run |
| `BENCHMARK_STORAGE_KEY` | localStorage key (`kr.benchmark.last`) receiving the final JSON summary |

**Testing:** `e2e/benchmark.spec.ts` runs all 4 routes in headless Chromium via Playwright.

## Usage

### Task #22 — `?benchmark=thornfield`

The fast path for the Thornfield scene performance harness:

```
http://localhost:5173/?benchmark=thornfield
```

This alias:
- Boots the scene with `?spawn=thornfield`'s seed + content, but pins the
  player to `(2, 1.6, 24)` (the scene's default camera position) for
  reproducible capture.
- Runs the `walk-thornfield-forward` route: a 60s, deterministic,
  moveZ=+1 forward flight at walking speed (5.5 m/s ⇒ ≈330 m path).
- At end: writes the full summary JSON to
  `localStorage['kr.benchmark.last']` and logs one digest line:
  ```
  [BENCHMARK] p50=12.34ms p95=18.91ms p99=24.00ms avgDraws=210 avgTris=450000
  ```

Headless capture:

```bash
pnpm exec tsx scripts/bench-headless.ts > bench.json
```

### Run an explicit route in the browser

```
http://localhost:5173/?spawn=thornfield&bench=walk-village-perimeter
```

Available route ids:
- `walk-thornfield-forward` — 60s deterministic forward flight (task #22)
- `walk-village-perimeter` — 60s village walk
- `enter-dungeon-first-skeleton` — walk + dungeon entry + skeleton combat
- `sprint-through-fog-in-rain` — 45s sprint stress
- `combat-3-enemies-hero-shot` — 60s 3-enemy combat

The runner displays a green HUD overlay, runs the scripted route, then:
1. Logs `[benchmark:summary] {...}` to the browser console
2. Downloads a JSON file (`benchmark-<route>-<date>.json`) — legacy flow only

### Playwright CI

```bash
pnpm test:e2e e2e/benchmark.spec.ts
```

Runs all 4 routes in headless Chrome. Fails if avgFps or p1Fps drops > 20% below `docs/benchmarks/baseline.json`.

### First-run baseline

After running on a real phone, commit the resulting JSON values into `docs/benchmarks/baseline.json` under the matching route key.

### Mounting

`BenchmarkRunner` owns the `useFrame` loop, so it must live inside
`<Canvas>`. `BenchmarkHUD` renders a fixed-position DOM overlay, so it
must live outside `<Canvas>`. They communicate through a module-level
pub/sub store — no shared context, no provider.

In `app/scene/GameScene.tsx`:

```tsx
import { BenchmarkHUD, BenchmarkRunner, parseBenchParam } from '@/benchmark';

<Canvas>
  {/* ...scene... */}
  {parseBenchParam() && <BenchmarkRunner />}
</Canvas>
<BenchmarkHUD />
```
