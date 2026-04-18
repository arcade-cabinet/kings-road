---
title: Thornfield PBR Curation Picks
updated: 2026-04-18
status: draft
domain: technical
---

# Thornfield PBR Material Picks

Curated by team-lead (me) for task #6 — inspection-driven. For each tactile ID
we want for Thornfield, the chosen AmbientCG-style pack from
`/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/` is listed with a
short justification from the preview PNG.

This file is the input to `scripts/ingest-pbr.ts` once `src/assets/` (task #3)
lands: each row becomes a `(tactile-id, source-pack)` pair.

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

## Inspected

| Tactile ID               | Source pack | Reasoning |
|--------------------------|-------------|-----------|
| `grave-moss`             | `Moss001`   | Uneven dark green with dead-leaf debris mixed in. Reads as natural forest-floor growth atop a long-neglected grave, not a cultivated lawn. |
| `mossy-stone`            | `Rock006`   | Dark stone fully taken over by moss — more defining Thornfield look than a pure moss-on-top (Moss003). This IS the tactile identity: stone so weathered it's *become* moss. |
| `lichen-stone`           | `Rock001`   | Grey fine-grain granite flecked with moss/lichen green in the albedo. Pairs with `mossy-stone` as a splat-blend — the two together read as authentic weathered masonry. |
| `thornfield-cairn-stone` | `Rock048`   | Dead-grey weathered granite with sparse lichen spots. Reads as a hand-stacked cairn that's been in cold fog for centuries. |
| `weathered-oak`          | `Bark012`   | Warm brown ridged oak bark — classic English oak silhouette. Best fit for named oak trees, fence posts, coffin planks. |
| `wet-bark`               | `Bark014`   | Damp warm-brown bark with faint moss-green hints in the valleys. The slight greening reads as "it's been raining for a week." |
| `grave-cloth-linen`      | `Fabric030` | Pale grey woven with visible weft/warp. Reads exactly as burial-shroud linen — no pattern, no color, just threadbare fabric. |

## Still to inspect

| Tactile ID             | Candidates to review |
|------------------------|----------------------|
| `wet-bark`             | Bark001-015 (15 packs) |
| `fallen-leaves`        | Leaf001-003 (3 packs) |
| `ivy-ground`           | Ground ~117 packs — narrow to the leafy/organic variants |
| `dead-grass`           | Grass001-008 (8 packs) |
| `packed-mud`           | Ground variants — muddy trail subset |
| `lichen-stone`         | Rock001-065 + Rocks001-026 — look for the grey-with-pale-crusts variant |
| `wet-cobblestone`      | Check the Cobblestone* subset under Ground or Rocks |
| `weathered-oak`        | Wood001-100, Bark001-015 (for bark-heavy alt), WoodSiding series |
| `rusted-iron`          | Rust001-010, Metal variants |
| `bleached-bone`        | Likely doesn't have a direct pack — may compose from a pale-stone Rock + high roughness, or pick a porcelain/pale Clay/Plaster |
| `grave-cloth-linen`    | Fabric001-086 — look for burlap/muslin/canvas variants, pale neutral |
| `black-ironwork`       | Metal* dark variants or MetalPlates |
| `thornfield-cairn-stone` | Rock variants — granitic, medium-grey, weathered |

## Not yet claimed

None. Curation happens incrementally as I batch-read previews — will update this
file as I go and before invoking `ingest-pbr.ts`.
