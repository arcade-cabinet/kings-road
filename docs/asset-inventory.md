---
title: Asset Inventory — Historical (Pending Integration Packs)
updated: 2026-04-18
status: archived
domain: creative
---

# Asset Inventory — Historical

> **Archived 2026-04-18**: all packs listed below were integrated into `public/assets/` during the v1 beta work (see v1.3.0). This file is kept as a historical record of the source packs, their structure, and priority rankings used during triage. For the current authoritative list of shipped assets, browse `public/assets/` directly or see the v1.3.0 release notes.

All packs lived in `pending-integration/` (gitignored). Extracted to `pending-integration/extracted/<pack>/`.
**Priority tiers:** P0 = game-blocker (no gear exists yet), P1 = immediate value, P2 = nice-to-have, P3 = defer.

---

## FPS Viewmodel Weapons

The game currently has **zero equipped weapons**. Every weapon-shaped mesh is P0.
Hand models from HandsPack are the paired viewmodel base for all held weapons.

| Filename | Pack | Style | Rigged | Notes |
|---|---|---|---|---|
| `Axe.fbx` | Axe | Medieval, low-poly | Static | 1 mesh, 2 textures (clean + bloody). Simple hatchet shape. |
| `Knife_1.fbx`–`Knife_5.fbx` | PSX-Knives | PSX retro | Static | 5 distinct blade shapes (stiletto, bowie, hunting, cleaver-style, wide). 4 texture sets each (Wooden, Wooden\_bloody, Black, Black\_bloody). |
| `Cleaver.glb` | Loose | Realistic | Static | 1 mesh (Cube.013), 25 KB. Kitchen cleaver shape, no rig. |
| `Machete.glb` | Loose | Realistic | Static | 1 mesh (Cube.017), 46 KB. Long blade, no rig. |
| `Sword.glb` | Fantasy Mega Pack | PSX medieval | Static | 1 mesh (Cube), 364 KB. Paired with Knight character. |
| `WeaponsJapanese.glb` | Fantasy Mega Pack | Anime/Japanese medieval | Static | 35 meshes in one file: Katana × 5 quality tiers, Wakazashi, Tanto, Tachi, Odachi, Nodachi, Scimitar, Kunai, Kanabo, Bo, Tonfa, Yari, Shuriken variants. No rig — static display meshes. |
| `hand.fbx` | HandsPack | Realistic | **Rigged** | Full armature: Hand, Finger1–5 × 2 bones each. 6 skin tones + 7 glove/suit variants. FPS viewmodel-ready. |
| `alien.fbx` | HandsPack | Sci-fi | **Rigged** (Armature.002) | Alien hand variant for HandsPack. 3 texture variants. |
| `glove.fbx` | HandsPack | Realistic | **Rigged** | Gloved hand, 3 texture variants. |
| `werewolf.fbx` | HandsPack | Horror | **Rigged** | Werewolf claw hand, 3 texture variants. |
| `Traps.glb` | Loose | Medieval | Static | 21 meshes, 1 MB. Floor/wall trap set (spike traps, pressure plates, cylinders). Not held — dungeon prop. |

**Integration note:** `hand.fbx` is the primary FPS viewmodel base. Weapons (static meshes) attach to the hand rig's grip bone. `WeaponsJapanese.glb` contains 35 individual weapon meshes that need splitting or indexed access. PSX-Knives must be converted to GLB for Three.js; FBX-only is a blocker.

---

## Pack Summaries

### 1. Axe.zip

**Contents:** 1 FBX, 0 GLB, 0 OBJ · 2 PNG textures · No license file

The simplest pack: a single low-poly medieval hatchet (`Axe.fbx`) with a clean diffuse texture and a pre-baked bloody variant. The FBX must be converted to GLB for Three.js; the asset is static (no rig, no animations). Style is broadly medieval/fantasy — not PSX-stylized, so it reads as slightly more realistic than the PSX packs but still stylized enough to fit the game's warm medieval tone.

