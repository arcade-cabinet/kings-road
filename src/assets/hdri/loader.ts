import * as THREE from 'three';
import { RGBELoader } from 'three-stdlib';
import { AssetError } from '@/core';
import { assetUrl } from '@/lib/assets';

const cache = new Map<string, THREE.Texture>();

const rgbeLoader = new RGBELoader();

/**
 * Load an HDRI by id. Returns an equirectangular Texture with
 * EquirectangularReflectionMapping set, ready for drei's <Environment map={...}>.
 * Throws AssetError if the file cannot be loaded.
 * Caches by id — repeat calls return the same instance.
 */
export async function loadHdri(id: string): Promise<THREE.Texture> {
  const cached = cache.get(id);
  if (cached) return cached;

  const url = assetUrl(`/assets/hdri/${id}/${id}.hdr`);

  const texture = await new Promise<THREE.Texture>((resolve, reject) => {
    rgbeLoader.load(url, resolve, undefined, () => {
      reject(new AssetError(`HDRI "${id}" failed to load from ${url}`));
    });
  });

  texture.mapping = THREE.EquirectangularReflectionMapping;
  cache.set(id, texture);
  return texture;
}
