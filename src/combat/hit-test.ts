/**
 * Melee hit detection.
 *
 * Given the player's world position and camera-forward direction, pick the
 * monster (if any) that a sword swing would actually strike. This replaces
 * the pre-fix behaviour where `doPlayerAttack()` unconditionally damaged
 * the first alive monster every PLAYER_ATTACK_INTERVAL regardless of aim
 * (bug #19 in docs/bugs/2026-04-20-audit-log.md).
 *
 * The predicate is a forward cone: within `range` metres (extended by the
 * target's body radius so a large creature registers at its near edge, not
 * its center) AND within `coneHalfAngleRad` of the camera's forward vector.
 * Pure, no Three.js, no R3F — the caller supplies plain vectors.
 *
 * Note: a monster the player is standing inside (XZ distance < 1e-6) is
 * treated as an unambiguous hit rather than rejected, since the cone test
 * would otherwise divide by zero.
 */

export interface HitTarget {
  id: string;
  /** World position `[x, y, z]` matching SpawnedMonster.position. */
  position: readonly [number, number, number];
  /** Body radius in metres for the hit sphere. */
  radius: number;
}

export interface MeleeHitOptions {
  /** Max strike distance from player body (metres). Default 2.5. */
  range?: number;
  /**
   * Half-angle of the forward cone in radians. Default π/4 (45°, total 90°).
   * Wider is more forgiving; too wide defeats the point of aiming.
   */
  coneHalfAngleRad?: number;
}

const DEFAULT_RANGE = 2.5;
const DEFAULT_CONE_HALF = Math.PI / 4;

/**
 * Return the ID of the monster the player's swing would hit, or null.
 *
 * Selection rule when multiple monsters qualify: closest first, breaking
 * ties by smallest angular deviation from forward so the monster squarely
 * in front of the camera wins over one clipping the cone edge.
 *
 * @param playerPos  player world position (where the swing originates)
 * @param forward    camera forward direction (normalized; not required to be
 *                   unit length but callers should pass a unit vector)
 * @param targets    candidate monsters (typically `activeEncounter.monsters`)
 */
export function pickMeleeTarget(
  playerPos: { x: number; y: number; z: number },
  forward: { x: number; y: number; z: number },
  targets: readonly HitTarget[],
  opts: MeleeHitOptions = {},
): string | null {
  const range = opts.range ?? DEFAULT_RANGE;
  const coneHalf = opts.coneHalfAngleRad ?? DEFAULT_CONE_HALF;
  const cosThreshold = Math.cos(coneHalf);

  // Flatten to XZ plane — vertical aim shouldn't change who you hit. Keeps
  // the swing feeling right when the player looks down at a short monster
  // or up at a tall one.
  const fx = forward.x;
  const fz = forward.z;
  const fLen = Math.hypot(fx, fz);
  if (fLen < 1e-6) return null;
  const fxN = fx / fLen;
  const fzN = fz / fLen;

  let best: { id: string; dist: number; cos: number } | null = null;

  for (const t of targets) {
    const dx = t.position[0] - playerPos.x;
    const dz = t.position[2] - playerPos.z;
    const dist = Math.hypot(dx, dz);
    // effectiveRange extends by the target's radius — a wraith with radius
    // 1m whose center sits 3m away should still be a hit because its near
    // edge is only 2m from the player (< default 2.5m range).
    const effectiveRange = range + t.radius;
    if (dist > effectiveRange) continue;
    if (dist < 1e-6) {
      // Player is inside the monster — treat as an unambiguous hit.
      return t.id;
    }
    const cos = (dx * fxN + dz * fzN) / dist;
    if (cos < cosThreshold) continue;

    if (
      best === null ||
      dist < best.dist ||
      (dist === best.dist && cos > best.cos)
    ) {
      best = { id: t.id, dist, cos };
    }
  }

  return best?.id ?? null;
}
