---
title: app/scene/dungeon
updated: 2026-04-18
status: current
domain: technical
---

# app/scene/dungeon

R3F renderer for the modular dungeon kit.

## Components

### `DungeonKitRenderer`

Consumes `DungeonKitPlacement[]` from `src/composition/dungeon-kit` and draws each kit piece via instanced meshes.

- Groups placements by `assetId` and renders each bucket as a single `InstancedMesh` (see `GlbInstancer`). A room of ~200 placements compresses to ~20 draw calls.
- Pulls `assetPath` from the `DUNGEON_KIT` catalog — the renderer never hard-codes GLB paths.
- Shadow strategy is a prop (`'off' | 'static' | 'temporal'`, default `'static'`):
  - `off` — skip `<AccumulativeShadows>` entirely. Mobile low-end path.
  - `static` — accumulate 40 frames then freeze via `<BakeShadows>`. Default for rooms a player has entered.
  - `temporal` — keep refining with 60-frame soft shadows. Desktop quality path for screenshots and bosses.
- `<BakeShadows>` is mounted **only in `shadows='static'` mode** — it freezes shadow-map updates after the first frame, which is what a fully-baked static room wants but would prevent `temporal` from continuing to refine and would freeze any dynamic `castShadow` lights. `off` skips it since there's no shadow work to freeze.

**Usage** — mount inside a `<Suspense>` boundary; GLBs suspend while loading:

```tsx
import { Suspense } from 'react';
import { composeDungeonRoom } from '@/composition/dungeon-kit';
import { DungeonKitRenderer } from '@app/scene/dungeon';

const placements = composeDungeonRoom(room, seed);

<Suspense fallback={null}>
  <DungeonKitRenderer
    placements={placements}
    roomOrigin={[room.center.x, 0, room.center.z]}
    shadows="static"
  />
</Suspense>
```

## Performance notes

- `<AccumulativeShadows>` costs roughly 1–2ms per accumulated frame on a modern phone — gate it behind visible-chunks / current-room only. Don't wrap the whole dungeon; wrap the room the player is in.
- `<BakeShadows>` is a one-shot toggle: useful the frame after static geometry settles. Active only in `shadows='static'` mode. Re-mount the renderer (new `key` on the group) to force a re-bake when the room changes.
- Full PBR materials inherit from the kit GLBs as-authored. The renderer does not mutate materials — per the PBR Material Standard, the shared-immutable contract must be preserved.
