---
title: World Generation
updated: 2026-04-09
status: current
domain: technical
---

# World Generation

This document details the world generation system in King's Road.

## Overview

King's Road uses a hybrid world generation approach:

1. **Road spine** -- A fixed 1D road defined in `content/world/road-spine.json` with 6 anchor points
2. **Pacing engine** -- Algorithmically places features along the road based on pacing intervals
3. **Chunk streaming** -- Procedurally generates terrain chunks around the player
4. **Seeded RNG** -- Same seed phrase produces the same world every time

## Road Spine

The road spine is the backbone of the world. It defines the King's Road as a 30,000-unit journey from Ashford to Grailsend.

### Anchor Points

```
Ashford ──6km── Millbrook ──6km── Thornfield ──5km── Ravensgate
   (0)           (6000)           (12000)            (17000)
                                                        │
                                                       4km
                                                        │
Grailsend ──────7km────── The Pilgrim's Rest ──────────┘
  (28000)                    (21000)
```

| Anchor | Type | Distance | Features |
|--------|------|----------|----------|
| Ashford | VILLAGE_FRIENDLY | 0 | home, tavern, blacksmith |
| Millbrook | VILLAGE_FRIENDLY | 6,000 | tavern, market, chapel |
| Thornfield Ruins | DUNGEON | 12,000 | dungeon_entrance, camp |
| Ravensgate | VILLAGE_HOSTILE | 17,000 | gate, prison, tavern |
| The Pilgrim's Rest | WAYPOINT | 21,000 | chapel, garden, library |
| Grailsend | DUNGEON | 28,000 | temple_entrance, guardian |

### Anchor Types

- **VILLAGE_FRIENDLY** -- Safe settlement with merchants, inns, and quest givers
- **VILLAGE_HOSTILE** -- Occupied or contested settlement, danger
- **DUNGEON** -- Ruins or temple with exploration and combat
- **WAYPOINT** -- Rest stop, monastery, or landmark

### Schema

The road spine validates against `RoadSpineSchema` from `src/schemas/world.schema.ts`:

```typescript
RoadSpineSchema = z.object({
  totalDistance: z.number().int().positive(),
  anchors: z.array(AnchorPointSchema).min(2).refine(
    (anchors) => anchors[0].distanceFromStart === 0,
    { message: 'First anchor must be at distance 0 (home town)' }
  ),
  regions: z.array(RegionSchema).optional(),
});
```

## Pacing Engine

The pacing engine distributes features and encounters along the road at controlled intervals. It prevents the player from walking too long without something interesting, and prevents clustering content too densely.

### Pacing Intervals

Defined in `PacingConfigSchema` (`src/schemas/pacing.schema.ts`):

| Feature Type | Min Interval | Max Interval | Description |
|-------------|-------------|-------------|-------------|
| ambient | 200-400 | units | Background features (wildflowers, stone walls) |
| minor | 500-800 | units | Interactable landmarks (bridges, shrines) |
| major | 2000-4000 | units | Significant locations (chapel ruins, standing stones) |
| questMicro | 800-1200 | units | Micro roadside encounters |
| questMeso | 4000-6000 | units | Self-contained location quests |
| questMacro | 8000-12000 | units | Multi-part quest chains |
| anchor | 4000-8000 | units | Main anchor points |

### Placement Algorithm

For each feature tier, the engine walks the road distance and places features using seeded RNG jitter within the interval range:

```
Road: ────────────────────────────────────────────>
          A   m A   M   A m A     a A   m A

A = ambient, m = minor, M = major, a = anchor
```

The player's `DistanceTraveled` trait tracks progress. As the player moves forward, features appear ahead and behind. Seeded RNG ensures the same placement every playthrough for a given seed.

## Chunk System

### Chunk Layout

```
World Coordinate System:
        -Z (North)
           |
    -X ----+---- +X (East)
           |
        +Z (South)

Each chunk: 120 x 120 units
Player starts at chunk (0,0)
```

### Chunk Type Assignment

Chunks on the X=0 column form the King's Road. Off-road chunks are countryside:

```
       WILD | TOWN | WILD
       ─────┼──────┼─────
       WILD | ROAD | WILD
       ─────┼──────┼─────
       WILD | TOWN | WILD     <-- Player starts here
       ─────┼──────┼─────
       WILD | ROAD | WILD
              |
         The King's Road
```

Road chunks become TOWN every 3rd chunk (approximately matching anchor spacing). Off-road chunks use seeded RNG: 20% DUNGEON, 80% WILD.

### Chunk Content

| Type | Content |
|------|---------|
| TOWN | Buildings (inn, blacksmith, houses), NPCs, cobblestone ground |
| ROAD | Cobblestone path, stone pathway markers |
| DUNGEON | Procedural maze ruins, collectibles |
| WILD | 60 trees, 30 boulders per chunk, occasional wanderer NPC |

### Streaming

Chunks within `VIEW_DISTANCE` (currently 1) of the player are loaded. Far chunks are unloaded. Chunk state (collected items, quest progress) persists in `chunkDeltas`.

## Seed System

### Seed Phrase Generation

```typescript
const ADJECTIVES = [
  'Golden', 'Verdant', 'Gentle', 'Sunlit', 'Pastoral',
  'Quiet', 'Rolling', 'Blessed', 'Winding', 'Misty', ...
];
const NOUNS = [
  'Meadow', 'Glen', 'Shire', 'Dale', 'Hollow',
  'Brook', 'Haven', 'Crossing', 'Fields', ...
];

// Example: "Golden Verdant Meadow"
seedPhrase = `${adj1} ${adj2} ${noun}`;
```

### Seed to RNG

The `cyrb128` hash function converts the seed phrase to a 32-bit integer. The `mulberry32` PRNG produces deterministic random sequences from that integer.

Each chunk derives its own RNG: `mulberry32(cyrb128(seedPhrase + "cx,cz"))`, ensuring same-seed reproducibility.

## Building Generation

### Modular Building System

Buildings are constructed from blocks on a grid:

| Building | Width | Depth | Floors |
|----------|-------|-------|--------|
| Inn | 3 blocks | 4 blocks | 2 |
| Blacksmith | 2 blocks | 2 blocks | 1 |
| House | 2 blocks | 2 blocks | 1-2 |

Components: honey limestone foundation, cream plaster walls, oak timber framing, golden thatch roofs, glowing windows.

## NPC Generation

NPCs spawn at anchor points and occasionally in WILD chunks (15% chance for wanderers). Names come from per-archetype name pools defined in NPC content JSON. Dialogue comes from greeting pools.

### NPC Archetypes

blacksmith, innkeeper, merchant, wanderer, healer, knight, hermit, farmer, priest, noble, bandit, scholar

Each archetype has:
- Name pool (5+ names)
- Greeting pool (5+ greetings)
- Appearance config (cloth color, accessory)

## Collision System

Every solid object generates an AABB (Axis-Aligned Bounding Box):

```typescript
interface AABB {
  minX: number; maxX: number;
  minZ: number; maxZ: number;
}
```

Buildings, trees, and rocks all produce AABBs. The PlayerController uses axis-separated collision detection for wall sliding.

## Constants

```typescript
CHUNK_SIZE = 120      // Units per chunk side
BLOCK_SIZE = 5        // Building block size
VIEW_DISTANCE = 1     // Chunks loaded in each direction
PLAYER_HEIGHT = 1.6   // Eye height
PLAYER_RADIUS = 0.6   // Collision radius
```
