---
title: Asset Size Budget
updated: 2026-04-18
status: current
domain: technical
---

# Asset Size Budget

Mobile APK ceiling: **150 MB** (Play Store / App Store install-size comfort zone for casual RPGs on mid-tier devices — anything larger measurably increases install abandonment).

This document establishes per-category budgets, documents the current baseline, and defines the rules for what ships baked-in vs what streams at runtime.

---

## Current baseline (as of 2026-04-18)

Measured from `public/assets/` in the worktree — reflects all assets committed before Phase 0 biome ingestion starts.

| Category | Path | Size | Notes |
|----------|------|------|-------|
| NPCs | `public/assets/npcs/` | 72 MB | Largest single contributor. Includes `allinone.glb` (14 MB) + `allinonepr.glb` (14 MB) — duplicate "pr" variants explained below. |
| Buildings | `public/assets/buildings/` | 32 MB | Village buildings split across a single bundle + per-building GLBs. |
| Items | `public/assets/items/` | 13 MB | `books.glb` alone is 5.8 MB. |
| Monsters | `public/assets/monsters/` | 12 MB | |
| Dungeon | `public/assets/dungeon/` | 6.4 MB | |
| Weapons | `public/assets/weapons/` | 1.2 MB | |
| Draco decoder | `public/assets/draco/` | 1.0 MB | Runtime WASM — required. |
| Hands | `public/assets/hands/` | 516 KB | |
| Nature | `public/assets/nature/` | 312 KB | |
| Fonts | `public/assets/fonts/` | 244 KB | |
| sql-wasm | `public/assets/sql-wasm.wasm` | 648 KB | Runtime DB engine — required. |
| **Total** | `public/assets/` | **~140 MB** | Before PBR textures, HDRI, and terrain heightmaps are added. |

**The baseline is already at 140 MB — we have ~10 MB headroom before the 150 MB hard ceiling.**

Phase 0 biome ingestion (`scripts/ingest-pbr.ts`, `scripts/ingest-terrain.ts`) will add PBR texture packs (10–30 MB each) and HDRI files (5–15 MB per .exr). **These CANNOT all ship baked-in.**

---

## The "pr" duplicate problem

`npcs/` contains paired `<name>.glb` + `<name>pr.glb` files (e.g. `allinone.glb` 14 MB + `allinonepr.glb` 14 MB). The `pr` variants appear to be preview/editor copies. **28 MB of the NPC budget is straight duplication.** These should not both ship:

- Keep the canonical runtime GLB. Delete `*pr.glb` from `public/` (or move to a local-only directory listed in `.gitignore`).
- Estimated saving: **~28 MB** (based on 7 `*pr.glb` files averaging ~4 MB each).

Fixing this alone brings the baseline to ~112 MB, restoring ~38 MB of headroom.

---

## Per-biome budget targets

