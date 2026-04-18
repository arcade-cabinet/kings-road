---
title: src/benchmark — Automated Route Runner + Capture + Report
updated: 2026-04-18
status: current
domain: technical
---

# src/benchmark

Layer-2c package. Automated half of the Phase 0 measurement instrument.

## Usage

Combine `?spawn=<biome>` (from `src/debug`) with `?bench=<route-id>`:

```
http://localhost:5173/?spawn=thornfield&bench=walk-village-perimeter
```

Mount `<BenchmarkRunner />` inside the R3F Canvas tree in `App.tsx`:

```tsx
import { BenchmarkRunner, parseBenchParam } from '@/benchmark';

// Inside <Canvas>:
{parseBenchParam() && <BenchmarkRunner device="iPhone 15 Pro" />}
```

On completion the runner:
1. Auto-downloads `benchmark-<route>-<date>-<device>.json`.
2. Prints the markdown report to the browser console.

## Routes

| ID | Label | Duration | Spawn |
|----|-------|----------|-------|
| `walk-village-perimeter` | Walk village perimeter | 60s | thornfield |
| `enter-dungeon-first-skeleton` | Enter dungeon, engage first skeleton | 45s | thornfield |
| `sprint-through-fog-in-rain` | Sprint through fog (weather stress) | 60s | thornfield |
| `combat-3-enemies-hero-shot` | Combat vs 3 simultaneous enemies | 90s | thornfield |

## Playwright CI

`e2e/benchmark.spec.ts` runs all 4 routes in headless Chrome against the
web build and fails if any summary metric regresses > 20% from
`docs/benchmarks/baseline.json`.

Run locally:

```bash
pnpm test:e2e -- --grep benchmark
```

## Adding a baseline

After a clean run on reference hardware, copy the downloaded JSON to
`docs/benchmarks/baseline.json`. CI uses this as the regression floor.
