import { cyrb128, mulberry32 } from '@/core';
import type { HeightmapData } from './heightmap';

export interface ProceduralHeightmapParams {
  /** Width and height of the generated grid in pixels. Power of 2 recommended. */
  resolution?: number;
  /** Peak-to-peak height scale (normalised, so keep ≤ 1). Default 0.6. */
  amplitude?: number;
  /** Base frequency of the first octave. Default 2.0. */
  frequency?: number;
  /** Number of noise octaves summed. Default 5. */
  octaves?: number;
  /** Amplitude decay per octave (0–1). Default 0.5. */
  persistence?: number;
  /** Frequency growth per octave. Default 2.0. */
  lacunarity?: number;
}

/**
 * Build a procedural heightmap using sum-of-octaves value noise, seeded
 * deterministically from (biome id + chunkCx + chunkCz). Returns a
 * HeightmapData with values normalised to [0, 1], compatible with
 * buildDisplacedGeometry and sampleHeightmap.
 *
 * Seam note: chunk-local noise seeds mean adjacent chunks sample different
 * noise functions — geometry seams are exact (via buildDisplacedGeometry
 * exact-boundary UV strategy) but the noise field itself has a discontinuity
 * at chunk edges. This is acceptable for Phase 0; a global noise field
 * (world-coordinate hash) would give seamless procedural terrain.
 */
export function buildProceduralHeightmap(
  seed: string,
  chunkCx: number,
  chunkCz: number,
  params: ProceduralHeightmapParams = {},
): HeightmapData {
  const {
    resolution = 128,
    amplitude = 0.6,
    frequency = 2.0,
    octaves = 5,
    persistence = 0.5,
    lacunarity = 2.0,
  } = params;

  if (resolution <= 0 || !Number.isFinite(resolution)) {
    throw new Error('resolution must be a positive finite number');
  }
  if (octaves <= 0 || !Number.isInteger(octaves)) {
    throw new Error('octaves must be a positive integer');
  }

  const data = new Float32Array(resolution * resolution);

  // Build per-octave permutation tables from the seed.
  const octaveRngs = Array.from({ length: octaves }, (_, o) => {
    const s = cyrb128(`${seed}:proc:${chunkCx}:${chunkCz}:oct${o}`);
    return mulberry32(s);
  });

  // Permutation table for each octave (256-entry shuffle).
  const perms = octaveRngs.map((rng) => {
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return p;
  });

  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let row = 0; row < resolution; row++) {
    const ny = row / (resolution - 1);
    for (let col = 0; col < resolution; col++) {
      const nx = col / (resolution - 1);

      let value = 0;
      let amp = amplitude;
      let freq = frequency;

      for (let o = 0; o < octaves; o++) {
        value += valueNoise2D(perms[o], nx * freq, ny * freq) * amp;
        amp *= persistence;
        freq *= lacunarity;
      }

      data[row * resolution + col] = value;
      if (value < minVal) minVal = value;
      if (value > maxVal) maxVal = value;
    }
  }

  // Normalise to [0, 1]; clamp to guard against floating-point epsilon.
  const range = maxVal - minVal;
  if (range > 0) {
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - minVal) / range;
      data[i] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
  } else {
    data.fill(0.5);
  }

  return { data, width: resolution, height: resolution };
}

/** Bilinear value noise — smooth interpolation between hashed lattice corners. */
function valueNoise2D(perm: number[], x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);

  const aa = latticeVal(perm, xi, yi);
  const ba = latticeVal(perm, xi + 1, yi);
  const ab = latticeVal(perm, xi, yi + 1);
  const bb = latticeVal(perm, xi + 1, yi + 1);

  return lerp(lerp(aa, ba, u), lerp(ab, bb, u), v);
}

function latticeVal(perm: number[], xi: number, yi: number): number {
  return perm[(perm[xi & 255] + yi) & 255] / 255;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}