There are 6 biomes (Ashford Meadows, Millbrook Forests, Thornfield Hills, Ravensgate, The Pilgrim's Rest, Grailsend). The baked-in APK ships assets for the **first biome only** (Thornfield for Phase 0 benchmark). All subsequent biomes stream.

| Slot | Content | Budget |
|------|---------|--------|
| Runtime foundation (WASM, fonts, Draco) | Always baked-in | 2 MB |
| Core GLBs (player, HUD, UI) | Always baked-in | 5 MB |
| Biome 1 GLBs (Thornfield buildings, ruins, dungeon kit) | Baked-in | 20 MB |
| Biome 1 PBR textures (15 tactile IDs × ~1.5 MB runtime avg) | Baked-in | 22 MB |
| Biome 1 HDRI (1 × .exr, compressed) | Baked-in | 8 MB |
| NPC GLBs (shared across biomes — allinone bundle) | Baked-in | 15 MB |
| Monster GLBs (starter set: skeleton, wolf, goblin) | Baked-in | 8 MB |
| Items + weapons (starter set) | Baked-in | 5 MB |
| Reserve | Wiggle room | 15 MB |
| **Total baked-in ceiling** | | **100 MB** |

Remaining 50 MB is left for OS overhead, app binary, and streaming cache headroom.

### 5-biome ceiling (full game)

Each additional biome streams on first entry and caches locally. Budget per streaming biome:

| Content | Per-biome streaming budget |
|---------|---------------------------|
| GLBs (buildings, props, vegetation) | 25 MB |
| PBR textures (15 tactile IDs) | 22 MB |
| HDRI | 8 MB |
| **Per-biome total** | **~55 MB** |

5 biomes × 55 MB = 275 MB streaming cache. Device storage requirement: ~375 MB (baked + all biomes cached). Acceptable for RPG genre (Stardew Valley is ~200 MB, Genshin is 2+ GB).

---

## Runtime vs baked-in split

| Asset type | Strategy | Rationale |
|------------|----------|-----------|
| Player GLB | Baked-in | Always needed; smallest possible first-frame cost |
| NPC bundle (shared) | Baked-in | NPCs appear in biome 1; bundle is ~14 MB cleaned up |
| Biome 1 buildings + ruins | Baked-in | Phase 0 benchmark requires them on first load |
| Biome 1 PBR textures | Baked-in | Benchmark must measure full-stack PBR |
| Biome 1 HDRI | Baked-in | IBL required for benchmark honesty (see PBR_MATERIAL_STANDARD.md) |
| Biomes 2–6 GLBs | Stream on entry | Lazy-load via `@/assets/gltf.ts` loader |
| Biomes 2–6 PBR + HDRI | Stream on entry | Same loader path |
| Terrain heightmaps | Stream on chunk load | Too large for baked-in; chunked by road distance |
| Audio | Stream on zone enter | Tone.js already does this |
| Content DB | Baked-in | sql-wasm.wasm + game.db are 1–2 MB; required on cold start |

---

## Compression recommendations

### GLBs

Current GLBs in `public/assets/` are **uncompressed**. Applying Draco mesh compression + Basis Universal texture compression (already have `public/assets/draco/draco_decoder.wasm`) would cut GLB sizes 40–70%.

Run via `@gltf-transform/functions` (already a dev dependency):

```bash
# Compress a GLB in-place
npx gltf-transform optimize input.glb output.glb \
  --texture-compress webp \
  --draco
```

Estimated savings on NPC bundle: 14 MB → ~6 MB. Full asset tree: ~140 MB → ~55–70 MB.

**This should run as part of the ingest pipeline, not as a manual step.** Add a `scripts/compress-assets.ts` that processes `public/assets/**/*.glb` and writes to `public/assets-compressed/`. Vite build should reference the compressed path; dev server can use originals.

### PBR textures

Polyhaven / Ambientcg source packs are JPEG. For Capacitor/WebGL the runtime format options are:

| Format | Tool | Size reduction | GPU upload | Support |
|--------|------|---------------|------------|---------|
| JPEG (current) | — | baseline | CPU decode + upload | Universal |
| WebP | sharp / gltf-transform | −20–35% | CPU decode + upload | Universal on target platforms |
| KTX2 / Basis Universal | `toktx` / `basisu` | −40–60% compressed; GPU-native | Direct GPU upload | Requires KTX2Loader in three.js |

Recommended path: **WebP for Phase 0** (zero runtime code change, straightforward tooling). KTX2 for Phase 1+ (requires adding `KTX2Loader` + `BasisTextureLoader` to `src/assets/pbr/loader.ts`).

WebP conversion is one line per pack:

```bash
for f in public/assets/pbr/**/*.jpg; do
  cwebp -q 85 "$f" -o "${f%.jpg}.webp"
done
```

Estimated PBR pack size at 85% WebP: 10 MB → 6–7 MB per pack.

### HDRI

Ship `.exr` files compressed with `exrcomp` or convert to RGBE `.hdr` (smaller, three.js supports both). A 4K HDRI at EXR is 30–60 MB; at 2K RGBE it's 5–8 MB. Phase 0 benchmark uses one HDRI — 2K RGBE is sufficient.

```bash
# Convert to 2K RGBE via ffmpeg
ffmpeg -i input.exr -vf scale=2048:-1 output.hdr
```

---

## CI size gate

Add a CI step that fails if `public/assets/` exceeds the baked-in ceiling:

```yaml
- name: Asset size gate
  run: |
    SIZE=$(du -sm public/assets/ | cut -f1)
    echo "public/assets/ is ${SIZE}MB"
    if [ "$SIZE" -gt 100 ]; then
      echo "ERROR: public/assets/ exceeds 100MB baked-in ceiling (${SIZE}MB)"
      exit 1
    fi
```

This goes in `.github/workflows/ci.yml` after the build step. The 100 MB threshold matches the baked-in budget table above.

---

## Immediate action items

Priority order before Phase 0 branch cuts:

1. **Delete `*pr.glb` duplicates** from `public/assets/npcs/` — saves ~28 MB, no code change. (Owner: whoever touches NPC loading next.)
2. **Add asset size CI gate** — prevents future regressions. (Owner: tooling.)
3. **Run `gltf-transform optimize` on NPC + buildings GLBs** — biggest single compression win. (Owner: assets-agent or tooling.)
4. **Convert PBR textures to WebP** in `scripts/ingest-pbr.ts` — add `--texture-compress webp` to ingest. (Owner: assets-agent.)
5. **Downscale HDRI to 2K RGBE** in `scripts/ingest-hdri.ts` — keeps HDRI baked-in budget under 8 MB. (Owner: assets-agent or team-lead.)

---

## Branch protection note

As of 2026-04-18, `main` has **no branch protection rules** (`gh api repos/arcade-cabinet/kings-road/branches/main/protection` returns 404). The `Package Boundaries` CI step (PR #65) and this `Asset size gate` will both run in CI but currently cannot be marked as **required checks** until branch protection is configured.

Recommended branch protection settings for `main`:

```
Required status checks:
  - Test & Lint / Biome lint
  - Test & Lint / TypeScript check
  - Test & Lint / Unit tests
  - Test & Lint / Package boundaries
  - Test & Lint / Asset size gate   ← add after CI step lands
Require branches to be up to date before merging: true
Require a pull request before merging: true
  Required approvals: 1
Restrict who can push to matching branches: true (team-lead only)
```

Configure via:

```bash
gh api repos/arcade-cabinet/kings-road/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Test & Lint / Biome lint","Test & Lint / TypeScript check","Test & Lint / Unit tests","Test & Lint / Package boundaries"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field restrictions=null
```

---

## Related

- `docs/architecture/PBR_MATERIAL_STANDARD.md` — full-stack PBR binding rules (benchmark fidelity depends on this).
- `scripts/ingest-pbr.ts` — PBR pack ingest (add WebP compression here).
- `scripts/ingest-hdri.ts` — HDRI ingest (add 2K RGBE downscale here).
- `scripts/compress-assets.ts` — to be authored: post-ingest GLB compression.
- `.github/workflows/ci.yml` — add asset size gate step.
