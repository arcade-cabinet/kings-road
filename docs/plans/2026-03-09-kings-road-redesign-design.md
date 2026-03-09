# King's Road — Redesign Design Document

**Date**: 2026-03-09
**Status**: Approved

## Vision

King's Road is a procedurally-flavored 3D RPG built with React Three Fiber. The player seeks the Holy Grail along a fixed linear road through a pastoral romanticized medieval world. The main quest is the same every playthrough; side quests branch via seed-weighted A/B biases, creating unique deterministic experiences per seed.

The game targets 4-12 hours of total gameplay when all quests (macro, meso, micro) are completed.

## Narrative Architecture

### The Main Quest (Fixed, Linear)

- Seek the Holy Grail from far distant lands
- Same sequence for EVERY seed
- Drives the player through authored anchor points along the King's Road
- Each anchor has a main quest story beat
- The game ends when you find the Holy Grail

### Side Quests (Seed-Procedural, A/B Branching)

Three tiers:

| Tier | Count/Game | Duration | Description |
|------|-----------|----------|-------------|
| **Macro** | 2-4 | 1-2 hours each | Multi-part chains spanning multiple locations off the road |
| **Meso** | 8-12 | 15-30 min each | Self-contained at one location, A/B branching |
| **Micro** | 20-30 | 5-10 min each | Quick roadside encounters |

- At world generation, seed RNG determines A/B bias per quest
- Side quests branch OFF the King's Road at anchor points into the countryside
- Different seed = different side quest combination = unique playthrough

### No Single Collectible

Quests drive all items, collectibles, and game modifiers. Procedural generation instructions are baked INTO quest definitions. The schema supports quest-specific rewards, items, and modifiers.

## World Architecture

### The King's Road (Fixed Linear Spine)

A literal road from Home Town to the Holy Grail. Hand-authored anchor points with deliberate pacing.

```
HOME ════ ANCHOR 1 ════ ANCHOR 2 ════ ANCHOR 3 ════ ... ════ HOLY GRAIL
             │              │              │
          side quest     side quest     side quest
          (off-road)     (off-road)     (off-road)
```

### Anchor Point Types

- `VILLAGE_FRIENDLY` — trade, rest, quest givers
- `VILLAGE_HOSTILE` — must fight/sneak/negotiate through
- `DUNGEON` — ruins, caves, puzzle/combat encounters
- `WAYPOINT` — roadside shrine, camp, hermit — smaller pacing beats

### Off-Road Countryside (Procedural)

- Medieval England: rolling green hills, oak forests, farms, meadows, streams
- Current chunk system repurposed for pastoral terrain generation
- Players go off-road ONLY when side quests direct them there

## Pacing Engine

### Core Metric: Steps = Distance = Time

```
Walk speed: ~4 units/sec → ~240 units/min
Sprint speed: ~7 units/sec → ~420 units/min
```

### Feature Density (Algorithmic Placement)

| Tier | Walk Interval | Example |
|------|--------------|---------|
| **Ambient** | ~15-30 sec | Stone bridge, wildflowers, deer, stream |
| **Minor** | ~1-2 min | Roadside shrine, abandoned cart, traveler camp |
| **Major** | ~4-5 min | Ruined watchtower, bandit camp, enchanted grove |
| **Quest (Micro)** | ~8-10 min | Fetch quest, puzzle, lost traveler escort |
| **Quest (Meso)** | ~15-20 min | Village off the road, dungeon entrance |
| **Quest (Macro)** | ~30-40 min | Major side quest hub, multi-part chain start |
| **Anchor** | ~25-35 min | Main quest story beat |

### Pacing Configuration

```typescript
interface PacingConfig {
  ambientInterval: [min: number, max: number];   // ~200-400 units
  minorInterval: [min: number, max: number];     // ~300-600 units
  majorInterval: [min: number, max: number];     // ~1000-1400 units
  questMicroInterval: [min: number, max: number]; // ~2000-2800 units
  questMesoInterval: [min: number, max: number];  // ~4000-5500 units
  questMacroInterval: [min: number, max: number];  // ~8000-10000 units
  anchorInterval: [min: number, max: number];     // ~6000-9000 units
}
```

Features placed along a 1D distance axis with seed-based jitter to prevent robotic regularity.

### Total Road for 4-12 Hours

- Main quest only (road + anchors): ~3-4 hours
- \+ all micro/meso side quests: ~6-8 hours
- \+ all macro side quest chains: ~10-12 hours
- King's Road walking distance: ~2 hours end to end
- ~10-12 anchor points

## Technical Architecture

### Schema Layer (Zod)

All game configuration is JSON, validated by Zod schemas.

```
src/schemas/
├── world.schema.ts      # Road spine, anchor definitions, pacing config
├── quest.schema.ts      # Macro/meso/micro quest definitions, A/B branches
├── npc.schema.ts        # NPC archetypes, dialogue pools, behaviors
├── feature.schema.ts    # Ambient/minor/major feature definitions
├── item.schema.ts       # Quest-driven items, modifiers, rewards
├── encounter.schema.ts  # Combat, puzzle, social encounters
└── index.ts             # Combined world config schema
```

Schemas enforce:
- Length constraints (dialogue min/max words, quest step counts)
- Balance checks (reward scaling, difficulty curves)
- Referential integrity (prerequisites exist, NPCs reference valid archetypes)
- Pacing rules (estimated duration for paper playtesting)

### ECS Layer (Koota + React Bindings)

Replaces the flat Zustand store with a proper Entity Component System.

