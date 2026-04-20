---
title: State
updated: 2026-04-20
status: current
domain: context
---

# State

Current development state as of 2026-04-20. Tracking progress toward v1.0.0 release via macro/meso/micro roadmap.

**Current release**: kings-road-v1.5.21

## Recent Merged PRs

**Infra & Quality:**
- Frontmatter audit script added; fixed missing frontmatter on 8 docs (#224)
- `validate-content` now has `--strict` flag for soft warnings (#223)
- Autosave throttled scheduler for per-frame mutations (#225)

**Bug Fixes:**
- Pause menu setState-on-unmount cleaned up (#220)
- Combat attack decoupled from interact key (#222)
- Dialogue "Farewell" choice gated behind typewriter completion (#221)
- Save flush forced on tab hide/unload (#205)
- Memory leaks: wall materials, ocean shader, combat VFX, road geometry (#203, #202, #199, #200)

**Content & Docs:**
- Path-to-1.0 PRD published with 15 macros + meso/micro tier (#218)
- Bug-hunt audit entries 23–32 logged (#216)

## What Is Done

### Engine & ECS
- Koota ECS (pmndrs): all game state in traits; Zustand removed
- SQLite + Drizzle ORM: content compiled at build, saves persisted via Capacitor
- React Three Fiber + rapier: instanced meshes, PBR textures, kinematic controller, postprocessing (SMAA/bloom/vignette)

### World & Generation
- Road spine: 6 anchors spanning 30km, Ashford at 0km, Grailsend at 28km
- Pacing engine: deterministic feature placement
- Dungeons: procedural room system complete; authored dungeon content (5+ unique themed dungeons) in progress
- Kingdom gen: one-time at New Game from seed
- Chunk streaming: 120-unit chunks within view distance

### Assets
- 99 GLBs (Fantasy Mega Pack, PSX Horror-Fantasy)
- 7 Polyhaven PBR texture sets (diffuse/normal/roughness, 1k)
- All NPCs + monsters driven by authored GLBs (no procgen appearance)

### Game Systems
- PlayerController, ChunkManager, Environment (day/night, sun/moon, lantern, weather)
- InteractionSystem, QuestSystem, EncounterSystem, DungeonEntrySystem
- AudioSystem (Tone.js ambient), WeatherSystem

### UI & HUD
- Diegetic HUD: vignette, breath fog, heartbeat, belt pips (no chrome)
- MainMenu (Continue card), DialogueBox (illuminated bubbles)
- PauseMenu, SettingsPanel, QuestLog, Inventory, Death/Loading/Error Overlays

### Testing & CI/CD
- 946+ unit/component tests (Vitest + browser mode)
- Playwright E2E
- 80% coverage thresholds
- GitHub Pages deployment + release artifacts (web, Android APK, iOS)

## What Is Next (Path to 1.0)

### Immediate P0 Blockers (Macros M1–M7, M12–M15)
1. **M1 — Native persistence harden**: Tie save flush to Capacitor `pause` event on native; web stays `visibilitychange`
2. **M2 — Perf budget + regression harness**: Benchmark on Pixel 6a / iPhone; set p95 frame-time targets; CI gate
3. **M3 — Content volume**: ≥ 40 unique NPC blueprints, ≥ 15 macros, ≥ 40 mesos, ≥ 100 micros; schema-valid, zero orphans
4. **M4 — Combat feel**: Weapon reach/arcs, hit-pause (60–80ms), screen shake, monster stagger + i-frames; death rate target 15–25%
5. **M5 — Onboarding**: Intro cinematic → Ashford grounding → first pilgrim encounter; diegetic tutorial (rune highlights, compass pip glows)
6. **M6 — Mobile UX**: Dual-stick tuning, haptics on hit/pickup/quest/menu, touch targets ≥ 44pt, safe-area insets
7. **M7 — Audio identity**: Biome-specific ambient, combat music swell, dialogue ducking (−12dB), Grail-theme cue at anchors
8. **M12 — Narrative completion**: Grailsend ending (canonical / branching / open-ended); credits screen; post-ending save
9. **M13 — Real-device beta**: ≥ 3 playthroughs to Grailsend by external testers; P0/P1 bugs triaged to zero
10. **M14 — Store-ready assets**: Icon (1024×1024 + adaptive), splash, store screenshots, OG tags, app description, privacy policy, credits
11. **M15 — Release automation**: `release.yml` builds web/Android/iOS; signing via secrets; SBOM + attestation; RC tag convention

### Next Meso Clusters
- **Gameplay loop** (G1–G7): PlayerController tuning, stamina/health systems, encounter variety, loot tables, XP+levelling, pickup feedback
- **World + content** (W1–W4): Anchor settlements (inn/smith/chapel/3+ houses), road pacing events, biome transitions, 5+ dungeons
- **UX/HUD** (U1–U7): Final menu layouts (New/Continue/Load/Settings/Credits/Quit), Settings panel, Loading overlay timing, Death+respawn, Quest log, Dialogue polish

### Known Risks (Top 3)
| Risk | Mitigation |
|------|-----------|
| Content volume underestimated | Use LLM-pass variant + curator review; track word count weekly |
| Combat feel requires iteration loops | Budget 2× estimate; ship playable-rough then polish |
| Real-device perf blows budget | Fallback quality tier + dynamic LOD |

## Active Plans

- [Path to 1.0](./plans/2026-04-20-path-to-1.0.prq.md) — Full macro/meso/micro roadmap to 1.0.0 (15 macros, 40+ mesos, 30+ micros)
- [Visual Fixtures](./plans/2026-04-19-visual-fixtures.prq.md) — Shader + environment visual baseline
- [Procedural Village](./plans/2026-04-19-procedural-village.prq.md) — Procedural town layout algorithm
- [v1.0 Beta Release](./plans/2026-04-18-v1.0-beta-release.prq.md) — Prior beta mechanics PRD (still valid for Phase 0–3)
- [Diegetic HUD](./plans/2026-04-18-diegetic-hud.md) — HUD philosophy (in-world, no chrome)
- [Koota Migration](./plans/2026-04-18-koota-migration.md) — ECS architecture
- [Procgen to Authored](./plans/2026-04-18-procgen-to-authored.md) — Asset pipeline migration
- [Standards & Capacitor](./plans/2026-04-17-standards-and-capacitor.prq.md) — Vite + Capacitor stack hardening

## Acceptance Gate for 1.0

**Functional**: New Game → Ashford → Grailsend → ending → credits → 15h content, 3+ external playthroughs  
**Performance**: Pixel 6a p95 < 33ms, Desktop p95 < 16.6ms, bundle < 2MB (gzipped)  
**Quality**: Zero P0/P1 bugs, WCAG 2.2 AA accessibility, asset attribution complete  
**Release**: RC tag, 7-day dogfood, Privacy Policy, Store listing, Changelog reviewed
