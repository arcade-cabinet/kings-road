---
title: Thornfield PBR Curation Picks
updated: 2026-04-18
status: current
domain: technical
---

# Thornfield PBR Material Picks

Curated by team-lead for task #6 — inspection-driven. For each tactile ID
we want for Thornfield, the chosen AmbientCG-style pack from
`/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/` is listed with a
short justification from the preview PNG and Color map.

This file is the input to `scripts/ingest-pbr.ts` once `src/assets/`
(task #3) lands: each row becomes a `(tactile-id, source-pack)` pair.

## Ingest rule (important)

**Copy the *entire* source pack directory** to `public/assets/pbr/<tactile-id>/`.
Do NOT cherry-pick individual maps. Every AmbientCG-style pack ships:

- `<Name>_Color.jpg` — albedo (the one we use now)
- `<Name>_NormalGL.jpg` — normal (OpenGL / three.js convention)
- `<Name>_NormalDX.jpg` — normal (DirectX convention)
- `<Name>_Roughness.jpg` — roughness
- `<Name>_Displacement.jpg` — height / parallax
- `<Name>_AmbientOcclusion.jpg` — AO (not always present)
- `<Name>_Metalness.jpg` — metalness (metals / worn iron only)
- `<Name>.blend`, `.mtlx`, `.tres`, `.usdc` — Blender / Godot / USD companions
- `<Name>.png` — preview for future tooling / UI

Keeping all of it means:
1. We can add AO + displacement without re-ingestion when the shader supports it.
2. We can swap NormalDX↔NormalGL per platform without breakage.
3. Preview PNG is available for future in-game encyclopedia / swatch UI.
4. Blender / USD companions usable by human authors.

### Benchmark requires the full PBR stack

Phase 0's whole point is measuring whether R3F can deliver full PBR
fidelity on a phone. If the benchmark only binds Color + Normal +
Roughness, the verdict is wrong — it doesn't reflect what the *real*
target looks like.

The loader (`loadPbrMaterial` in `src/assets/pbr/loader.ts`) MUST bind
every available map to the `MeshStandardMaterial`:

| File                    | three.js binding   | When to bind |
|-------------------------|--------------------|--------------|
| `_Color.jpg`            | `map`              | Always       |
| `_NormalGL.jpg`         | `normalMap`        | Always       |
| `_Roughness.jpg`        | `roughnessMap`     | Always       |
| `_Displacement.jpg`     | `displacementMap`  | Always (even if displacementScale is 0) |
| `_AmbientOcclusion.jpg` | `aoMap`            | If present   |
| `_Metalness.jpg`        | `metalnessMap`     | If present (metals only) |

**Not bound** — we pick NormalGL and ignore NormalDX. Everything else
above is runtime-consumed.

### Gitignore strategy — author companions, not runtime maps

Ingest copies the whole source directory for author flexibility, but
Blender / USD companion files aren't runtime-consumed and would bloat
the committed tree. Gitignore:

```text
# Author-side companions — kept locally for iteration, not committed
public/assets/pbr/**/*.blend
public/assets/pbr/**/*.blend1
public/assets/pbr/**/*.mtlx
public/assets/pbr/**/*.tres
public/assets/pbr/**/*.usdc
public/assets/pbr/**/_NormalDX.jpg
public/assets/pbr/**/*.png
public/assets/hdri/**/*.blend
public/assets/hdri/**/*.blend1
public/assets/hdri/**/*.tres
public/assets/hdri/**/*.usdc
public/assets/hdri/**/*.png
```

Runtime ships: all six JPG maps per PBR pack (Color, NormalGL,
Roughness, Displacement, AO, Metalness) + `.exr` per HDRI. That's the
benchmark target surface.

Contributors who run ingest get .blend / .usdc / preview companions
locally for tooling; repo stays lean.

## Locked picks — PBR materials (15 of 15)

Each row reports the chosen pack, reasoning from the preview / Color
map, and which PBR maps ship (C = Color, N = NormalGL, R = Roughness,
D = Displacement, AO = AmbientOcclusion, M = Metalness).

| Tactile ID               | Source pack       | Maps           | Reasoning |
|--------------------------|-------------------|----------------|-----------|
| `grave-moss`             | `Moss001`         | C, N, R, D     | Uneven dark green with dead-leaf debris mixed in. Reads as natural forest-floor growth atop a long-neglected grave, not a cultivated lawn. |
| `mossy-stone`             | `Rock006`         | C, N, R, D     | Dark stone fully taken over by moss — more defining Thornfield look than a pure moss-on-top (Moss003). This IS the tactile identity: stone so weathered it's *become* moss. |
| `lichen-stone`            | `Rock001`         | C, N, R, D     | Grey fine-grain granite flecked with moss/lichen green in the albedo. Pairs with `mossy-stone` as a splat-blend — the two together read as authentic weathered masonry. |
| `thornfield-cairn-stone`  | `Rock048`         | C, N, R, D     | Dead-grey weathered granite with sparse lichen spots. Reads as a hand-stacked cairn that's been in cold fog for centuries. |
| `weathered-oak`           | `Bark012`         | C, N, R, D     | Warm brown ridged oak bark — classic English oak silhouette. Best fit for named oak trees, fence posts, coffin planks. |
| `wet-bark`                | `Bark014`         | C, N, R, D     | Damp warm-brown bark with faint moss-green hints in the valleys. The slight greening reads as "it's been raining for a week." |
| `grave-cloth-linen`       | `Fabric030`       | C, N, R, D     | Pale grey woven with visible weft/warp. Reads exactly as burial-shroud linen — no pattern, no color, just threadbare fabric. |
| `fallen-leaves`           | `Ground040`       | C, N, R, D, AO | True leaf-litter ground — mixed brown/orange/yellow autumn leaves on dark soil. Reads unmistakably as an abandoned forest floor late in the year, not "new grass with a few leaves." Has AO for the deep gaps between curled leaves. |
| `ivy-ground`              | `Grass007`        | C, N, R, D     | Creeping clover/ivy-style ground cover with irregular leafy starbursts on a dark-green mat. Variable leaf shapes read as organic ivy rather than uniform turf. Better ivy match than Ground037 (which is more moss-on-dirt). |
| `dead-grass`              | `Ground015`       | C, N, R, D     | Matted brown/grey dried grass pressed into earth — cold-dead thatch rather than hay-yellow stubble. Exactly Thornfield's "the fields stopped being tended years ago" beat. |
| `packed-mud`              | `Ground036`       | C, N, R, D     | Dark wet trodden earth with sparse grass blades and twigs pressed into it. Reads as a village path walked daily for years — not sand, not mulch, but the real mud of an English footpath in autumn. |
| `wet-cobblestone`         | `PavingStones070` | C, N, R, D, AO | Worn medieval cobbles in mixed greys / warm browns with moss creeping up through the joints. Irregular hand-cut stones, not factory pavers. Moss in the gaps sells the "nobody has walked this street in a year" read. AO sharpens the deep joints. |
| `rusted-iron`             | `Rust004`         | C, N, R, D, M  | Deep red-brown corrosion with irregular patina breakup — no polished base metal showing through. Correct roughness + metalness values for a fully rust-eaten wrought fitting. Metalness is critical for the benchmark's PBR stress. |
| `black-ironwork`          | `Metal029`        | C, N, R, D, M  | Cloudy near-black forged metal with subtle hammered/swirled grain. Reads as hand-forged wrought iron (fence spikes, gate hinges) rather than mass-produced powder coat. Low roughness highlights catch rim light on shaped edges. |
| `bleached-bone`           | `Ivory002B`       | C, N, R, D     | Pale cream with faint horizontal grain — ivory rather than porcelain or plaster. Reads as aged sun-bleached bone (skulls, ribs, graveyard prop accents) without being nuclear white. Pairs well with `grave-cloth-linen` for shrine / ossuary dressing. |

## Locked picks — HDRIs (3 of 3)

Thornfield runs three time-of-day buckets. All three picks come from
AmbientCG-style packs under `/Volumes/home/assets/2DPhotorealistic/HDRI/1K/`
because each ships a `_TONEMAPPED.jpg` preview that lets us visually
verify mood without opening the `.hdr`. The Polyhaven HDRIs in
`/Volumes/home/assets/2DPhotorealistic/HDRIs/polyhaven/` are preview-less,
so they're deferred until we can tonemap them locally.

Each pack ships: `<Name>_1K_HDR.exr` (runtime-consumed) +
`<Name>_1K_TONEMAPPED.jpg` (preview) + `.blend` / `.tres` / `.usdc` /
`.png` (author companions, gitignored).

| Bucket | Pack                    | Filename                          | Reasoning |
|--------|-------------------------|-----------------------------------|-----------|
| `dawn` | `MorningSkyHDRI001A`    | `MorningSkyHDRI001A_1K_HDR.exr`   | Cold misty dawn over open field with low diffuse sun just above tree line. Desaturated blue sky graduating to muted gold at the horizon — no saturated warm light, which is exactly what a cursed abandoned village wants. Landscape reads as neglected grass / ditch rather than pristine meadow. |
| `noon` | `DayEnvironmentHDRI005` | `DayEnvironmentHDRI005_1K_HDR.exr` | Overcast stone-grey sky over a deciduous forest floor carpeted in dead leaves. Flat diffuse light with NO visible sun disc — exactly the "cursed village, sky never clears" brief. The leaf-litter ground in the HDRI itself reinforces Thornfield's tactile palette through reflected IBL. |
| `dusk` | `EveningSkyHDRI015A`    | `EveningSkyHDRI015A_1K_HDR.exr`   | Overcast coastal dusk with thick layered clouds in purple-grey tones and a muted glow near the horizon — twilight, not sunset. No warm sun disc. Reads as foggy late-evening gloom rather than romantic golden-hour. |

## Locked picks — Terrain (1 of 1)

Terrain packs under `/Volumes/home/assets/2DPhotorealistic/TERRAIN/` ship
16-bit EXR heightmaps at 2K / 4K / 8K plus a satellite-albedo Color +
ancillary Details / Flow / Soil detail maps. They do NOT ship separate
NormalGL / Roughness JPGs — those are derived from the heightmap + Color
by the terrain shader, so the "NormalGL / Roughness" columns are N/A
for terrain picks (unlike PBR material packs).

All five candidate packs (Terrain001..005) are alpine/mountainous
source data. None ship gentle pastoral hills natively. Terrain001 is
the least jagged option: a single ridge cluster with broad rolling
shoulders on three sides, which — downsampled and with vertical scale
reduced in the terrain renderer — reads credibly as "rolling farmland
with a tor in the distance." This is the pragmatic pick until we
author a purpose-built Thornfield heightmap.

| Tactile role             | Source pack  | Heightmap (displacement)      | Color (albedo)                 | Ancillary detail maps |
|--------------------------|--------------|-------------------------------|--------------------------------|-----------------------|
| `thornfield-farmland`    | `Terrain001` | `Terrain001_2K.exr`           | `2K-JPG/Terrain001_2K_Color.jpg` | `2K-JPG/Terrain001_2K_Details.jpg`, `2K-JPG/Terrain001_2K_Flow.jpg`, `2K-JPG/Terrain001_2K_Protrusion.jpg`, `2K-JPG/Terrain001_2K_Soil.jpg` |

**Runtime use:** the 2K EXR is the primary heightmap — ingest should
copy `Terrain001_2K.exr` to `public/assets/terrain/thornfield-farmland/heightmap.exr`
and the 2K-JPG Color + Details to the same directory. The 4K and 8K
EXRs stay on the NAS unless we need them for a specific shot; 2K is
the phone benchmark target. Vertical scale in the shader must be
reduced (roughly 0.25-0.4x) to flatten the alpine source into
Thornfield's rolling-farmland silhouette.

**Follow-up:** task #13 (app/scene/terrain) should flag this as a
known-compromise pick, and task #22 (benchmarks + decision doc) should
budget time to evaluate whether a hand-authored Thornfield heightmap
is warranted before Phase 1.

## Not yet claimed

None. All 15 tactile IDs + 3 HDRI buckets + 1 terrain slot are locked.
