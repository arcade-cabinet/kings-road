/**
 * Biome-specific vegetation profiles and placement logic.
 *
 * Each biome has a VegetationProfile defining how many of each
 * vegetation type to place per chunk. The placeVegetation function
 * scatters instances using a seeded RNG.
 */
import { BLOCK_SIZE, CHUNK_SIZE } from './worldCoords';

// ── Vegetation mesh instance ────────────────────────────────────────────

export interface VegetationInstance {
  x: number;
  y: number;
  z: number;
  sx?: number;
  sy?: number;
  sz?: number;
  rotY?: number;
}

// ── Vegetation profile ──────────────────────────────────────────────────

export interface VegetationProfile {
  pines: number;
  oaks: number;
  bushes: number;
  grassTufts: number;
  boulders: number;
  deadTrees: number;
  heatherPatches: number;
}

// ── Per-biome profiles ──────────────────────────────────────────────────

export const BIOME_VEGETATION: Record<string, VegetationProfile> = {
  meadow: {
    pines: 3,
    oaks: 8,
    bushes: 12,
    grassTufts: 40,
    boulders: 5,
    deadTrees: 0,
    heatherPatches: 0,
  },
  farmland: {
    pines: 0,
    oaks: 4,
    bushes: 6,
    grassTufts: 20,
    boulders: 2,
    deadTrees: 0,
    heatherPatches: 0,
  },
  forest: {
    pines: 25,
    oaks: 20,
    bushes: 15,
    grassTufts: 10,
    boulders: 8,
    deadTrees: 2,
    heatherPatches: 0,
  },
  deep_forest: {
    pines: 40,
    oaks: 15,
    bushes: 20,
    grassTufts: 5,
    boulders: 10,
    deadTrees: 5,
    heatherPatches: 0,
  },
  hills: {
    pines: 5,
    oaks: 6,
    bushes: 10,
    grassTufts: 30,
    boulders: 20,
    deadTrees: 0,
    heatherPatches: 0,
  },
  highland: {
    pines: 2,
    oaks: 0,
    bushes: 5,
    grassTufts: 15,
    boulders: 30,
    deadTrees: 1,
    heatherPatches: 10,
  },
  mountain: {
    pines: 3,
    oaks: 0,
    bushes: 2,
    grassTufts: 5,
    boulders: 40,
    deadTrees: 0,
    heatherPatches: 3,
  },
  moor: {
    pines: 0,
    oaks: 0,
    bushes: 8,
    grassTufts: 20,
    boulders: 12,
    deadTrees: 3,
    heatherPatches: 25,
  },
  swamp: {
    pines: 0,
    oaks: 5,
    bushes: 15,
    grassTufts: 15,
    boulders: 3,
    deadTrees: 12,
    heatherPatches: 0,
  },
  riverside: {
    pines: 5,
    oaks: 10,
    bushes: 15,
    grassTufts: 25,
    boulders: 5,
    deadTrees: 0,
    heatherPatches: 0,
  },
  coast: {
    pines: 0,
    oaks: 2,
    bushes: 6,
    grassTufts: 10,
    boulders: 8,
    deadTrees: 1,
    heatherPatches: 0,
  },
};

export const DEFAULT_VEGETATION: VegetationProfile = {
  pines: 30,
  oaks: 10,
  bushes: 10,
  grassTufts: 10,
  boulders: 15,
  deadTrees: 2,
  heatherPatches: 0,
};

// ── Placement result ────────────────────────────────────────────────────

export interface PlacedVegetation {
  pineTrunk: VegetationInstance[];
  pineLeaves: VegetationInstance[];
  oakTrunk: VegetationInstance[];
  oakLeaves: VegetationInstance[];
  bush: VegetationInstance[];
  grassTuft: VegetationInstance[];
  deadTree: VegetationInstance[];
  heather: VegetationInstance[];
  boulder: VegetationInstance[];
}

// ── Placement function ──────────────────────────────────────────────────

/**
 * Sample terrain height at a world position.
 * When provided, all vegetation Y values are offset by terrain height.
 */
export type HeightSampler = (worldX: number, worldZ: number) => number;

/**
 * Scatter vegetation instances for a chunk based on its biome profile.
 *
 * @param biome - Kingdom biome string (or undefined for legacy fallback)
 * @param oX - Chunk world origin X
 * @param oZ - Chunk world origin Z
 * @param rng - Seeded RNG function returning [0, 1)
 * @param heightAt - Optional terrain height sampler; when provided, all Y values are offset to sit on terrain
 */
