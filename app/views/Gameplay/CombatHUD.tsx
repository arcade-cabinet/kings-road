/**
 * CombatHUD — Phase 1 of diegetic HUD redesign.
 *
 * All visual overlays (HP bars, damage popups, attack prompt, loot summary)
 * have been removed per docs/plans/2026-04-18-diegetic-hud.md Phase 1.
 *
 * Replacement diegetic affordances (wound decals, weapon recoil, lock-on
 * reticle) will be implemented via app/systems/CombatFeedback.tsx in Phase 2.
 *
 * This file is kept as a named export so Game.tsx can continue to import it
 * without a refactor in this phase.
 */

export function CombatHUD() {
  return null;
}
