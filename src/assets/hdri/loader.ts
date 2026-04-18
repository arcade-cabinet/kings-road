import * as THREE from 'three';
import { RGBELoader } from 'three-stdlib';
import { AssetError } from '@/core';
import { assetUrl } from '@/lib/assets';

// Cache stores the in-flight Promise so concurrent callers share one load.
// Resolved: subsequent callers get the settled Promise (cheap).
// Rejected: the .catch evicts the entry so a later retry fires a new load.
const cache = new Map<string, Promise<THREE.Texture>>();

const rgbeLoader = new RGBELoader();

/**
 * Load an HDRI by id. Returns an equirectangular Texture with
 * EquirectangularReflectionMapping set, ready for drei's <Environment map={...}>.
 * Throws AssetError if the file cannot be loaded.
 * Concurrent calls with the same id share one in-flight load — the cache stores
 * the Promise, not the resolved Texture. A failed load evicts the cache entry so
 * the next call retries.
 */
export function loadHdri(id: string): Promise<THREE.Texture> {
  const cached = cache.get(id);
  if (cached) return cached;

  const url = assetUrl(`/assets/hdri/${id}/${id}.hdr`);

  const p = new Promise<THREE.Texture>((resolve, reject) => {
    rgbeLoader.load(url, resolve, undefined, () => {
      reject(new AssetError(`HDRI "${id}" failed to load from ${url}`));
    });
  }).then((texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
  });

  p.catch(() => cache.delete(id));
  cache.set(id, p);
  return p;
}