**Category:** Weapon — melee, one-handed  
**Priority:** P0 — first equipped weapon candidate, conversion trivial  
**Blockers:** FBX → GLB conversion required; no license file (confirm purchase provenance)

---

### 2. HandsPack.zip

**Contents:** 4 FBX (hand, glove, alien, werewolf) · 0 GLB · 22 PNG textures across 6 skin tones + 7 suit variants · No license file

A fully rigged first-person hand pack. `hand.fbx` carries a complete finger armature (Hand root, Finger1–5 × 2 joints each) making it the primary FPS viewmodel base for all held weapons. Texture variants cover 6 human skin tones, 7 suit/glove variants, plus alien and werewolf specialty skins. The `.blend` source file is included. All four FBX files need GLB export for Three.js consumption.

**Category:** NPC / FPS rig — viewmodel hands  
**Priority:** P0 — no weapon can be displayed without a hand model in first-person  
**Blockers:** FBX → GLB conversion; rig must be re-exported with correct bind pose; alien/werewolf hands are fantasy-only (mismatch with pastoral medieval default)

---

### 3. PSX-Knives.zip

**Contents:** 5 FBX · 0 GLB · 14 PNG textures (4 colorway variants × 5 knives) · No license file

Five distinct knife/blade meshes in PSX retro style, each available in Wooden, Wooden\_bloody, Black, and Black\_bloody texture sets — 20 texture combinations total. The shapes range from a small stiletto (Knife\_1) to a wide bowie/hunting blade (Knife\_5). All meshes are static with no skeletal rig; they are intended as held or dropped prop assets. The PSX style (flat-shaded, low-res diffuse) aligns directly with the game's existing 3DPSX chibi characters.

**Category:** Weapon — melee, one-handed blades  
**Priority:** P0 — five distinct knife types with bloody variants, zero work to populate loot tables  
**Blockers:** FBX → GLB conversion; no license file (verify itch.io purchase)

---

### 4. PSX Horror-Fantasy Megapack.zip

**Contents:** 23 GLB · 23 FBX · 26 PNG textures · No license file  
**Monsters (20 unique):** Abomination (×2 variants), Alien Invader, Anomaly Monster, Big Abomination, Bigfoot, Black Butcher, Bloodwraith, Clowns (×3), Devil Demon, Elk Demon, Eyehead, Green Cyclope, Green Goliath, Horror Dolls (×2), Killer Pig, Mr.Z, Muscular Abomination, Plague Doctor, Werewolf

All 23 GLBs include a skeletal rig (1 skin per creature) and 2 animations: a T-pose and a key-shape pose (animation baking reference). The GLBs are labeled `*godot.glb` — they are standard glTF 2.0 and load fine in Three.js despite the name. Each creature has one 512–1024 px baked texture atlas. Style is unambiguously PSX-era retro horror — jagged silhouettes, low-poly forms, muted baked diffuse. Several (Bigfoot, Plague Doctor, Elk Demon, Werewolf) map to King's Road lore; others (Alien Invader, Anomaly Monster, Clowns, Horror Dolls) are tonally mismatched with the pastoral medieval setting.

**Category:** Monster / enemy NPC  
**Priority:** P1 — lore-matched monsters (Plague Doctor, Werewolf, Elk Demon, Bloodwraith, Devil Demon) are immediate value; horror-modern types (Alien, Clowns, Dolls) are P3  
**Blockers:** Only T-pose + key-shape animations included — full locomotion/attack animations must be sourced or authored; horror-modern creatures require tone filter before integration; no license file

---

### 5. Fantasy Mega Pack.zip

**Contents:** 16 GLB · 15 FBX · ~107 PNG textures · 6 `Licence.txt` files (Games by McSteeg, commercial use permitted, no redistribution)

The largest pack by both size (178 MB) and variety. Sub-packs:

