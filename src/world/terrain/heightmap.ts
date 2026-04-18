import type { DataTexture } from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { assetUrl } from '@/assets';
import { AssetError } from '@/core';

export interface HeightmapData {
  data: Float32Array;
  width: number;
  height: number;
}

const cache = new Map<string, HeightmapData>();
const exrLoader = new EXRLoader();

function loadEXR(url: string): Promise<DataTexture> {
  return new Promise((resolve, reject) => {
    exrLoader.load(url, resolve, undefined, reject);
  });
}

/**
 * Load a heightmap EXR by id. Returns normalised float data in [0, 1].
 * Caches by id — repeat calls return the same instance.
 */
export async function loadHeightmap(id: string): Promise<HeightmapData> {
  const cached = cache.get(id);
  if (cached) return cached;

  const url = assetUrl(`/assets/terrain/${id}.exr`);
  let tex: DataTexture;
  try {
    tex = await loadEXR(url);
  } catch {
    throw new AssetError(`Heightmap "${id}" not found at ${url}`);
  }

  const { width, height } = tex.image as { width: number; height: number };
  const rawData = tex.image.data as Float32Array;
  const channelCount = rawData.length / (width * height);

  // Extract first channel (R) and normalise to [0, 1]
  const data = new Float32Array(width * height);
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let i = 0; i < width * height; i++) {
    const v = (rawData as Float32Array)[i * channelCount];
    data[i] = v;
    if (v < minVal) minVal = v;
    if (v > maxVal) maxVal = v;
  }

  const range = maxVal - minVal;
  if (range > 0) {
    for (let i = 0; i < data.length; i++) {
      data[i] = (data[i] - minVal) / range;
    }
  }

  tex.dispose();

  const result: HeightmapData = {
    data,
    width: width as number,
    height: height as number,
  };
  cache.set(id, result);
  return result;
}

/** Sample the heightmap at normalised UV coordinates [0, 1]. Bilinear filter. */
export function sampleHeightmap(
  hm: HeightmapData,
  u: number,
  v: number,
): number {
  const x = Math.max(0, Math.min(u, 1)) * (hm.width - 1);
  const y = Math.max(0, Math.min(v, 1)) * (hm.height - 1);

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, hm.width - 1);
  const y1 = Math.min(y0 + 1, hm.height - 1);
  const tx = x - x0;
  const ty = y - y0;

  const h00 = hm.data[y0 * hm.width + x0];
  const h10 = hm.data[y0 * hm.width + x1];
  const h01 = hm.data[y1 * hm.width + x0];
  const h11 = hm.data[y1 * hm.width + x1];

  return (
    h00 * (1 - tx) * (1 - ty) +
    h10 * tx * (1 - ty) +
    h01 * (1 - tx) * ty +
    h11 * tx * ty
  );
}
