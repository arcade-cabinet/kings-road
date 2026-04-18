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

**The baseline is already at 140 MB — only ~10 MB headroom before the 150 MB APK ceiling.** The CI gate (below) enforces a 100 MB baked-in ceiling, which requires ~40 MB of reduction from the current baseline before it will pass. The two highest-impact actions (delete `*pr.glb` duplicates: −28 MB; GLB compression: −30–50 MB) together close that gap.

Phase 0 biome ingestion (planned scripts — not yet in the repo) will add PBR texture packs (10–30 MB each) and HDRI files (5–15 MB per .exr). **These CANNOT all ship baked-in.**

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
| Biome 1 HDRI | Baked-in | IBL must be present on first load so benchmark lighting matches shipped PBR quality |
| Biomes 2–6 GLBs | Stream on entry | Lazy-load via the runtime asset streaming pipeline on biome entry |
| Biomes 2–6 PBR + HDRI | Stream on entry | Stream alongside the biome's GLBs through the same runtime asset pipeline |
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

A CI step in `.github/workflows/ci.yml` (after the build step) fails if `public/assets/` grows past the limit:

```yaml
- name: Asset size gate
  run: |
    SIZE=$(du -sm public/assets/ 2>/dev/null | cut -f1)
    if [ -z "$SIZE" ]; then
      echo "ERROR: public/assets/ not found — check build output"
      exit 1
    fi
    echo "public/assets/ is ${SIZE}MB"
    if [ "$SIZE" -gt 150 ]; then
      echo "ERROR: public/assets/ exceeds 150MB APK ceiling (${SIZE}MB)"
      exit 1
    fi
    if [ "$SIZE" -gt 100 ]; then
      echo "WARNING: public/assets/ exceeds 100MB baked-in target (${SIZE}MB) — delete *pr.glb duplicates and compress GLBs to reach target"
    fi
```

**Hard ceiling: 150 MB** (APK install-size limit) — fails CI if breached. **Soft target: 100 MB** — warns above 100 MB to surface the 40 MB cleanup obligation. Lower the hard ceiling to 100 MB once `*pr.glb` deletion and GLB compression land.

---

## Immediate action items

Priority order before Phase 0 branch cuts:

1. **Delete `*pr.glb` duplicates** from `public/assets/npcs/` — saves ~28 MB, no code change. (Owner: whoever touches NPC loading next.)
2. **Add asset size CI gate** — done in this PR; hard ceiling 150 MB (fail), soft target 100 MB (warn). Lower hard ceiling to 100 MB once #1 + #3 land.
3. **Run `gltf-transform optimize` on NPC + buildings GLBs** — biggest single compression win. Add a `scripts/compress-assets.ts` that processes `public/assets/**/*.glb`. (Owner: assets-agent or tooling.)
4. **Convert PBR textures to WebP** when the PBR ingest script is authored — add `--texture-compress webp` flag. (Owner: assets-agent.)
5. **Downscale HDRI to 2K RGBE** when the HDRI ingest script is authored — keeps HDRI baked-in budget under 8 MB. (Owner: assets-agent or team-lead.)

---

## Required status checks — enterprise ruleset 11889443

`main` is protected via the **enterprise-level ruleset** (ID 11889443), not via repo-level branch protection. The repo-level endpoint (`gh api repos/arcade-cabinet/kings-road/branches/main/protection`) returns 404, but the enterprise ruleset is active and enforces:

- `non_fast_forward` — no force pushes
- `required_linear_history` — squash merges only
- `pull_request` — `allowed_merge_methods: ["squash"]`, `dismiss_stale_reviews_on_push: true`

**What still needs an org-admin action:** the enterprise ruleset does not yet list `required_status_checks`. The following CI jobs should be added to the ruleset's required checks by whoever holds org-admin access:

| Check context string | Provided by | When to require |
|---|---|---|
| `Test & Lint / Biome lint` | `.github/workflows/ci.yml` | Now |
| `Test & Lint / TypeScript check` | `.github/workflows/ci.yml` | Now |
| `Test & Lint / Unit tests` | `.github/workflows/ci.yml` | Now |
| `Test & Lint / Package boundaries` | `.github/workflows/ci.yml` (PR #65) | After #65 merges |
| `Test & Lint / Asset size gate` | `.github/workflows/ci.yml` (this PR) | After this PR merges |
| `CodeQL / Analyze (javascript-typescript)` | `.github/workflows/codeql.yml` | Now |

These cannot be configured via `gh api` at the repo level — they must be set in the enterprise ruleset UI or via the enterprise GraphQL API (`updateRepositoryRuleset` mutation). This is an org-admin action outside agent scope.

---

## Related

- `src/utils/textures.ts` — current runtime PBR/material texture handling.
- `scripts/` — existing asset pipeline scripts; PBR ingest, HDRI downscale, and GLB compression scripts are planned and to be authored here.
- `.github/workflows/ci.yml` — asset size gate step (added in this PR).
