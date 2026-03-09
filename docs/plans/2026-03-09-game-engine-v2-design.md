# King's Road Game Engine v2 — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan from this design.

**Goal:** Transform King's Road from a hardcoded procedural world into a config-driven blueprint engine where buildings, NPCs, monsters, and encounters are all JSON archetypes — validated by Zod, instantiated by factories, rendered by R3F. Ashford is the handcrafted reference implementation.

**Architecture:** Three factory systems (Building, NPC, Monster) consume JSON archetype configs, produce ECS entities with 3D geometry. Towns are layout configs referencing archetypes. Water and audio systems adapted from Grovekeeper.

**Tech Stack:** React Three Fiber, Koota ECS, Zod v4, Tone.js, Gerstner wave shaders, procedural canvas textures.

---

## 1. Blueprint Architecture

Three factory systems, all following the same pattern:

| Factory | Input Config | Output | Customization Slots |
|---------|-------------|--------|-------------------|
| **Building Factory** | `BuildingArchetype` JSON | Enterable 3D structure with collision | stories, footprint, wallMaterial, roofStyle, features, interiorSlots |
| **NPC Factory** | `NPCArchetype` JSON | Geometric character with face texture | bodyBuild, faceSlots, accessories, clothPalette, behavior |
| **Monster Factory** | `MonsterArchetype` JSON | Hostile entity with attack patterns | bodyType, size, limbs, colorScheme, abilities, lootTable, dangerTier |

All three share:
- Zod schema validation
- Seed-deterministic generation (same ID = same visual every time)
- ECS trait attachment (Position, Health, Interactable, etc.)

---

## 2. Building System

### Archetypes

`tavern`, `smithy`, `cottage`, `chapel`, `market_stall`, `guard_post`, `stable`, `mill`, `house_large`, `house_small`

### Construction Per Story

1. **Perimeter wall segments** with door/window cutouts (wall thickness ~0.2 units)
2. **Floor plates** — ground floor solid, upper floors have stair holes (back-right corner)
3. **Step geometry** connecting floors through the stair hole
4. **Roof** — thatch cone, slate pyramid, or flat based on `roofStyle`
5. **Interior furniture** placed from `interiorSlots` config
6. **Per-segment collision AABBs** for accurate physics

### Materials

plaster, stone_block, timber_frame, brick, thatch, slate, wood — all procedural 512x512 canvas textures.

### Archetype Schema Shape

```typescript
BuildingArchetype {
  id: string                    // "tavern", "smithy", etc.
  stories: 1-3
  footprint: { width: 2-4, depth: 2-5 }  // tile units (~4m each)
  wallMaterial: "plaster" | "stone" | "timber_frame" | "brick"
  roofStyle: "thatch" | "slate" | "flat"
  openFront: boolean            // smithy has no front wall
  features: string[]            // "door", "windows", "chimney", "sign", "hearth", "anvil"
  interiorSlots: { type: string, position: [x, z] }[]
  npcSlot?: { archetype: string, position: [x, z] }
}
```

---

## 3. Town Layout System

Layout strategy scales with settlement size:

| Strategy | Used For | How It Works |
|----------|----------|-------------|
| `organic` | Hamlets (Ashford) | Buildings scattered around a village green with position jitter and slight rotation. Low wooden palisade. Connected to King's Road through grove/meadow/stream. Pallet Town feel. |
| `road` | Market towns (Millbrook) | Buildings line a main street perpendicular to King's Road. Market square at intersection. |
| `grid` | Cities (Ravensgate) | Proper street grid inside stone walls. Districts, gates, guard posts. Planned and imposing. |

### Town Envelope

Every town has:
- **Boundary** — palisade (wood), wall (stone), or hedge (natural)
- **Approach** — the natural feature connecting it to the King's Road: grove of trees, meadow with wildflowers, stream with footbridge

### Town Config Shape

