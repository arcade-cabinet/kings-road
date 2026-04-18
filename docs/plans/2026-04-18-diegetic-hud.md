---
title: Diegetic HUD redesign
updated: 2026-04-18
status: current
domain: product
---

# Diegetic HUD Redesign

**Branch:** `feat/code-review-followups` (design only); execution on a separate branch after this lands.
**Scope:** Replace the overlay-style HUD (health bars, minimap, quest log panel, button clusters) with in-world diegetic affordances appropriate for a mobile-first pastoral RPG.

## Why

Kings Road is a **mobile-first** game: touch-first input, phone-sized screen, pastoral/holy-grail mood. The current HUD borrows desktop-game conventions:

- Parchment-styled overlay corners with health/stamina bars (GameHUD.tsx)
- Rectangular minimap (Minimap.tsx)
- Quest log panel
- "Press E to interact" prompts
- D-pad cluster for mobile controls

These overlays are acceptable on a 27" monitor in a well-lit room. On a 6" phone in a warm, romanticized medieval world, they:
- Occlude a disproportionate share of the viewport
- Break mood — generic game UI vs. honey-limestone pilgrimage
- Fight the touch input (UI buttons + world taps compete for screen real estate)
- Resist localization (fixed-width English labels)
- Leak implementation details (numeric HP, distance-to-quest numbers)

The fix: render state *in the world* wherever possible, and treat necessary overlays as vellum/illumination, not as GUI.

## Design Principles

1. **Mood before legibility.** If a player has to squint at a sigil to read their health, that's fine — games teach their glyphs. Never fall back on "just add a number bar."
2. **In-world first.** Any state that has a physical correlate (damage → wound, stamina → breath, equipped weapon → hand, quest direction → landmark) renders in the 3D scene, not over it.
3. **Overlays must be vellum.** If an overlay is truly needed (dialogue, inventory, pause), style as illuminated manuscript / parchment with ink calligraphy. No pixel-perfect rectangles, no solid-fill backgrounds.
4. **Touch is the default.** No "press E" text. No button icons unless the button is the diegetic affordance (a scroll, a lantern, a quill).
5. **The character's body is the UI.** Hands, belt, backpack visible → inventory. Chest/shoulders visible → armor. Breath cloud → stamina. Heartbeat audio + screen reddening → critical HP.

## Per-Surface Redesign

### Health / Vitals (currently `GameHUD.tsx` HP/stamina bars)

**Before:** Two colored bars in the corner with numeric values behind them.

**After (diegetic):**
- **Damage taken** → screen-space blood vignette (red-orange gradient sweeping in from edges), pulse opacity with heartbeat SFX when below 30%.
- **Low HP warning** → heartbeat audio layer (already in AudioSystem), desaturated world tint.
- **Critical HP** → breathing sound, slight screen-shake on each heartbeat.
- **Stamina** → breath cloud emitted from camera when sprinting (fades as stamina drains); audible heavy breathing when empty.
- **No numbers ever shown.** If the player wants precise values, they open the character sheet (diegetic pause).

**Implementation:** new `app/scene/VitalEffects.tsx` as R3F layer inside the Canvas; reads `player.health/stamina` traits from Koota; no DOM overlay.

### Equipped Weapon (currently: no gear exists)

**Before:** Nothing — game has no gear yet.
**After:**
- FPS-view held weapon anchored to `HandsPack` hand rig at camera-bottom-center.
- Weapon swap → visible sheath/unsheath animation.
- Attack cooldown → subtle weapon dip/recoil, no progress bar.
- Ammo/durability (if added later) → visible wear on the model texture.

**Implementation:** new `app/scene/PlayerViewmodel.tsx`; uses rigged hand from `pending-integration/HandsPack.zip` + weapon from equipped trait.

### Interaction Prompts (currently: "Press E" / button tap)

**Before:** DOM text prompt, keyboard key indicator.

**After:**
- Interactable NPCs → a soft golden shimmer halo that intensifies as player approaches.
- Hovering indicator icons (quill for dialogue, coin for barter, scroll for quest giver) rendered as billboarded sprites above the NPC's head, subtle bob animation.
- Interactable props → outline shader on hover/proximity (rim lighting in honey-gold).
- Signposts → actually readable text in the 3D scene (painted on the wood plane), not DOM tooltips.

**Implementation:** extend existing `app/systems/InteractionSystem.tsx` to emit per-entity "highlight" trait; `app/scene/InteractableHighlight.tsx` renders the shimmer/outline/icon.

### Dialogue (currently `DialogueBox.tsx` bottom-of-screen panel)

**Before:** Parchment-styled bottom panel with name header, body text, choice buttons.

**After:**
- Speech bubble anchored to the speaker's head, rendered as a 3D billboarded quad with illuminated-manuscript texture.
- Text types on character-by-character with ink bleed effect.
- Choices → the speech bubble splits into fork, each path shown as a smaller parchment branch the player taps.
- Long dialogue → the bubble expands vertically; if it exceeds thumb-reach, camera dollies slightly so the bubble is centered.

**Implementation:** replace `app/ui/DialogueBox.tsx` with `app/scene/DialogueBubble.tsx` (in-Canvas). Keep the HTML version as dev-debug fallback gated on `import.meta.env.DEV`.

### Quest Navigation (currently `Minimap.tsx` + quest log panel)

**Before:** Circular minimap bottom-right + quest log slide-out.

**After:**
- **Direction sense** → tall glowing sigil floats over distant quest destinations (honey-gold, readable even on small screens). Visible through terrain at low opacity, opaque at line-of-sight.
- **Proximity** → ambient music subtly shifts toward the destination's leitmotif as player closes in.
- **Quest log** → replace with a **book-in-inventory** affordance: tap on the journal on the player's belt, book opens as a centered full-screen parchment viewport.
- **No minimap** at all. The road spine IS the map.

