import * as THREE from 'three';
import { AssetError } from '@/core';
import { assetUrl } from '@/lib/assets';
import { PBR_PALETTE } from './palette';

const cache = new Map<string, THREE.MeshStandardMaterial>();

const textureLoader = new THREE.TextureLoader();

function loadTexture(
  url: string,
  encoding?: THREE.ColorSpace,
): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    textureLoader.load(
      url,
      (tex) => {
        if (encoding) tex.colorSpace = encoding;
        resolve(tex);
      },
      undefined,
      reject,
    );
  });
}

function pbrUrl(id: string, packPrefix: string, suffix: string): string {
  return assetUrl(`/assets/pbr/${id}/${packPrefix}${suffix}`);
}

export interface LoadPbrMaterialOptions {
  /**
   * Enable parallax displacement at this specific use site. Default `0`.
   * When non-zero, the loader returns a cheap `material.clone()` with the
   * caller's scale applied — the shared cache stays pristine so other
   * consumers with scale=0 are unaffected.
   * Clones share textures by reference; only the material shell is allocated.
   */
  displacementScale?: number;
}

/**
 * Load a PBR material by tactile ID. Returns a configured MeshStandardMaterial
 * with Color + NormalGL + Roughness maps bound (required), and Displacement +
 * AmbientOcclusion + Metalness bound when present on disk (optional per pack).
 *
 * Metalness presence sets `material.metalness = 1.0`; non-metals omit the map
 * and retain the default `metalness = 0.0`.
 *
 * **The returned material is shared-immutable.** Callers must NOT mutate it —
 * textures, uniforms, and render state are owned by the cache. To opt into
 * parallax displacement for a specific use site, pass `{ displacementScale: n }`
 * and the loader returns a clone with that scale applied (cheap — textures
 * share by reference).
 *
 * Throws AssetError if the id is not in the palette. Caches by id — repeat
 * calls with no options return the same shared instance.
 */
export async function loadPbrMaterial(
  id: string,
  options: LoadPbrMaterialOptions = {},
): Promise<THREE.MeshStandardMaterial> {
  const cached = cache.get(id);
  if (cached) {
    return applyOptions(cached, options);
  }

  const entry = PBR_PALETTE[id];
  if (!entry) {
    throw new AssetError(`PBR material "${id}" not found in palette`);
  }

  const { packPrefix } = entry;

  const [colorMap, normalMap, roughnessMap] = await Promise.all([
    loadTexture(pbrUrl(id, packPrefix, '_Color.jpg'), THREE.SRGBColorSpace),
    loadTexture(pbrUrl(id, packPrefix, '_NormalGL.jpg')),
    loadTexture(pbrUrl(id, packPrefix, '_Roughness.jpg')),
  ]);

  for (const map of [colorMap, normalMap, roughnessMap]) {
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
  }

  const mat = new THREE.MeshStandardMaterial({
    map: colorMap,
    normalMap,
    roughnessMap,
  });

  const optionalLoads: Promise<void>[] = [];

  optionalLoads.push(
    loadTexture(pbrUrl(id, packPrefix, '_Displacement.jpg'))
      .then((tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        mat.displacementMap = tex;
        mat.displacementScale = 0.0;
      })
      .catch(() => {
        /* displacement is optional */
      }),
  );

  optionalLoads.push(
    loadTexture(pbrUrl(id, packPrefix, '_AmbientOcclusion.jpg'))
      .then((tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        mat.aoMap = tex;
      })
      .catch(() => {
        /* AO is optional */
      }),
  );

  optionalLoads.push(
    loadTexture(pbrUrl(id, packPrefix, '_Metalness.jpg'))
      .then((tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        mat.metalnessMap = tex;
        mat.metalness = 1.0;
      })
      .catch(() => {
        /* Metalness is optional — non-metals won't have this map */
      }),
  );

  await Promise.all(optionalLoads);

  mat.needsUpdate = true;
  cache.set(id, mat);
  return applyOptions(mat, options);
}

function applyOptions(
  base: THREE.MeshStandardMaterial,
  options: LoadPbrMaterialOptions,
): THREE.MeshStandardMaterial {
  const scale = options.displacementScale ?? 0;
  if (scale === 0) return base;
  // Clone the material shell; textures and uniforms share by reference.
  // Only the caller's clone gets the non-zero displacement scale.
  const clone = base.clone();
  clone.displacementScale = scale;
  return clone;
}
