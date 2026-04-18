---
title: Visual Bug Log
updated: 2026-04-18
status: current
domain: quality
---

# Visual Bug Log

Findings from visual passes via Chrome DevTools MCP or local `pnpm dev`. Each entry names the surface, symptom, repro, and (if known) the file:line. Bugs are logged here and fixed in dedicated follow-up branches.

## Surfaces under test

| Surface | Test file | Last run | Status |
|---|---|---|---|
| MainMenu | `app/__tests__/MainMenu.browser.test.tsx` | 2026-04-18 | clean |
| LoadingOverlay | `app/__tests__/LoadingOverlay.browser.test.tsx` | 2026-04-18 | clean |
| DiegeticLayer (in-game HUD) | `app/views/Gameplay/DiegeticLayer.tsx` | 2026-04-18 | clean (post-v1.3.0) |
| DialogueBox | `app/__tests__/DialogueBox.browser.test.tsx` | 2026-04-18 | clean |
| InventoryScreen | `app/__tests__/InventoryScreen.browser.test.tsx` | 2026-04-18 | clean |
| QuestLog | `app/__tests__/QuestLog.browser.test.tsx` | 2026-04-18 | clean |
| World chunk | — | 2026-04-18 | authored assets + Polyhaven PBR shipping |
| Dungeon interior | — | — | not yet observed |

## Resolved (history)

The following findings from the pre-v1.3.0 log are now closed. Keep this section short; once an issue is verified fixed in production for a full release cycle, remove it.

- **GameHUD overlay occlusion on mobile** — fixed via DiegeticLayer in v1.3.0. Panel HUD replaced with wound vignette, breath fog, heartbeat, belt pips.
- **Keyboard hint strip visible on mobile** — removed in v1.3.0 HUD purge.
- **Region banner / minimap occlusion** — both deleted; region transitions now fade via illuminated letter glyph.
- **Placeholder tree/rock meshes on spawn** — replaced in v1.3.0 with authored GLBs from Fantasy Mega Pack + PSX Nature.
- **Canvas-drawn ground/wall textures** — replaced in v1.4.0 with Polyhaven CC0 PBR sets (plaster, stone_block, thatch, wood, road, grass, cobblestone).
- **No road spine at spawn** — road now renders via `RoadSurface.tsx` with cobblestone PBR.

## Open findings

(None currently logged. Add new entries below with `### <Surface>` and include reproduction notes.)

## Priority legend

- **P0** — blocks playability on primary target (mobile)
- **P1** — quality of life (orient, read, navigate)
- **P2** — polish (sky, particles, post-processing tuning)

## Next pass ideas

- Exercise full game loop on a fresh mobile viewport (iPhone 12/13 sized): spawn → walk north → approach Ashford NPC → open dialogue → accept quest → open journal → engage combat → loot → death → respawn.
- Capture screenshots at each state for regression comparison against v1.3.0/v1.4.0 baselines.
- Attach CDP Lighthouse audit for mobile perf + accessibility.
- Validate that authored PBR textures render correctly on low-end Android (4k devices may struggle with 1k albedos across many materials).