**Implementation:** `app/scene/QuestSigil.tsx` (billboarded 3D marker); `app/ui/JournalBook.tsx` replaces Minimap + QuestLog, triggered by belt-item tap.

### Inventory (currently `InventoryScreen.tsx` grid panel)

**Before:** Grid inventory panel overlay.

**After:**
- Equipped items visible on the character viewmodel (hands hold weapon, belt has pouches for consumables, back has quiver/satchel).
- Opening inventory = diegetic gesture: tap on the satchel → camera pulls back slightly, character sits/kneels, opens the pack, items laid out on a cloth in a worldspace 3D plane.
- Drag items between equipment slots (visible on body) and bag (cloth).

**Implementation:** `app/scene/InventorySpread.tsx`, triggered by tap on `satchel` entity on the player. Keeps the existing `inventoryStore` data model; just changes the render layer.

### Pause Menu (currently `PauseMenu.tsx` centered overlay)

**Before:** Darkened screen + centered button column.

**After:**
- Tapping the quill icon (top-left corner, part of in-world parchment frame if we keep any UI frame) slows game time to a near-freeze.
- A large illuminated-letter "P" fades in at screen center, with small parchment ribbons extending outward offering Resume / Save / Settings / Main Menu.
- Ambient audio gains a choir-reverb effect, like entering a chapel.

**Implementation:** `app/ui/PauseMenu.tsx` rewritten as parchment/vellum styled; no black overlay.

### Loading Screen (currently `LoadingOverlay.tsx` — already pastoral)

**Keep mostly as-is** — it's already styled as parchment with seed-phrase illumination. Minor tweak: move the progress phase text into a handwritten-quill animation rather than a solid progress bar.

### Main Menu (currently `MainMenu.tsx`)

**Keep as-is (already diegetic)** — illuminated-manuscript title, "Begin Pilgrimage" verb rather than "Play". Verify on mobile viewport.

### Combat HUD (currently `CombatHUD.tsx`)

**Before:** Enemy HP bar, player stamina bar, attack cooldown indicator.

**After:**
- Enemy HP → visible wounds on the enemy's model + stagger animations at HP thresholds. No bar.
- Player stamina → same breath-cloud system as non-combat.
- Attack cooldown → weapon recoils, can't be swung until settled. No timer ring.
- Lock-on target → golden reticle painted at the enemy's torso (only during active engagement).

**Implementation:** `app/scene/CombatFeedback.tsx` already exists (was moved into `app/systems/` in the restructure); extend it to emit wound decals instead of the `CombatHUD.tsx` overlay. Delete `CombatHUD.tsx` once the replacement is live.

### Death Overlay (currently `DeathOverlay.tsx`)

**Before:** Dark screen + "You died" + retry button.

**After:**
- Camera slumps to ground level, tilts.
- Illuminated "Here lies the pilgrim" text fades in on screen as parchment.
- Tap anywhere on screen → soft quill scratch sound → camera returns to main menu (no explicit button).

**Implementation:** tweak `app/ui/DeathOverlay.tsx` style; camera work in `app/systems/PlayerController.tsx`.

### Mobile Controls (currently `MobileControls.tsx`)

**Before:** D-pad + Jump + Interact buttons.

**After:**
- Invisible input zones (left half = movement joystick, right half = camera), zero visible UI.
- Interact = tap on the highlighted world object (no dedicated button needed since interactables have the shimmer halo).
- Jump = two-finger tap (documented in settings, not in-game).
- This matches the new README Touch section already.

**Implementation:** strip visual elements from `app/ui/MobileControls.tsx`; keep gesture handlers.

## Migration Path

Each surface can change independently. Suggested order by risk/value:

| Phase | Surfaces | Why |
|---|---|---|
| 1 | MobileControls, CombatHUD | Remove visual clutter first; replacements (implicit zones, wound decals) are straightforward |
| 2 | Interaction prompts, Quest navigation | Highest mood payoff; NPC shimmer + landmark sigils |
| 3 | Vitals (blood vignette, breath) | Requires shader work for vignette; biggest visual shift |
| 4 | Dialogue | In-Canvas billboarded bubble is a bigger render-layer change; keep HTML fallback for debug |
| 5 | Inventory, Pause | Full redesigns; lower priority than getting core loop right |

## Risks

- **Touch heat-map** — losing visible buttons means we must teach players the gesture vocabulary somewhere. Mitigation: a 30-second animated tutorial on first play, diegetic (an old pilgrim demonstrates).
- **Accessibility** — no HP numbers means low-vision players can't verify state. Mitigation: settings toggle `a11y.showNumericVitals` reveals old-style overlay.
- **R3F billboard performance** — speech bubbles and quest sigils in 3D add overdraw. Budget: max 3 active billboards visible at once.
- **Asset dependency** — the hand rig + weapons for viewmodel come from `pending-integration/HandsPack.zip` + various weapon packs. Integration must precede equipped-viewmodel work.

## Acceptance Criteria (for the eventual execution branch, not this plan)

- No numeric overlay visible during gameplay (numbers behind a11y toggle only).
- No visible mobile D-pad or interact button.
- "Press E" prompts deleted from all interaction text.
- `DialogueBox.tsx` overlay replaced by 3D billboard (HTML version only in DEV mode).
- `Minimap.tsx` deleted.
- Camera dolly + time-slow on pause, not a black overlay.

## Out of scope for this plan

- Full touch gesture tutorial implementation
- Accessibility number-toggle implementation
- Narrative framing of the character sheet / journal book
- Localization
