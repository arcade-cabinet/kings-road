/**
 * Dungeon vignette intensity logic — pure functions so they can be unit-tested
 * without an R3F context.
 *
 * Design values:
 *  - DUNGEON_DARKNESS_BOOST: additive darkness contribution when inDungeon=true.
 *    0.35 gives a noticeable "enclosed, below-ground" atmosphere without
 *    crushing readability. The health vignette (DiegeticLayer WoundVignette)
 *    is a separate CSS layer and always renders on top.
 *  - DUNGEON_OFFSET_REDUCTION: tightens the vignette ring (lower offset = closer
 *    to centre). 0.06 shift from 0.35 → 0.29 pulls the dark edge inward,
 *    reinforcing the claustrophobic tunnel feel.
 *  - TRANSITION_SPEED: exponential lerp constant k = 2.5 produces a ~0.4s
 *    transition (reaches 63% in 1/2.5 = 0.4s). Fast enough to feel intentional,
 *    slow enough to avoid a jarring pop.
 */

export const DUNGEON_DARKNESS_BOOST = 0.35;
export const DUNGEON_OFFSET_REDUCTION = 0.06;
export const TRANSITION_SPEED = 2.5;

/** Mutable state struct for dungeon vignette contributions. */
export interface DungeonVignetteState {
  darkness: number;
  offset: number;
}

/**
 * Lerp the dungeon vignette contribution in-place (no allocation).
 *
 * Mutates `out` directly so callers can keep the same object across frames
 * without creating GC pressure. Typically backed by a React ref.
 *
 * @param out       Mutable state — modified in place
 * @param inDungeon Whether the player is currently inside a dungeon
 * @param delta     Frame delta time in seconds
 */
export function lerpDungeonVignette(
  out: DungeonVignetteState,
  inDungeon: boolean,
  delta: number,
): void {
  const targetDarkness = inDungeon ? DUNGEON_DARKNESS_BOOST : 0;
  const targetOffset = inDungeon ? DUNGEON_OFFSET_REDUCTION : 0;
  const k = 1 - Math.exp(-TRANSITION_SPEED * delta);
  out.darkness += (targetDarkness - out.darkness) * k;
  out.offset += (targetOffset - out.offset) * k;
}

/**
 * Combine biome vignette darkness with dungeon contribution in-place (no allocation).
 * Additive-clamped: dungeon always adds atmosphere on top of biome base.
 * Offset is reduced (clamped to minimum 0.15 so the ring never covers
 * the full screen).
 *
 * @param out            Mutable result — modified in place
 * @param biomeDarkness  Current biome lerped darkness
 * @param biomeOffset    Current biome lerped offset
 * @param dungeonDarkness Dungeon contribution darkness (from lerpDungeonVignette)
 * @param dungeonOffset   Dungeon contribution offset reduction (from lerpDungeonVignette)
 */
export function combineDungeonVignette(
  out: DungeonVignetteState,
  biomeDarkness: number,
  biomeOffset: number,
  dungeonDarkness: number,
  dungeonOffset: number,
): void {
  out.darkness = Math.min(1, biomeDarkness + dungeonDarkness);
  out.offset = Math.max(0.15, biomeOffset - dungeonOffset);
}
