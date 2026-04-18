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

/**
 * Load a PBR material by tactile ID. Returns a configured MeshStandardMaterial
 * with Color + NormalGL + Roughness maps bound (required), and Displacement +
 * AmbientOcclusion + Metalness bound when present on disk (optional per pack).
 * Metalness presence sets `material.metalness = 1.0`; non-metals omit the map
 * and retain the default `metalness = 0.0`. Displacement is bound with
 * `displacementScale = 0.0` — consumers opt in to parallax by assigning a
 * non-zero scale at the use site. Throws AssetError if the id is not in the
 * palette. Caches by id — repeat calls return the same instance.
 */
export async function loadPbrMaterial(
  id: string,
): Promise<THREE.MeshStandardMaterial> {
  const cached = cache.get(id);
  if (cached) return cached;

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
  return mat;
}
