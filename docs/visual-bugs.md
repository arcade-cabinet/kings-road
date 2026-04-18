---
title: Visual Bug Log
updated: 2026-04-18
status: current
domain: quality
---

# Visual Bug Log

Findings from `pnpm dev` visual pass via Chrome DevTools MCP. Each entry names the surface, symptom, repro, and (if known) the file:line. Bugs are logged here and fixed in dedicated follow-up branches.

## Surfaces under test

| Surface | Test file | Last run | Status |
|---|---|---|---|
| MainMenu | `app/ui/__tests__/MainMenu.browser.test.tsx` | 2026-04-18 | clean (mobile) |
| LoadingOverlay | `app/ui/__tests__/LoadingOverlay.browser.test.tsx` | 2026-04-18 | not reached |
| GameHUD | `app/ui/__tests__/GameHUD.browser.test.tsx` | 2026-04-18 | **mobile-broken** |
| CombatHUD | `app/ui/__tests__/CombatHUD.browser.test.tsx` | 2026-04-18 | not observed |
| DialogueBox | `app/ui/__tests__/DialogueBox.browser.test.tsx` | 2026-04-18 | not observed |
| InventoryScreen | `app/ui/__tests__/InventoryScreen.browser.test.tsx` | 2026-04-18 | not observed |
| World chunk | — | 2026-04-18 | **placeholder-grade** |
| Dungeon interior | — | — | not observed |

## Findings

### MainMenu (mobile 390×844)

Clean. Renders as designed: pastoral warm-cream background, illuminated "King's Road" title in Lora, "THE KINGDOM OF ALBION" subtitle, seed phrase card with RESEED + ENTER REALM, features list. Single 404 on `/favicon.ico` — cosmetic, fix by adding one or silencing.

### GameHUD (mobile 390×844)

**Mobile viewport overwhelmed by overlay HUD.** 60%+ of the screen is covered by UI chrome at game start:

- Top: Health/Stamina bars (top-left) + time-of-day panel "08:00 AM Fair" (top-right) + region banner "THE OCEAN / WILDERNESS" (top-center) + minimap (right-center under time panel). These four layer into each other and the minimap overlaps the region banner.
- Bottom-right: giant circular ATTACK + INTERACT buttons (~88px each on 390-wide viewport).
- Bottom-left: giant circular JUMP button.
- Bottom-center: "WASD Move | Mouse Look | E Interact | ESC Pause" keyboard hints — **wrong for a mobile-first game**; user directive is to remove these.

Only the small central strip shows the world. Effectively unplayable.

**Fix direction:** per `docs/plans/2026-04-18-diegetic-hud.md`, all of these become diegetic:
- Delete the region banner, health/stamina bars, minimap overlay, and keyboard hint strip.
- ATTACK/JUMP/INTERACT buttons: strip visual, keep gesture zones only (invisible left-half joystick, tap highlighted objects to interact, two-finger jump).
- Region name: surface via a small illuminated-letter fade-in on region transitions, not a persistent banner.
- Time of day: implied by environmental lighting; only show if player explicitly checks an in-world sundial.

Files: `app/ui/GameHUD.tsx`, `app/ui/MobileControls.tsx`, `app/ui/Minimap.tsx`.

### GameHUD (desktop 1440×900)

Same issues less pronounced. Keyboard-hint strip "WASD Move | Mouse Look | E Interact | ESC Pause" is rendered even on desktop — per user directive, this belongs (at most) behind a DEV-only flag; remove from production view.

### World Chunk — "THE OCEAN / WILDERNESS" (starting spawn)

**Placeholder-grade visuals.** At game start:
- Ground: flat uniform pale-gray — labelled "WILDERNESS" but the region title says "THE OCEAN" (mismatch).
- Trees: plain cone meshes with low-poly dark-green tops and brown cylinders. No texture variation, no GLTF integration.
- Scattered cuboid rocks: plain brown boxes with no detail.
- No road visible — the "King's Road" spine is missing from the starting view.
- No NPCs visible.
- No water despite region being named "The Ocean."
- Sky: flat pale-blue gradient, no clouds, no sun disc.
- No weather particles.
- No post-processing effects visible (despite EffectComposer existing).

**Likely causes:**
- Asset packs from `pending-integration/` not yet integrated (per `docs/asset-inventory.md`, game has zero gear and most foliage is procedural).
- `OceanPlane.tsx` may not be rendering on the OCEAN region — region name/biome mismatch.
- Post-processing `Bloom + Vignette` toggles may be wired but thresholds too high to see effect.

### Console warnings

- `THREE.THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` — legacy r169+ API; upgrade required.
- `using deprecated parameters for the initialization function; pass a single object instead` — unidentified library; investigate source.
- `GET /favicon.ico 404` — add a favicon at `public/favicon.ico` (parchment-styled quill icon would match the mood).

### Not reached in this pass

- LoadingOverlay — loading completed before screenshot
- CombatHUD — no combat encounter triggered
- DialogueBox — no NPC in view to start dialogue
- InventoryScreen — no open gesture exercised
- Dungeon interior — no dungeon entered
- Quest log — no quest accepted

These are testable via the browser smoke tests but weren't reachable in a single play-through frame.

## Priority

P0 (blocks playability on mobile):
- GameHUD overlay occlusion — fix per diegetic HUD plan
- Remove desktop keyboard-hint strip from production view
- Region name vs. biome mismatch (THE OCEAN labelled WILDERNESS)

P1 (quality of life):
- Road spine not visible at spawn — players can't orient
- Tree/foliage asset integration (pending-integration is the source)
- THREE.Clock deprecation + unidentified init-param deprecation

P2:
- Favicon
- Sky/weather improvements
- Post-processing tuning (bloom/vignette not visible)

## Next pass ideas

- Exercise full game loop: spawn → walk north → approach Ashford NPC → open dialogue → accept quest → open journal → sheath/unsheath.
- Re-screenshot after each diegetic HUD phase lands.
- Attach CDP Lighthouse audit for mobile perf.