- **Bat** — 1 GLB, rigged, 7 animations (attack, death, dodge, hit, idle, walk, wing). Ready to drop in.
- **Books and Scrolls** — 1 GLB static, multi-object (books, scrolls, shelf). Dungeon/tavern prop.
- **Bottles** — 1 GLB static, potion/bottle set with health + poison label textures. Inventory/loot prop.
- **Knight** — 1 GLB rigged, 19 animations (Attack 1–3, block, death, dodge, idle, run, walk, etc.). Full armored knight with separate Sword.glb. Strong P1 candidate for elite enemy or companion.
- **PSX Dungeon Boxes and Barrels Pack** — 2 GLB static (crates, barrels). Dungeon props.
- **PSX Dungeon Loot Pack** — 1 GLB static (coins, treasure chest, gems). Loot drop visuals.
- **PSX Dungeon Mine Prop Pack** — 1 GLB static (pickaxes, carts, tracks). Mine dungeon dressing.
- **PSX MEGA Nature Pack** — 1 GLB+GLTF static (trees, bushes, flowers, grass, weeds). 18 nature textures. Chunk/world dressing.
- **PSX Dungeon Skeleton Warrior** — 3 GLBs (full skeleton rigged 17 anims, loose bones static, all-in-one). Direct dungeon encounter asset.
- **Village Buildings** — 1 GLB static, 15 meshes (houses, roofs, doors, windows). Town chunk asset.
- **Villager NPCs** — 1 GLB rigged, 14 animations (idle, walk, sit, emote wave/yes/no, talk). 4 male + 4 female texture variants. Duplicates the standalone Villager NPCs pack.
- **Weapons (Japanese)** — 1 GLB static, 35 meshes: katana, wakazashi, tanto, tachi, odachi, nodachi, scimitar, kunai, kanabo, tonfa, yari, shuriken variants.

**Category:** Multi — weapon, NPC, building, prop, creature  
**Priority:** P1 for Bat, Knight, Skeleton Warrior, Nature Pack, Village Buildings, Villager NPCs, Weapons; P2 for dungeon props; P3 for anything duplicated elsewhere  
**Blockers:** License permits commercial use but prohibits redistribution — do not expose raw assets publicly; Japanese weapons are tonally anachronistic (katana in medieval England) — use selectively; Villager NPCs are identical to the standalone pack (de-duplicate)

---

### 6. Villager NPCs.zip

**Contents:** 1 GLB · 1 FBX · 8 PNG textures (4 female, 4 male) · No license file

A single GLB (`Villager_NPCs_glb.glb`, ~3.9 MB) containing 8 low-poly NPC meshes (4 male, 4 female medieval peasant variants) sharing 2 skeletal rigs and 14 animations: Idle\_1, Idle\_2, Idle\_Old, Walk\_1, Walk\_2\_f, Walk\_Old, Idle\_to\_sit, Sitting, Talk\_1, Talk\_Old, Emote\_Wave, Emote\_No (head-only additive), Emote\_Yes (head-only additive), TPose. Style is non-PSX stylized low-poly — slightly more modern than 3DPSX chibi but close enough in polygon density to coexist. The Blender source file is included. This pack is fully duplicated inside Fantasy Mega Pack.

**Category:** NPC — townsperson, ambient  
**Priority:** P1 — complete animation set, male/female variants, GLB-ready (no conversion needed)  
**Blockers:** Duplicate of Fantasy Mega Pack's Villager NPCs subfolder — only integrate once; no license file (verify provenance separately from the Fantasy Mega Pack licence); additive animation clips need Three.js `AnimationMixer` additive layer setup

---

## Loose GLBs (Cleaver.glb, Machete.glb, Traps.glb)

Three standalone GLBs sitting ungrouped in `pending-integration/`. All are valid glTF 2.0 binary (Khronos exporter, version 2). All are static (no skins, no animations).

- **Cleaver.glb** (25 KB, 1 mesh) — kitchen cleaver, realistic style. FPS viewmodel weapon candidate. P0.
- **Machete.glb** (46 KB, 1 mesh) — long blade, realistic style. FPS viewmodel weapon candidate. P0.
- **Traps.glb** (1 MB, 21 meshes) — dungeon floor/wall trap set: spike plates, pressure mechanisms, cylindrical triggers. Static dungeon prop. P1.

No license files or provenance info. Verify source before shipping.