```json
{
  "name": "Ashford",
  "layout": "organic",
  "boundary": "palisade",
  "approach": "meadow_stream",
  "buildings": [
    { "archetype": "cottage", "label": "Your Home", "position": [0, 2], "rotation": 15 },
    { "archetype": "tavern", "label": "The Golden Meadow", "stories": 2, "position": [-3, 0] },
    { "archetype": "smithy", "label": "Aldric's Forge", "position": [2, -1] }
  ],
  "npcs": [
    { "id": "aldric", "archetype": "blacksmith", "fixed": true, "building": "Aldric's Forge" }
  ]
}
```

---

## 4. NPC Factory

### Geometric Construction + Canvas Face Textures

- **Body:** Cylinders + spheres with archetype-driven proportions
  - Stocky smith (wider torso, shorter)
  - Slim scholar (narrow, taller)
  - Broad knight (wide shoulders, armored accessories)
- **Face:** 128x128 canvas texture on head sphere
  - Skin tone (5 options)
  - Eye shape and color
  - Hair style and color (bald, short, long, hooded)
  - Optional facial hair (beard, mustache)
  - All seed-deterministic from NPC ID
- **Accessories:** Mesh attachments from archetype config
  - hat, apron, staff, backpack, hammer, mug, sword, shield, basket
- **Cloth:** Primary/secondary color from archetype palette
- **Behavior:** Idle animation style, walk-between-nodes pathfinding, interaction verb, dialogue pool

### Fixed vs Procedural

- **Anchor town NPCs** → fixed names, fixed face seeds, authored dialogue (e.g., Aldric the blacksmith in Ashford)
- **Road/wilderness NPCs** → procedural from archetype + world seed

---

## 5. Danger Gradient & Encounter System

```
Distance from King's Road → Danger Tier → Encounter Table → Loot Table
─────────────────────────────────────────────────────────────────────────
On road (cx=0)              → 0 (safe)     → travelers, merchants      → none
Road shoulder (|cx|=1)      → 1 (mild)     → bandits (rare), wildlife  → common
Wilderness (|cx|=2)         → 2 (moderate) → wolves, brigands          → uncommon
Deep wild (|cx|≥3)          → 3 (dangerous)→ monsters, undead          → rare
Dungeon interior            → 4 (extreme)  → bosses, guardians         → epic
```

### Monster Factory

Same geometric construction approach as NPCs but for hostile entities:
- `MonsterArchetype` defines body type, size, limb count, color scheme
- Attack patterns and abilities from config
- Loot table references (items dropped on defeat)
- Danger tier determines spawn probability by distance from road

---

## 6. Water System (adapted from Grovekeeper)

### Gerstner Wave Shader

- Vertex displacement with 2-4 wave layers per water type
- Foam indicator at wave crests
- Caustics layer — additive-blended sine interference pattern below surface

### Water Types

| Type | Size | Wave Layers | Opacity | Use |
|------|------|-------------|---------|-----|
| River | 4x16+ | 2 (flow-aligned) | 0.85 | Millbrook crossing, wilderness |
| Stream | 2x8 | 1 (flow-aligned) | 0.75 | Town approaches, wilderness |
| Pond | 6x6 | 2 (gentle) | 0.8 | Village greens, forest clearings |

### Placement

- Streams near towns as approach features
- River at Millbrook crossing
- Ponds in wilderness clearings
- Config-driven per town and per chunk type

### Style

Wind Waker cel-shaded variant preferred — cel-shaded water with quantized color bands matches the pastoral low-poly aesthetic better than photorealistic water.

---

## 7. Ambient Audio (adapted from Grovekeeper)

### Tone.js 6-Layer Synthesis

