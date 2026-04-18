/**
 * Seeded 2D simplex noise implementation.
 *
 * Based on Stefan Gustavson's simplex noise algorithm.
 * Deterministic — same seed always produces same noise field.
 * No external dependencies.
 */

// Gradient vectors for 2D simplex noise
const GRAD2 = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Create a seeded simplex noise generator.
 * Returns a function `noise2D(x, y)` that returns values in [-1, 1].
 */
export function createSimplex2D(
  seed: number,
): (x: number, y: number) => number {
  // Build a permutation table from the seed
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);

  // Initialize identity permutation
  for (let i = 0; i < 256; i++) p[i] = i;

  // Fisher-Yates shuffle using a simple LCG seeded PRNG
  let s = seed >>> 0;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s;
  };

  for (let i = 255; i > 0; i--) {
    const j = next() % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }

  // Double the permutation table to avoid index wrapping
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  // Skewing factors for 2D simplex
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;

  return function noise2D(x: number, y: number): number {
    // Skew input space to determine which simplex cell we're in
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    // Unskew back to (x, y) space
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    // Determine which simplex triangle we're in
    let i1: number, j1: number;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0; // Lower triangle
    } else {
      i1 = 0;
      j1 = 1; // Upper triangle
    }

    // Offsets for middle and last corners
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    // Hashed gradient indices
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = perm[ii + perm[jj]] % 8;
    const gi1 = perm[ii + i1 + perm[jj + j1]] % 8;
    const gi2 = perm[ii + 1 + perm[jj + 1]] % 8;

    // Contribution from three corners
    let n0 = 0,
      n1 = 0,
      n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * (GRAD2[gi0][0] * x0 + GRAD2[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * (GRAD2[gi1][0] * x1 + GRAD2[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * (GRAD2[gi2][0] * x2 + GRAD2[gi2][1] * y2);
    }

    // Scale to [-1, 1]
    return 70 * (n0 + n1 + n2);
  };
}

/**
 * Fractional Brownian Motion — layered noise with decreasing amplitude.
 * Creates natural-looking terrain with both broad shapes and fine detail.
 *
 * @param noise - Base noise function
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param octaves - Number of noise layers (more = more detail, slower)
 * @param lacunarity - Frequency multiplier per octave (typically 2.0)
 * @param persistence - Amplitude multiplier per octave (typically 0.5)
 */
export function fbm(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number = 6,
  lacunarity: number = 2.0,
  persistence: number = 0.5,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise(x * frequency, y * frequency) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  // Normalize to [-1, 1]
  return value / maxAmplitude;
}

/**
 * Ridge noise — inverted absolute value of noise, creating sharp ridge lines.
 * Good for mountain ranges.
 */
export function ridgeNoise(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number = 4,
  lacunarity: number = 2.0,
  persistence: number = 0.5,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmplitude = 0;
  let prev = 1;

  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(noise(x * frequency, y * frequency));
    const weighted = n * n * prev;
    value += weighted * amplitude;
    maxAmplitude += amplitude;
    prev = n;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value / maxAmplitude;
}
