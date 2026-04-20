/**
 * composeTownLayout — Phase B2
 *
 * Given a town config and a hydrated RNG, return an array of TownBuildingSlots
 * placed within the town radius using Poisson-disk rejection sampling. Each
 * slot's rotationY is computed so the building faces the town center.
 *
 * Pure function — no React, no Three.js, no side-effects.
 */
import type { VillageFootprint } from './parts/schema';
import type { TownBuildingSlot, VillageTownConfig } from './types';

const MAX_BUILDINGS = 20;
const CLEARANCE = 2;
const MAX_ATTEMPTS = 50;

function footprintForRole(role: string, rng: () => number): VillageFootprint {
  if (role === 'landmark') return { width: 5, depth: 5 };
  return rng() < 0.5 ? { width: 3, depth: 3 } : { width: 4, depth: 4 };
}

export function composeTownLayout(
  config: VillageTownConfig,
  rng: () => number,
): TownBuildingSlot[] {
  const roles = config.roles.slice(0, MAX_BUILDINGS);
  const slots: TownBuildingSlot[] = [];
  // Track each placed building's own spacing radius so the rejection test
  // respects BOTH footprints — otherwise a small building can be placed too
  // close to a previously-placed large building because minSpacing was
  // derived only from the current (small) candidate.
  const placed: Array<{ x: number; z: number; spacing: number }> = [];

  for (const role of roles) {
    const fp = footprintForRole(role, rng);
    const currSpacing = Math.max(fp.width, fp.depth) + CLEARANCE;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const angle = rng() * Math.PI * 2;
      const dist = Math.sqrt(rng()) * config.radius;
      const x = config.center.x + Math.cos(angle) * dist;
      const z = config.center.z + Math.sin(angle) * dist;

      const tooClose = placed.some((p) => {
        const dx = p.x - x;
        const dz = p.z - z;
        // Use max(current, prior) so we never place closer than the larger
        // of the two buildings' own spacing radii demands.
        return Math.sqrt(dx * dx + dz * dz) < Math.max(currSpacing, p.spacing);
      });
      if (tooClose) continue;

      placed.push({ x, z, spacing: currSpacing });
      const dx = config.center.x - x;
      const dz = config.center.z - z;
      const rotationY = Math.atan2(dx, dz);

      slots.push({
        footprint: fp,
        position: { x, y: 0, z },
        rotationY,
      });
      break;
    }
  }

  return slots;
}
