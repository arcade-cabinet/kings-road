---
title: Benchmark Harness
updated: 2026-04-18
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
| `BenchmarkRunner` | React component — mount when `?bench=<route-id>` detected |
| `parseBenchParam()` | Parse `?bench=<route-id>` from URL |

**Testing:** `e2e/benchmark.spec.ts` runs all 4 routes in headless Chromium via Playwright.

## Usage

### Run a route in the browser

```
http://localhost:5173/?spawn=thornfield&bench=walk-village-perimeter
```

Available route ids:
- `walk-village-perimeter` — 60s village walk
- `enter-dungeon-first-skeleton` — walk + dungeon entry + skeleton combat
- `sprint-through-fog-in-rain` — 45s sprint stress
- `combat-3-enemies-hero-shot` — 60s 3-enemy combat

The runner displays a green HUD overlay, runs the scripted route, then:
1. Logs `[benchmark:summary] {...}` to the browser console
2. Downloads a JSON file (`benchmark-<route>-<date>.json`)

### Playwright CI

```bash
pnpm test:e2e e2e/benchmark.spec.ts
```

Runs all 4 routes in headless Chrome. Fails if avgFps or p1Fps drops > 20% below `docs/benchmarks/baseline.json`.

### First-run baseline

After running on a real phone, commit the resulting JSON values into `docs/benchmarks/baseline.json` under the matching route key.

### Mounting BenchmarkRunner

In `app/Game.tsx` (or equivalent), detect the param and render:

```tsx
import { parseBenchParam, BenchmarkRunner } from '@/benchmark';

// In your JSX:
{parseBenchParam() && <BenchmarkRunner />}
```

`BenchmarkRunner` renders `BenchmarkFrameSampler` inside the Canvas context and a HUD overlay outside.
