---
title: dungeon-kit compositor
updated: 2026-04-18
status: current
domain: technical
---

# src/composition/dungeon-kit

Layer-3 compositor. Given a `DungeonKitRoom` descriptor, returns a `DungeonKitPlacement[]` array of pure-data placement objects for every floor tile, ceiling tile, wall section, doorway, and scatter prop needed to build that room.

No Three.js. No React. Same inputs → identical output.

## Usage

```typescript
import { composeDungeonRoom } from '@/composition/dungeon-kit';

const placements = composeDungeonRoom(
  { id: 'r1', type: 'chamber', center: { x: 0, y: 0, z: 0 }, width: 8, depth: 8, exits: ['north'] },
  'world-seed-42',
);
// placements[0] → { assetId, position: Vec3, rotation: Vec3, scale, role }
```

## Kit pieces

| Role | Count | Source |
|------|-------|--------|
| wall | 8 | KayKit Dungeon Remastered 1.1 FREE |
| floor | 4 | KayKit Dungeon Remastered 1.1 FREE |
| ceiling | 1 | KayKit Dungeon Remastered 1.1 FREE |
| doorway | 3 | KayKit Dungeon Remastered 1.1 FREE |
| scatter | 6 | KayKit Dungeon Remastered 1.1 FREE |

GLBs live in `public/assets/dungeon/kit/`. Ingest via `scripts/ingest-dungeon-kit.ts`.

## Algorithm

1. **Floor grid** — `(width/2) × (depth/2)` tiles on a 2-unit grid
2. **Ceiling grid** — mirrored at y=4, rotated π around X
3. **4-wall perimeter** — wall pieces every 2 units; exit slot swapped to a doorway
4. **Scatter** — 2 (corridor), 4 (chamber/entrance), 6 (boss); random position within bounds

## DungeonKitRoom types

| Type | Scatter | Notes |
|------|---------|-------|
| `corridor` | 2 | Narrow passage |
| `chamber` | 4 | Standard encounter room |
| `entrance` | 4 | First room of dungeon |
| `boss` | 6 | Large boss arena |
