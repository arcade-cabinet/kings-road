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
 * A small amount of per-pixel noise is added to break up flat weight zones.
 * Note: the noise is generated from a per-chunk sequential RNG, so splat maps
 * do NOT guarantee continuity at chunk edges — splat seams are acceptable
 * because the underlying PBR surface normals and heightmap seams are exact.
 */
export function buildSplatMap(
  biomeConfig: BiomeConfig,
  seed: string,
  options: SplatMapOptions = {},
): THREE.DataTexture {
  const { resolution = 256, chunkCx = 0, chunkCz = 0 } = options;

  const materials = biomeConfig.terrain.materials.slice(0, 4);
  const matCount = materials.length;

  if (matCount === 0) {
    throw new Error(
      'biomeConfig.terrain.materials must contain at least one material',
    );
  }

  // Resolve base weights from config
  const baseWeights = materials.map((id) => {
    const w = biomeConfig.terrain.splatWeights?.[id] ?? 1 / matCount;
    return Math.max(0, w);
  });

  // Pad to 4 channels
  while (baseWeights.length < 4) baseWeights.push(0);

  const pixelCount = resolution * resolution;
  const data = new Uint8Array(pixelCount * 4);

  const rng = createRng(`${seed}:splat:${chunkCx}:${chunkCz}`);

  for (let i = 0; i < pixelCount; i++) {
    const n0 = rng() * 0.08 - 0.04;
    const n1 = rng() * 0.08 - 0.04;
    const n2 = rng() * 0.08 - 0.04;
    const n3 = rng() * 0.08 - 0.04;

    const r0 = Math.max(0, baseWeights[0] + n0);
    const r1 = Math.max(0, baseWeights[1] + n1);
    const r2 = Math.max(0, baseWeights[2] + n2);
    const r3 = Math.max(0, baseWeights[3] + n3);

    const sum = r0 + r1 + r2 + r3;
    const inv = sum > 0 ? 1 / sum : 0;

    data[i * 4 + 0] = Math.round(r0 * inv * 255);
    data[i * 4 + 1] = Math.round(r1 * inv * 255);
    data[i * 4 + 2] = Math.round(r2 * inv * 255);
    data[i * 4 + 3] = Math.round(r3 * inv * 255);
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
