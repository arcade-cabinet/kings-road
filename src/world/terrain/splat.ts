import * as THREE from 'three';
import type { BiomeConfig } from '@/biome';
import { createRng } from '@/core';

export interface SplatMapOptions {
  /** Resolution of the splat texture (square). Should be a power of 2. */
  resolution?: number;
  /** Chunk grid X index, used with seed for per-chunk variation. */
  chunkCx?: number;
  /** Chunk grid Z index, used with seed for per-chunk variation. */
  chunkCz?: number;
}

/**
 * Build a 4-channel RGBA splat map texture from biome material weights.
 *
 * Each channel (R, G, B, A) carries the blend weight for one of up to 4
 * materials listed in biome.terrain.materials. The shader reads these weights
 * and lerps between PBR materials accordingly.
 *
 * splatWeights in biome config are base weights (0–1) per material ID.
 * Missing entries default to equal distribution. Weights are normalised so
 * they always sum to 1 per pixel.
 *
 * A small amount of noise is added per-pixel so the seams between flat weight
 * zones show natural variation. The noise is seeded from (seed + chunkCx + chunkCz)
 * so adjacent chunks match at their shared edges (same seed row).
 */
export function buildSplatMap(
  biomeConfig: BiomeConfig,
  seed: string,
  options: SplatMapOptions = {},
): THREE.DataTexture {
  const { resolution = 256, chunkCx = 0, chunkCz = 0 } = options;

  const materials = biomeConfig.terrain.materials.slice(0, 4);
  const matCount = materials.length;

  // Resolve base weights from config
  const baseWeights = materials.map((id) => {
    const w = biomeConfig.terrain.splatWeights?.[id] ?? 1 / matCount;
    return Math.max(0, w);
  });

  // Pad to 4 channels
  while (baseWeights.length < 4) baseWeights.push(0);

  const pixelCount = resolution * resolution;
  const data = new Uint8Array(pixelCount * 4);

  // Per-chunk RNG for noise variation
  const rng = createRng(`${seed}:splat:${chunkCx}:${chunkCz}`);

  for (let i = 0; i < pixelCount; i++) {
    // Add slight per-pixel noise to break up flat zones
    const noise = [
      rng() * 0.08 - 0.04,
      rng() * 0.08 - 0.04,
      rng() * 0.08 - 0.04,
      rng() * 0.08 - 0.04,
    ];

    const raw = [
      Math.max(0, baseWeights[0] + noise[0]),
      Math.max(0, baseWeights[1] + noise[1]),
      Math.max(0, baseWeights[2] + noise[2]),
      Math.max(0, baseWeights[3] + noise[3]),
    ];

    const sum = raw[0] + raw[1] + raw[2] + raw[3];
    const inv = sum > 0 ? 1 / sum : 0;

    data[i * 4 + 0] = Math.round(raw[0] * inv * 255);
    data[i * 4 + 1] = Math.round(raw[1] * inv * 255);
    data[i * 4 + 2] = Math.round(raw[2] * inv * 255);
    data[i * 4 + 3] = Math.round(raw[3] * inv * 255);
  }

  const tex = new THREE.DataTexture(
    data,
    resolution,
    resolution,
    THREE.RGBAFormat,
  );
  tex.needsUpdate = true;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}
