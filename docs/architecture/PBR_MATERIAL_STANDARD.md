---
title: PBR Material Standard
updated: 2026-04-18
status: current
domain: technical
---

# PBR Material Standard

*Codifies the full-PBR target for every material the runtime renders. Applies to every biome, every scene, every asset from this point forward. Emerged from the Phase 0 benchmark decision — if the benchmark proves R3F can deliver it on a phone, this IS the standard.*

## The rule

**Every `MeshStandardMaterial` in the runtime binds every map the source pack supplies, not a subset.**

A "rusted-iron" material with only Color + NormalGL + Roughness reads as *a surface painted to look rusty*. The same material with Metalness bound reads as actual metal — speculars, reflections, and shadow response all shift. An "ivy-ground" material with only Color + Normal + Roughness reads as *green-tinted dirt*. With AmbientOcclusion bound, the dark pockets under leaves gain depth. The difference between "authored PBR" and "procedural-looking" is the *full map stack* being bound.

## Canonical binding table

When `loadPbrMaterial(id)` constructs a `THREE.MeshStandardMaterial`, it probes `public/assets/pbr/<id>/` for these files and binds each one that exists:

| File in pack                  | three.js property    | Binding rule |
|-------------------------------|----------------------|--------------|
| `<Pack>_Color.jpg`            | `material.map`       | Required — always present |
| `<Pack>_NormalGL.jpg`         | `material.normalMap` | Required — always present |
| `<Pack>_Roughness.jpg`        | `material.roughnessMap` | Required — always present |
| `<Pack>_Displacement.jpg`     | `material.displacementMap` | Bind only when the consumer opts in (passes `displacementScale > 0`). Assigning `displacementMap` with `displacementScale: 0` still enables three.js's displacement shader path (a texture fetch per fragment), so bind-and-zero is not free — leave it unbound for the default. |
| `<Pack>_AmbientOcclusion.jpg` | `material.aoMap`     | **Required when present.** Without it, crevices and shadowed pockets render unnaturally flat. |
| `<Pack>_Metalness.jpg`        | `material.metalnessMap` | **Required when present.** Without it, metals (`rusted-iron`, `black-ironwork`, weapons, coins, hinges, buckles, bell) render as painted plastic. |

### Not bound (intentional)

| File in pack              | Why skipped |
|---------------------------|-------------|
| `<Pack>_NormalDX.jpg`     | WebGL/three uses OpenGL normal convention. Shipping both would duplicate ~500KB/pack for no runtime benefit. |

### UV channels for AO (three r150+)

`MeshStandardMaterial.aoMap` reads from whichever attribute the texture's `channel` property points at — default `channel = 0` resolves to the `uv` attribute, `channel = 2` resolves to `uv2`. The project leaves `channel` at its default, so aoMap draws from the same `uv` set as Color/Normal/Roughness.

**No uv→uv2 copy is required.** The older "clone uv → uv2" pattern is a three pre-r150 convention and has no effect on `aoMap` in three r183 (the pinned version). `prepareGeometryForPbr(geometry)` from `src/assets/pbr/` verifies the geometry has a `uv` attribute and warns if it doesn't — that's the only invariant AO needs. Compositors still call it to fail loudly on malformed GLBs, but it no longer mutates geometry.

### Default material settings

`loadPbrMaterial` returns the material with these defaults unless overridden:

| Property             | Default | Rationale |
|----------------------|---------|-----------|
| `envMapIntensity`    | `1.0`   | Full reflection of the `<Environment>` HDRI. Biome-authored HDRI drives IBL; materials consume it fully. |
| `aoMapIntensity`     | `1.0`   | AO shows when present. Per-mesh can tune. |
| `metalness`          | `1.0` when metalnessMap present, else `0.0` | If a pack ships a metalness map it's a metal; trust it. |
| `roughness`          | `1.0`   | Gets multiplied by `roughnessMap` sample. |
| `displacementScale`  | `0.0`   | Opt-in — most uses don't want actual displacement, just the normal map's micro-detail. Turn it up per-material for close-ups (weapon detail, floor tiles, terrain). |
| `normalScale`        | `(1, 1)` | Full normal strength. |

## The "ship only runtime" gitignore

Every pack is ingested whole (the ingest script copies the entire source directory), but not every file in the pack is a runtime asset. Author companions, preview PNGs, and the WebGL-unused NormalDX are gitignored:

```text
# Under public/assets/pbr/**/
*.blend        # Blender source
*.blend1       # Blender backup
*.mtlx         # MaterialX
*.tres         # Godot resource
*.usdc         # USD binary
*_NormalDX.jpg # DirectX normal — WebGL uses GL convention
*.png          # Preview image (revisit if we build a swatch UI)
```

Contributors who run ingest scripts get the companions locally for author-side iteration. The committed tree stays lean; CI pipelines stay fast.

Same rule for `public/assets/hdri/**/` — commit the `.exr`, ignore the rest.

## Benchmark implications

Phase 0's decision is *measure, don't guess*. The benchmark must bind the full stack or the measurement doesn't reflect ship reality:

