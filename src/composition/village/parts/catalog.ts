/**
 * Authored village GLB parts catalog.
 *
 * Each entry describes a single GLB from public/assets/buildings/village/.
 * Footprints are estimated from asset name conventions and authored
 * proportions at 1 Blender unit = 1 world-space metre.
 *
 * Role guide:
 *   wall        — complete structural body (may include baked door/window
 *                 sub-meshes, e.g. building-1 through building-4 + tower)
 *   roof        — cap piece placed above a wall
 *   door        — standalone door insert for wall shells without baked
 *                 openings (pair with building-shape-*)
 *   window      — standalone window insert for wall shells
 *   chimney     — stack placed on a roof
 *   foundation  — (no GLBs yet; reserved slot for Phase B)
 *   trim        — (no GLBs yet; reserved slot for Phase B)
 *   decoration  — standalone decorative structure (gazeebo)
 *
 * attachTo = which roles this piece snaps onto in Phase B composition.
 */
import type { VillagePart, VillagePartRole } from './schema';

export const VILLAGE_PARTS: Record<string, VillagePart> = {
  // ── Complete wall bodies (integrated window + door sub-meshes) ────────────
  'building-1': {
    id: 'building-1',
    glbPath: '/assets/buildings/village/building-1.glb',
    role: 'wall',
    footprint: { width: 4, depth: 4 },
    attachTo: ['foundation'],
  },
  'building-2': {
    id: 'building-2',
    glbPath: '/assets/buildings/village/building-2.glb',
    role: 'wall',
    footprint: { width: 4, depth: 4 },
    attachTo: ['foundation'],
  },
  'building-3': {
    id: 'building-3',
    glbPath: '/assets/buildings/village/building-3.glb',
    role: 'wall',
    footprint: { width: 4, depth: 4 },
    attachTo: ['foundation'],
  },
  'building-4': {
    id: 'building-4',
    glbPath: '/assets/buildings/village/building-4.glb',
    role: 'wall',
    footprint: { width: 4, depth: 5 },
    attachTo: ['foundation'],
  },

  // ── Plain wall shells (no baked openings — pair with inserts) ─────────────
  'building-shape-1': {
    id: 'building-shape-1',
    glbPath: '/assets/buildings/village/building-shape-1.glb',
    role: 'wall',
    footprint: { width: 3, depth: 3 },
    attachTo: ['foundation'],
  },
  'building-shape-2': {
    id: 'building-shape-2',
    glbPath: '/assets/buildings/village/building-shape-2.glb',
    role: 'wall',
    footprint: { width: 4, depth: 3 },
    attachTo: ['foundation'],
  },
  'building-shape-3-2-story': {
    id: 'building-shape-3-2-story',
    glbPath: '/assets/buildings/village/building-shape-3-2-story.glb',
    role: 'wall',
    footprint: { width: 4, depth: 4 },
    attachTo: ['foundation'],
  },

  // ── Tall landmark tower ───────────────────────────────────────────────────
  tower: {
    id: 'tower',
    glbPath: '/assets/buildings/village/tower.glb',
    role: 'wall',
    footprint: { width: 2, depth: 2 },
    attachTo: ['foundation'],
  },

  // ── Roof pieces ───────────────────────────────────────────────────────────
  'roof-3': {
    id: 'roof-3',
    glbPath: '/assets/buildings/village/roof-3.glb',
    role: 'roof',
    footprint: { width: 3, depth: 3 },
    attachTo: ['wall'],
  },
  'roof-long': {
    id: 'roof-long',
    glbPath: '/assets/buildings/village/roof-long.glb',
    role: 'roof',
    footprint: { width: 6, depth: 3 },
    attachTo: ['wall'],
  },
  'roof-square': {
    id: 'roof-square',
    glbPath: '/assets/buildings/village/roof-square.glb',
    role: 'roof',
    footprint: { width: 4, depth: 4 },
    attachTo: ['wall'],
  },

  // ── Standalone inserts ────────────────────────────────────────────────────
  'door-1': {
    id: 'door-1',
    glbPath: '/assets/buildings/village/door-1.glb',
    role: 'door',
    footprint: { width: 1, depth: 0.2 },
    attachTo: ['wall'],
  },
  'window-full': {
    id: 'window-full',
    glbPath: '/assets/buildings/village/window-full.glb',
    role: 'window',
    footprint: { width: 1, depth: 0.2 },
    attachTo: ['wall'],
  },
  chimny: {
    id: 'chimny',
    glbPath: '/assets/buildings/village/chimny.glb',
    role: 'chimney',
    footprint: { width: 0.6, depth: 0.6 },
    attachTo: ['roof'],
  },

  // ── Decorative ────────────────────────────────────────────────────────────
  gazeebo: {
    id: 'gazeebo',
    glbPath: '/assets/buildings/village/gazeebo.glb',
    role: 'decoration',
    footprint: { width: 3, depth: 3 },
    attachTo: ['foundation', 'wall'],
  },
};

export const VILLAGE_PARTS_ARRAY: VillagePart[] = Object.values(VILLAGE_PARTS);

/**
 * Return all catalog entries matching a given role. Empty array (never
 * throws) for roles with no authored assets — lets Phase B handle
 * foundation/trim gracefully before those GLBs are ingested.
 */
export function getPartsByRole(role: VillagePartRole): VillagePart[] {
  return VILLAGE_PARTS_ARRAY.filter((p) => p.role === role);
}
