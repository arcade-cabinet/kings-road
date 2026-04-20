/**
 * getSaveSlotKind — derives which icon category a save slot belongs to.
 *
 * Three states:
 *   'dungeon'   — player was inside a dungeon when the game was saved
 *   'town'      — player's road-distance (position.z) is within TOWN_RADIUS
 *                 of a settlement anchor (VILLAGE_FRIENDLY, VILLAGE_HOSTILE,
 *                 or WAYPOINT type).  Threshold: 150 world-units.  Town
 *                 boundaries in the engine are roughly 60–100 m across; 150
 *                 gives a comfortable margin that still distinguishes a
 *                 traveller standing at the town gates from one out on the
 *                 open road.
 *   'overworld' — everything else (open road, wilderness, camp)
 *
 * The helper is pure so it can be unit-tested without a DB or a React tree.
 */

export type SlotKind = 'overworld' | 'dungeon' | 'town';

/** Minimal shape that getSaveSlotKind needs — avoids importing the full SaveData. */
export interface SlotKindInput {
  player: { position: { x: number; y: number; z: number } };
  dungeon?: unknown;
}

/**
 * Road distances (in world-units along the Z axis) of settlement anchors.
 * Sourced from content/world/road-spine.json — update here if the spine changes.
 * Types included: VILLAGE_FRIENDLY, VILLAGE_HOSTILE, WAYPOINT.
 */
const TOWN_ANCHOR_DISTANCES: readonly number[] = [
  0, // Ashford         (VILLAGE_FRIENDLY)
  6000, // Millbrook       (VILLAGE_FRIENDLY)
  17000, // Ravensgate      (VILLAGE_HOSTILE)
  21000, // Pilgrim's Rest  (WAYPOINT — monastery with chapel and garden)
] as const;

/**
 * A player must be within this many world-units of a town anchor along the
 * road axis (Z) to be considered "in town".
 */
export const TOWN_RADIUS = 150;

/**
 * Classify a save slot as 'dungeon', 'town', or 'overworld'.
 *
 * @param save  Full SaveData object (from loadFromSlot or from listSaveSlots).
 */
export function getSaveSlotKind(save: SlotKindInput): SlotKind {
  // Dungeon takes highest priority — even if somehow near a town anchor.
  if (save.dungeon !== undefined) return 'dungeon';

  // Town proximity: compare Z (road distance) against each anchor.
  const z = save.player.position.z;
  for (const anchorZ of TOWN_ANCHOR_DISTANCES) {
    if (Math.abs(z - anchorZ) <= TOWN_RADIUS) return 'town';
  }

  return 'overworld';
}
