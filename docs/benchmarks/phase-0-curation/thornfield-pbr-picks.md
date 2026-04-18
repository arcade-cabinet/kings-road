---
title: Phase 0 PBR / HDRI Curation — reusable palette
updated: 2026-04-18
status: current
domain: technical
---

# Phase 0 Curated Asset Palette

Permanent project-wide palette of PBR materials, HDRIs, and terrain treatment.
Curated surface-by-surface from `/Volumes/home/assets/2DPhotorealistic/` with
preview-image inspection. Thornfield (the Phase 0 benchmark biome) is the first
consumer, but every pick is chosen for **reuse across biomes** — fabrics,
metals, mosses, and bark carry into hills, forest, meadow, moor, town, and
dungeon without re-curation.

**This file outlives Phase 0.** Even if we pivot from R3F to Godot, the
material IDs and source-pack mappings here remain the single source of truth
for what-material-belongs-where.

## Ingest rule (unchanged — from PBR_MATERIAL_STANDARD.md)

Copy the *entire* source pack directory to `public/assets/pbr/<tactile-id>/`.
Every AmbientCG pack ships Color + NormalGL + NormalDX + Roughness +
Displacement, plus optional AO + Metalness, plus `.blend` / `.mtlx` / `.tres` /
`.usdc` author companions. Runtime binds every map the pack supplies (see
`docs/architecture/PBR_MATERIAL_STANDARD.md`). Author companions are
gitignored; runtime JPGs commit to the repo for shipping.

## PBR palette — 15 tactile IDs

### Biome keys

`TH` = thornfield · `HI` = hills · `FO` = forest · `ME` = meadow · `MO` = moor
· `TO` = town · `DU` = dungeon · `CO` = combat/props (weapons, armor, tools)
· `NA` = narrative props (graves, effigies, shrines)

### Vegetation / ground

| Tactile ID        | Source pack  | Maps present                  | Reuse footprint   | Reasoning |
|-------------------|--------------|-------------------------------|-------------------|-----------|
| `grave-moss`      | `Moss001`    | Color,Normal,Roughness,Disp   | TH FO MO NA DU    | Uneven dark green w/ dead-leaf debris. Forest floor growth; signature Thornfield grave cover. Also lines dungeon wall bases and forest tree roots. |
| `ivy-ground`      | `Ground037`  | Color,Normal,Roughness,Disp,**AO** | TH FO DU NA  | Moss-leaf-earth blend, AO adds plant-to-ground grounding. Overgrown ruins, dungeon entrances, old shrines, forest paths through woods. |
| `dead-grass`      | `Ground003`  | Color,Normal,Roughness,Disp   | TH MO HI NA       | Green sparse on mud — reads as trampled / dying not dead-dry. Better than any pure Grass pack for the Thornfield mood. Moor wastes, hills trample paths. |
| `packed-mud`      | `Ground002`  | Color,Normal,Roughness,Disp   | TH HI TO DU ME    | Dark gravel-mud. Road surface, stable yards, worksite dirt, dungeon cell floors. The most-used ground across the game. |
| `fallen-leaves`   | `Ground078`  | Color,Normal,Roughness,Disp   | TH FO NA          | Leaf-litter autumn floor — deep brown with oak/beech leaves. Forest paths, graveyard beds, shrine approaches. |
| `wet-cobblestone` | `PavingStones010` | Color,Normal,Roughness,Disp,**AO** | TH TO ME   | Mossy granite setts — already has grass/moss in the cracks. Primary town street material. Manor courtyards, temple approaches. Reads "wet" in overcast light. |

### Stone

| Tactile ID               | Source pack | Maps present                | Reuse footprint | Reasoning |
|--------------------------|-------------|-----------------------------|-----------------|-----------|
| `mossy-stone`            | `Rock006`   | Color,Normal,Roughness,Disp | TH DU NA HI     | Dark stone fully taken by moss — the tactile IDENTITY of weathered masonry. Graveyard walls, dungeon outer blocks, cairn bases. |
| `lichen-stone`           | `Rock001`   | Color,Normal,Roughness,Disp | TH HI MO DU NA  | Grey fine-grain granite with moss/lichen flecks. Pairs with `mossy-stone` as splat-blend. Hill outcrops, moor standing stones, dungeon interior walls. |
| `thornfield-cairn-stone` | `Rock048`   | Color,Normal,Roughness,Disp | TH MO HI NA     | Dead-grey weathered granite, sparse lichen. Hand-stacked cairns, boundary stones, moor waystones. |
| `bleached-bone`          | `Ground080` | Color,Normal,Roughness,Disp | NA DU CO        | Pale pitted cream. Ossuaries, skull piles, dry bones, catacomb floors. Also doubles as dry sand/desert expanse if we ever ship a dry-coastal biome. |

### Wood / bark

