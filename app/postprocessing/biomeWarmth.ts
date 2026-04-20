/**
 * Color-temperature lerp helpers — pure functions, zero allocations,
 * unit-testable without an R3F / Three.js context.
 *
 * Design:
 *   warmth  ∈ [-1, 1]  (positive = warmer, negative = cooler)
 *   saturation ∈ [-0.5, 0.5]  (drives HueSaturationEffect.saturation)
 *
 * The hue shift applied to HueSaturationEffect is a small rotation in
 * radians so that warm biomes push toward red/orange (positive angle)
 * and cool biomes push toward blue (negative angle). Values are small
 * (≤ ±0.08 rad) to stay subtle — this is an accent, not a colour grade.
 *
 * Transition speed: exponential lerp with k=3.0 gives ~0.33s half-life,
 * matching the ~1s settle-time called for in the task spec while
 * remaining fast enough to feel intentional rather than sluggish.
 */

export const WARMTH_TRANSITION_SPEED = 3.0;

/**
 * Maximum hue rotation in radians for a warmth of ±1.
 * 0.08 rad ≈ 4.6°. Tuned so the shift is perceptible but not garish.
 */
export const WARMTH_HUE_SCALE = 0.08;

/** Mutable state struct for biome color-temperature tracking. */
export interface WarmthState {
  warmth: number;
  saturation: number;
}

/**
 * Exponential-lerp the warmth state toward a target, in-place.
 *
 * No allocations — mutates `out` directly. Backed by a React ref in the
 * calling component so there is no GC pressure per frame.
 *
 * @param out    Mutable state — modified in place
 * @param targetWarmth  Target warmth value from getBiomeWarmth()
 * @param targetSaturation  Target saturation from getBiomeWarmth()
 * @param delta  Frame delta-time in seconds
 * @param speed  Exponential lerp speed (default WARMTH_TRANSITION_SPEED)
 */
export function lerpWarmth(
  out: WarmthState,
  targetWarmth: number,
  targetSaturation: number,
  delta: number,
  speed = WARMTH_TRANSITION_SPEED,
): void {
  const k = 1 - Math.exp(-speed * delta);
  out.warmth += (targetWarmth - out.warmth) * k;
  out.saturation += (targetSaturation - out.saturation) * k;
}

/**
 * Convert a warmth value to a hue rotation in radians for
 * HueSaturationEffect. Positive warmth → positive rotation (red/orange);
 * negative warmth → negative rotation (blue).
 *
 * @param warmth Signed warmth value in [-1, 1]
 * @returns Hue rotation in radians
 */
export function warmthToHue(warmth: number): number {
  return warmth * WARMTH_HUE_SCALE;
}
