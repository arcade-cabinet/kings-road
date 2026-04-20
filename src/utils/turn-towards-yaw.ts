/**
 * turn-towards-yaw.ts
 *
 * Pure helper for smoothly rotating a monster toward a target yaw angle.
 * Normalises the angular difference to [-π, π] so the monster always takes
 * the shortest path (handles wrap-around at ±π).
 *
 * Designed to be testable in isolation — no Three.js or ECS dependencies.
 */

const TWO_PI = Math.PI * 2;

/**
 * Normalise an angle to the range [-π, π].
 */
export function normaliseAngle(a: number): number {
  // Fast path: already in range
  if (a >= -Math.PI && a <= Math.PI) return a;
  // Bring into [0, 2π) first, then shift
  const mod = ((a % TWO_PI) + TWO_PI) % TWO_PI;
  return mod > Math.PI ? mod - TWO_PI : mod;
}

/**
 * Advance `currentYaw` toward `targetYaw` by at most `turnRate * delta`
 * radians, always taking the short way around.
 *
 * @param currentYaw  Monster's current yaw (radians, any range)
 * @param targetYaw   Desired facing yaw (radians, any range)
 * @param turnRate    Maximum rotation speed in radians per second
 * @param delta       Frame time in seconds
 * @returns           New yaw value (not necessarily normalised — callers may
 *                    keep the raw accumulated value for smooth continuity)
 */
export function turnTowardsYaw(
  currentYaw: number,
  targetYaw: number,
  turnRate: number,
  delta: number,
): number {
  const diff = normaliseAngle(targetYaw - currentYaw);
  const maxStep = turnRate * delta;

  if (Math.abs(diff) <= maxStep) {
    // Close enough — snap to target so we don't oscillate
    return targetYaw;
  }

  return currentYaw + Math.sign(diff) * maxStep;
}