export function placeVegetation(
  biome: string | undefined,
  oX: number,
  oZ: number,
  rng: () => number,
  heightAt?: HeightSampler,
): PlacedVegetation {
  const profile = biome
    ? (BIOME_VEGETATION[biome] ?? DEFAULT_VEGETATION)
    : DEFAULT_VEGETATION;

  const result: PlacedVegetation = {
    pineTrunk: [],
    pineLeaves: [],
    oakTrunk: [],
    oakLeaves: [],
    bush: [],
    grassTuft: [],
    deadTree: [],
    heather: [],
    boulder: [],
  };

  // Helper: get ground height at a world position
  const groundAt = heightAt ?? (() => 0);

  // Pine trees — conical evergreens
  for (let i = 0; i < profile.pines; i++) {
    const px = oX + rng() * CHUNK_SIZE;
    const pz = oZ + rng() * CHUNK_SIZE;
    const s = 0.8 + rng() * 0.6;
    const h = groundAt(px, pz);
    result.pineTrunk.push({
      x: px,
      y: h + BLOCK_SIZE,
      z: pz,
      sx: s,
      sy: s,
      sz: s,
    });
    result.pineLeaves.push({
      x: px,
      y: h + BLOCK_SIZE * 2.5,
      z: pz,
      sx: s,
      sy: s,
      sz: s,
      rotY: rng() * Math.PI,
    });
  }

  // Oak / broadleaf trees — rounder canopy
  for (let i = 0; i < profile.oaks; i++) {
    const px = oX + rng() * CHUNK_SIZE;
    const pz = oZ + rng() * CHUNK_SIZE;
    const s = 0.7 + rng() * 0.8;
    const h = groundAt(px, pz);
    result.oakTrunk.push({
      x: px,
      y: h + BLOCK_SIZE * 0.8,
      z: pz,
      sx: s,
      sy: s,
      sz: s,
    });
    result.oakLeaves.push({
      x: px,
      y: h + BLOCK_SIZE * 2.2,
      z: pz,
      sx: s * 1.3,
      sy: s,
      sz: s * 1.3,
      rotY: rng() * Math.PI,
    });
  }

  // Bushes — low spherical foliage
  for (let i = 0; i < profile.bushes; i++) {
    const px = oX + rng() * CHUNK_SIZE;
    const pz = oZ + rng() * CHUNK_SIZE;
    const s = 0.4 + rng() * 0.6;
    const h = groundAt(px, pz);
    result.bush.push({
      x: px,
      y: h + BLOCK_SIZE * 0.3 * s,
      z: pz,
      sx: s,
      sy: s,
      sz: s,
    });
  }

  // Grass tufts — tall grass blades
  for (let i = 0; i < profile.grassTufts; i++) {
    const px = oX + rng() * CHUNK_SIZE;
    const pz = oZ + rng() * CHUNK_SIZE;
    const s = 0.3 + rng() * 0.4;
    const h = groundAt(px, pz);
    result.grassTuft.push({
      x: px,
      y: h + BLOCK_SIZE * 0.15 * s,
      z: pz,
      sx: s,
      sy: s * 1.5,
      sz: s,
      rotY: rng() * Math.PI,
    });
  }

  // Boulders — irregular rocks
  for (let i = 0; i < profile.boulders; i++) {
    const px = oX + rng() * CHUNK_SIZE;
    const pz = oZ + rng() * CHUNK_SIZE;
    const s = 0.5 + rng();
    const h = groundAt(px, pz);
    result.boulder.push({
      x: px,
      y: h + BLOCK_SIZE * 0.3 * s,
      z: pz,
      sx: s,
      sy: s,
      sz: s,
      rotY: rng() * Math.PI,
    });
  }

  // Dead trees — bare trunks for swamps and moors
  for (let i = 0; i < profile.deadTrees; i++) {
    const px = oX + rng() * CHUNK_SIZE;
    const pz = oZ + rng() * CHUNK_SIZE;
    const s = 0.6 + rng() * 0.5;
    const h = groundAt(px, pz);
    result.deadTree.push({
      x: px,
      y: h + BLOCK_SIZE * 1.2,
      z: pz,
      sx: s,
      sy: s,
      sz: s,
    });
  }

  // Heather patches — low purple moorland plants
  for (let i = 0; i < profile.heatherPatches; i++) {
    const px = oX + rng() * CHUNK_SIZE;
    const pz = oZ + rng() * CHUNK_SIZE;
    const s = 0.5 + rng() * 0.5;
    const h = groundAt(px, pz);
    result.heather.push({
      x: px,
      y: h + BLOCK_SIZE * 0.2 * s,
      z: pz,
      sx: s,
      sy: s * 0.5,
      sz: s,
      rotY: rng() * Math.PI,
    });
  }

  return result;
}
