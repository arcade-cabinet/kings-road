---
title: src/debug — Debug Spawn & Live-Fire Helpers
updated: 2026-04-18
status: current
domain: technical
---

# src/debug

Dev-only tooling for Phase 0 benchmarking. **Zero production impact** — all
exports are guarded by `import.meta.env.DEV`, which Vite replaces at build
time so the bundler eliminates all dead branches.

## Debug Spawn (`spawn.ts`)

Load directly into any biome by appending `?spawn=<biome>` to the dev URL:

```
http://localhost:5173/?spawn=thornfield
http://localhost:5173/?spawn=meadow
http://localhost:5173/?spawn=forest
```

Or set `VITE_DEBUG_SPAWN=thornfield` in `.env.local`.

### Biome tags

| Tag          | Anchor                  | Distance |
|--------------|-------------------------|----------|
| `meadow`     | Ashford (home)          | 0        |
| `forest`     | Millbrook               | 6 000    |
| `thornfield` | Thornfield Ruins        | 12 000   |
| `hills`      | Ravensgate              | 17 000   |
| `waypoint`   | The Pilgrim's Rest      | 21 000   |
| `grailsend`  | Grailsend               | 28 000   |

Spawn grants starter inventory: `iron_sword`, `3× health_potion`, `torch`.

### Integration pattern

Call from `App.tsx` (or equivalent entry point) before rendering the game tree:

```ts
import { parseSpawnParam, resolveSpawnConfig } from '@/debug';
import { startGame, activateQuest } from '@/ecs/actions/game';

const biomeTag = parseSpawnParam();
if (biomeTag) {
  const cfg = resolveSpawnConfig(biomeTag);
  if (cfg) {
    startGame('debug-seed', cfg.position, 0);
    activateQuest(cfg.questChapter);
    // grant items via inventoryActions.addItem(playerEntity, itemId, qty)
  }
}
```

## Live-Fire Helpers (`live-fire.ts`)

Format a checklist session and download as markdown:

```ts
import { downloadLiveFire } from '@/debug';

downloadLiveFire({
  device: 'iPhone 15 Pro',
  biome: 'thornfield',
  tester: 'Jon',
  entries: [
    { label: 'Loads without crash', result: 'pass' },
    { label: 'FPS > 30 sustained', result: 'fail', note: 'Drops to 22 near ruins' },
  ],
});
```

Output filename: `live-fire-<date>-<device>.md`. Drop into
`docs/benchmarks/` for the record.
