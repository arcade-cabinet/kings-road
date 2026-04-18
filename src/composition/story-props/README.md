---
title: composition/story-props
updated: 2026-04-18
status: current
domain: technical
---

# src/composition/story-props

**Intent:** Narrative seed layer compositor. Places 1-3 authored story-prop archetypes per 500m of road, seeded deterministically per biome + road segment. Each placement carries optional narrative text for future dialogue/popup systems.

**Owner:** Team Composition

**Imports from:** `core`

**Exports:**
- `composeStoryProps(biomeId, roadDistanceRange, seed): StoryPropPlacement[]`
- `STORY_PROP_CATALOG` — 8 authored prop definitions with texts
- `getPropDefsForBiome(biomeId)` — returns catalog weighted for a biome
- `StoryPropPlacement`, `StoryPropArchetype`, `StoryPropDef` — types

**Testing:**
```bash
pnpm test src/composition/story-props
```

## Archetypes (8)

| Archetype | Thornfield? | Notes |
|---|---|---|
| `cairn-with-name` | Yes | Marker for the dead |
| `rusted-sword-in-stump` | Yes | Abandoned weapon |
| `carved-initials-fence` | Both | Universal |
| `bouquet-by-grave` | Yes | Active mourning |
| `child-toy-on-doorstep` | Both | Loss/departure |
| `tally-marks-on-wall` | Yes | Waiting/counting |
| `broken-plough` | Both | Failed harvest |
| `discarded-bundle` | Both | Sudden flight |

## Determinism

`composeStoryProps(biomeId, [start, end], seed)` is pure. Same inputs → same output. Verified by determinism unit test.