| Layer | Synthesis | Active When |
|-------|-----------|-------------|
| Wind | Brown noise → 380Hz lowpass | Always |
| Birds | FM synth (C5, harmonicity 8) | Dawn through afternoon |
| Insects | White noise → 5200Hz bandpass | Noon through afternoon |
| Crickets | Square wave 2400Hz | Evening through midnight |
| Water | Brown noise → 240Hz lowpass | Near water bodies |
| Vegetation | Pink noise → 620Hz bandpass | Near trees/forests |

### Spatial Audio Zones

- Each water body and forest area generates a soundscape zone
- Distance-based volume falloff: `gain = volume * max(0, 1 - dist/radius)`
- Multiple zones blend via linear accumulation

### SFX Synthesis

All procedural — no audio files:
- Footsteps (noise bursts timed to walking speed)
- Door open/close (filtered noise + tone)
- Anvil clang (metallic FM synthesis)
- Dialogue chime (sine arpeggio)
- Combat hits (noise bursts with envelope)

---

## 8. Ashford — The Reference Implementation

The first town, handcrafted to prove the engine works.

### Layout

`organic` — 5-6 buildings around a village green with an old oak tree. Low wooden palisade with a gate toward the King's Road. Meadow with wildflowers and a small stream with footbridge as the approach.

### Buildings

1. **Your Cottage** — `cottage`, 1-story, simple interior (bed, chest, table). Player spawn point.
2. **The Golden Meadow** — `tavern`, 2-story. Hearth and tables downstairs, rooms with beds upstairs.
3. **Aldric's Forge** — `smithy`, 1-story open-front. Anvil, forge, weapon rack.
4. **The Chapel of St. Brendan** — `chapel`, 1-story. Simple nave with altar and candles.
5. **Goodwife Maren's House** — `cottage`, 1-story. Herb garden outside (decorative).
6. **Old Tomas's House** — `house_large`, 2-story. Books, maps, and scrolls inside. Quest hook location.

### Fixed NPCs

| Name | Archetype | Build | Key Accessories | Role |
|------|-----------|-------|-----------------|------|
| **Aldric** | blacksmith | stocky, bald | leather apron, hammer | Gives starting sword |
| **Bess** | innkeeper | medium, red hair | apron, mug | Tells about the road ahead |
| **Father Cedric** | priest | thin, elderly, white hair | robes, holy book | Blesses your journey |
| **Old Tomas** | scholar | thin, glasses | robes, scroll | Starts chapter-00 — the Grail quest |
| **Goodwife Maren** | healer | medium, gray hair | herb basket, shawl | Gives healing supplies |

### The Starting Moment

1. Player spawns inside their cottage in Ashford
2. Walk outside — a small pastoral village with an oak tree in the green
3. Talk to neighbors — Aldric gives you a sword, Bess tells tales, Father Cedric blesses you
4. Old Tomas shows you a map — the Holy Grail was last seen beyond Grailsend, far to the north
5. Walk through the palisade gate, across the meadow, over the stream footbridge
6. Step onto the King's Road. Ashford shrinks behind you. The journey begins.

---

## What Stays

- Current chunk streaming system (ChunkManager)
- Current movement/physics (PlayerController)
- Current day/night cycle (Environment)
- Current dialogue system (DialogueBox)
- Current interaction system (InteractionSystem)
- Zustand game store (legacy, still functional)
- Koota ECS world and existing traits
- All Zod schemas (extended with new archetype schemas)
- Road spine and pacing engine

## What Changes

- Chunk.tsx: refactored to use Building Factory instead of hardcoded construction
- NPC.tsx: refactored to use NPC Factory with face textures and accessory slots
- worldGen.ts: town chunk generation reads town config JSON instead of hardcoded layout
- New: Building Factory system
- New: NPC Factory system (face texture generator)
- New: Monster Factory system (placeholder for later)
- New: Town layout system (organic/road/grid strategies)
- New: Water system (Gerstner shaders from Grovekeeper)
- New: Audio system (Tone.js ambient synthesis from Grovekeeper)
- New: Encounter/danger gradient system
- New: Ashford town config + NPC configs (JSON content)