```
src/ecs/
├── world.ts             # Koota world setup
├── archetypes/          # Entity archetypes
│   ├── player.ts
│   ├── npc.ts
│   ├── quest-giver.ts
│   ├── feature.ts
│   └── interactable.ts
├── components/          # ECS components
│   ├── Position.ts
│   ├── Velocity.ts
│   ├── Health.ts
│   ├── QuestState.ts    # Active quests, progress, branch choices
│   ├── Inventory.ts     # Quest-driven items
│   ├── Dialogue.ts
│   ├── Pacing.ts        # Distance traveled, features encountered
│   └── Renderable.ts
├── systems/             # ECS systems
│   ├── MovementSystem.ts
│   ├── PacingSystem.ts      # Steps → feature spawning
│   ├── QuestSystem.ts       # Main quest + side quest state machine
│   ├── EncounterSystem.ts
│   ├── DayNightSystem.ts
│   ├── ChunkStreamingSystem.ts
│   └── InteractionSystem.ts
└── hooks/               # React bindings
    ├── useEntity.ts
    ├── useQuery.ts
    └── useSystem.ts
```

### Content Trove (JSON)

All narrative content lives in schema-validated JSON files.

```
content/
├── main-quest/          # Fixed linear Holy Grail quest
│   ├── chapter-01.json
│   ├── chapter-02.json
│   └── ...
├── side-quests/
│   ├── macro/           # 1-2 hour multi-part chains
│   ├── meso/            # 15-30 min single-location quests
│   └── micro/           # 5-10 min roadside encounters
├── npcs/                # NPC definitions, dialogue pools
├── features/            # Ambient/minor/major roadside features
├── world/
│   ├── road-spine.json  # Anchor points, distances, pacing
│   └── regions.json     # Off-road biome/terrain config
└── CONTRIBUTING.md      # Trove contribution guide for agentic authoring
```

### Agentic Content Pipeline

`content/CONTRIBUTING.md` documents:
- JSON schema for each content type with examples
- Length requirements (min/max dialogue words, quest step counts)
- Tone guide (pastoral, romanticized medieval)
- A/B branching requirements (every meso+ quest needs both paths)
- Paper playtest format (estimated duration, pacing check)
- Balance constraints (difficulty curve, reward scaling)

### Automated Validation (`scripts/validate-trove.ts`)

- Zod parses every JSON file in content/
- Checks referential integrity across files
- Runs duration estimates (paper playtesting)
- Checks permutation coverage (every A/B path reachable)
- Reports substance score (dialogue density, choice meaningfulness)
- Outputs feedback JSON that agents can read and iterate on

## Visual Design: Pastoral Romanticized Medieval

### Color Palette

```
Primary
├── Background:    #f5f0e8 (warm cream)
├── Parchment:     #ede4d3
├── Warm Stone:    #a89078
├── Earth Brown:   #6b5344
└── Dark Brown:    #3d2b1f (text)

Nature
├── Sage Green:    #6b8f5e
├── Forest Green:  #3d6b3d
├── Wheat Gold:    #c9a84c
├── Sky Blue:      #87CEEB
└── Wildflower:    #b07ba8

Accents
├── Gold:          #b8962e (UI highlights)
├── Terracotta:    #c4705a
├── Banner Red:    #8b3a3a (heraldic, not blood)
└── Cream White:   #faf6ef
```

### Typography

- **Cinzel** (kept) — used warm: dark brown on cream, not gold on black
- Weight 400 for body, 700 for headers, 900 for titles

### Lighting (drei)

- Day: Warm golden sunlight via drei Sky component, proper sun positioning
- Night: Soft blue moonlight, gentle ambient, stars
- Atmospheric scattering for depth
- Soft bloom for golden light, gentle vignette

### Menu Redesign

- Sunlit parchment feel
- Gentle floating particles (dandelion seeds, fireflies at dusk)
- Warm earth-tone borders, no blood-red
- "King's Road" title, "Seek the Holy Grail" subtitle

## What Stays From 21dev Codebase

Use as reference/inspiration for the new architecture:

- React Three Fiber rendering pipeline (Canvas, Suspense, ErrorBoundary)
- Instanced mesh system for performance (Chunk.tsx patterns)
- Procedural texture generation approach (textures.ts)
- Input hook architecture (useInput.ts — keyboard/mouse/touch)
- Basic UI component structure (menu, HUD, dialogue overlay)
- Seeded RNG utilities (random.ts — mulberry32, cyrb128)
- Chunk streaming concept (load/unload based on distance)
- NPC component patterns (accessories, animations, name tags)
- AABB collision detection approach
- Mobile controls (virtual joystick)

## What Gets Replaced

- Zustand flat store → Koota ECS world
- `worldGen.ts` hash-everything → Road spine + pacing engine
- `getChunkType()` → PacingSystem + road-aware terrain gen
- Hardcoded NPC dialogue → JSON trove content
- "Blood Gems" collectible → quest-driven items
- Dark mood → pastoral mood (everything visual)
- "Aetheria" / "Blood Gems" → "King's Road" branding

## Ralph-TUI Integration

A PRD will be created for ralph-tui that defines stories for content generation:
- Main quest chapter content (story beats, dialogue, encounters)
- Macro/meso/micro side quest generation
- NPC archetype dialogue pools
- Feature descriptions (ambient, minor, major)
- All validated against Zod schemas
- Paper playtested automatically
- Substance scored with agent feedback loop

Ralph runs overnight to generate the content trove. Morning assessment and iteration.