- Loading half the maps gives better fps on paper than the shipping game will deliver.
- A "stay in R3F" verdict based on half-stack fps is a trap — first biome out after Phase 0 will miss the budget.
- A "port to Godot" verdict based on half-stack fps is overreaction — Godot wasn't going to save us if we're not even taxing R3F's full PBR path.

**The benchmark scene in Thornfield will exercise every binding: AO on ruins stone (crevices between blocks), metalness on the player's equipped iron sword + any iron hinges/railings/bells in the village, displacement on wet cobblestone where close-up camera angles benefit from parallax.**

## Authoring checklist (for future compositors)

When adding a new material to the palette or using one in a scene:

- [ ] Source pack includes at minimum Color + NormalGL + Roughness.
- [ ] Pack ingested via `scripts/ingest-pbr.ts <tactile-id> <source-pack>` (whole-dir copy).
- [ ] AO map included if pack supplies one — check `ls public/assets/pbr/<id>/ | grep AO`.
- [ ] Metalness map included if the material is a metal — same check for `Metalness`.
- [ ] Consumer geometry calls `prepareGeometryForPbr(geometry)` before material apply.
- [ ] If displacement matters (parallax close-up), consumer requests a clone via `loadPbrMaterial(id, { displacementScale: N })`. **Do not mutate the material returned with defaults** — it's a shared cached instance; mutating it leaks state into every other consumer of the same id.

## Why this matters for RPG resource systems

PBR fidelity is the difference between *having a material* and *reading as a real substance*. This becomes load-bearing the moment the game adds resource systems that the genre expects — crafting, mining, felling, fishing, hunting, fire, forging.

Every one of these depends on material differentiation that pure albedo can't carry:

| System          | Why full PBR matters |
|-----------------|----------------------|
| **Mining**      | Copper ore vs iron ore vs silver ore vs coal — near-identical albedos. The reader is Metalness (silver/iron high, copper medium, coal zero) + Roughness (coal matte, silver polished) + AO (recessed crystals in rough ore bodies). Without the full stack, every ore looks like "brown rock with colored flecks." |
| **Felling** | Live oak vs dead oak vs ash vs pine. Bark color overlaps. The reader is normal (ridge depth), roughness (bark wetness), AO (deep crevices). A felled log's fresh-cut end face needs its own material (pale, high roughness, no metalness) versus the weathered exterior (lower roughness, moss-inclusive color). |
| **Fishing**    | Fish scales are the canonical metalness-map test case. A salmon without metalness map is a painted prop; with it, the iridescence tracks the light. Wet stone riverbeds need roughness + displacement for caustics readability. |
| **Hunting**   | Fur + hide differentiation. Deer hide vs wolf fur vs rabbit pelt — all near-brown-albedos. Roughness + normal detail (fur direction, coat wetness) is what separates them. Skinned vs unskinned hide: skinned needs subsurface feel (low roughness, slight wetness); rawhide is matte + grainy. |
| **Fire / Forge** | Fire = emissive map. Anvil = full metal (metalness 1.0 + roughness map for hammered-polished spots + AO for hammer-struck dents). Forge hearth = emissive + roughness + AO for coal bed. Quenched iron vs heated iron is roughness + emissive shift; half-stack PBR can't render the heat gradient. |
| **Crafting**  | Every output tier (copper→iron→steel→mithril) must read as a distinct metal. Without metalness+roughness differentiation, the player can't tell a copper sword from an iron one at a glance. The *game loop* breaks if tiers aren't visually distinct. |
| **Campfire**  | Emissive embers (Emissive map), ash (high-roughness / no-metal), glowing logs (emissive + roughness shift on the struck side), metal kettle above (metalness + AO for soot). Every cozy-genre expectation depends on the full stack. |

Pattern: **cozy-RPG systems ARE material systems.** The game sells a promise of craftable, harvestable, meaningful substance. Delivering that promise is full-PBR or it isn't real.

## Authoring checklist for resource assets

When adding an asset that represents a harvestable / craftable resource:

- [ ] Base material uses full PBR per the canonical binding table.
- [ ] If the asset is metal (ore, ingot, weapon, tool), Metalness map is required. If the source pack doesn't ship one, author one (paint black+white in Blender, 10min work) rather than shipping a flat-metalness material.
- [ ] If the asset has deep surface variation (ore nodules, hammered metal, bark ridges, scale patterns), AO map is required. Same rule — author if missing.
- [ ] Emissive materials (fire, embers, glowing forge metal, magic ore) declare `material.emissive` + `emissiveMap` + `emissiveIntensity` per biome time-of-day (night campfires read strongest).
- [ ] State transitions (green→chopped, raw→cooked, quenched→heated) are new material IDs in the palette, not procedural tints of one material.

## Related

- `docs/superpowers/specs/2026-04-18-thornfield-phase-0.md` — the Phase 0 benchmark spec that drove this standard.
- `docs/benchmarks/phase-0-curation/thornfield-pbr-picks.md` — the 15 Thornfield tactile-ID picks.
- `src/assets/pbr/loader.ts` — the loader implementing this binding table.
- `scripts/ingest-pbr.ts` — the ingest tool that copies packs whole.