| Tactile ID      | Source pack | Maps present                | Reuse footprint | Reasoning |
|-----------------|-------------|-----------------------------|-----------------|-----------|
| `weathered-oak` | `Bark012`   | Color,Normal,Roughness,Disp | TH FO HI TO NA CO | Warm ridged oak bark. Named oaks, fence posts, coffin planks, axe hafts, cart sideboards, village barn siding. One bark serves the whole overworld. |
| `wet-bark`      | `Bark014`   | Color,Normal,Roughness,Disp | TH FO MO          | Damp brown bark w/ moss-green valleys. "Been raining a week" feeling. Forest interiors, moor copses, Thornfield's dead trees. |

### Metal

| Tactile ID      | Source pack | Maps present                        | Reuse footprint | Reasoning |
|-----------------|-------------|-------------------------------------|-----------------|-----------|
| `rusted-iron`   | `Rust004`   | Color,Normal,Roughness,Disp,**Metalness** | CO TH NA DU | Metalness map present — essential for benchmark integrity. Weapons, armor, tools, hinges, horseshoes, graveyard gate bars, dungeon cell bars. |
| `black-ironwork`| `Metal005`  | Color,Normal,Roughness,Disp,**Metalness** | CO TH TO DU | Dark pitted iron with faint rust. Metalness map. Weapon fittings, armor plates, sconces, braziers, fence spikes, dungeon cages, lantern ironwork. |

### Fabric

| Tactile ID          | Source pack  | Maps present                | Reuse footprint  | Reasoning |
|---------------------|--------------|-----------------------------|------------------|-----------|
| `grave-cloth-linen` | `Fabric030`  | Color,Normal,Roughness,Disp | NA TH CO TO      | Pale grey threadbare weave. Burial shrouds, peasant tunics, bandages, market-stall awnings, torn flag remnants. |

**Total: 15 PBR packs. Metalness maps on 2 (rusted-iron, black-ironwork).
AO maps on 2 (ivy-ground, wet-cobblestone). Covers 8 biome/context keys.**

## HDRI palette — 2 picks

Sourced from `/Volumes/home/assets/2DPhotorealistic/HDRIs/polyhaven/`. Prefer
1K EXR / HDR (IBL use, not background) — 2K doubles RAM for no perceptual
gain in ambient lighting.

| Ingest id       | Source               | TOD buckets for Thornfield | Reuse footprint            |
|-----------------|----------------------|----------------------------|----------------------------|
| `misty-pines`   | `misty_pines` (PH)   | dawn, noon                 | TH FO MO (any overcast biome) |
| `kloppenheim-04`| `kloppenheim_04` (PH)| dusk, night                | TH MO NA (cursed/nocturnal)   |

Thornfield biome JSON:
```jsonc
"hdri": {
  "dawn":  "misty-pines",
  "noon":  "misty-pines",
  "dusk":  "kloppenheim-04",
  "night": "kloppenheim-04"
}
```

The per-bucket schema lets other biomes (hills, meadow) swap in brighter
HDRIs for daytime without needing new packs. HDRI palette will grow
biome-by-biome — 2 is the Phase 0 minimum.

## Terrain — procedural, not baked

Inspected `TERRAIN/Terrain001..005` from the library. All five packs are
8K satellite scans (fjords, mountain ranges, snowfields) intended for
dramatic vista terrain. **Wrong scale and wrong mood for Thornfield.**

**Decision:** Thornfield uses a **procedural heightmap** — sum-of-octaves
Perlin noise seeded from biome id + chunk coords. Parameters authored
directly in the biome JSON:

```jsonc
"terrain": {
  "kind": "procedural",
  "amplitude": 2.5,       // metres peak-to-trough
  "frequency": 0.008,     // low = rolling hills
  "octaves": 4,
  "persistence": 0.5,
  "seed": "thornfield"    // hashes with chunk coords for determinism
}
```

`src/world/terrain/` (task #7, PR #68) already ships `sampleHeightmap` +
`buildDisplacedGeometry`. For Phase 0 we add a `buildProceduralHeightmap`
sibling so biomes can opt into procgen heightmaps without needing a baked
EXR. Baked terrains join the palette later if the benchmark says we need
the silhouette fidelity.

No Terrain001-005 ingest in Phase 0.

## Follow-ups (not blocking Phase 0)

- **More HDRIs as biomes land.** Each biome gets its own 2-4 HDRIs for
  its time-of-day buckets. Keep them in the same `public/assets/hdri/<id>/`
  structure.
- **Texture compression.** Every pick here is JPG. `docs/architecture/ASSET_SIZE_BUDGET.md`
  (tooling PR #76) targets WebP for PBR runtime JPGs + KTX2 for GLB
  material textures. That's the next pass after the benchmark.
- **Procedural biome terrain params.** When more biomes come online, each
  one authors its own `terrain.amplitude/frequency/octaves` — no palette
  additions needed unless we want distinct *material-blend* rules per
  biome (handled by the splat-map, not by new terrain packs).
