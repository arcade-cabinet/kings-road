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

function pbrUrl(dir: string, filename: string): string {
  return assetUrl(`/assets/pbr/${dir}/${filename}`);
}

/**
 * Load a PBR material by tactile ID. Returns a configured MeshStandardMaterial
 * with Color + Normal + Roughness maps bound, and Displacement + AO when present.
 * Throws AssetError if the id is not in the palette.
 * Caches by id — repeat calls return the same instance.
 */
export async function loadPbrMaterial(
  id: string,
): Promise<THREE.MeshStandardMaterial> {
  const cached = cache.get(id);
  if (cached) return cached;

  const dir = PBR_PALETTE[id];
  if (!dir) {
    throw new AssetError(`PBR material "${id}" not found in palette`);
  }

  let colorMap: THREE.Texture;
  let normalMap: THREE.Texture;
  let roughnessMap: THREE.Texture;

  try {
    [colorMap, normalMap, roughnessMap] = await Promise.all([
      loadTexture(pbrUrl(dir, 'color.jpg'), THREE.SRGBColorSpace),
      loadTexture(pbrUrl(dir, 'normal.jpg')),
      loadTexture(pbrUrl(dir, 'roughness.jpg')),
    ]);
  } catch (error) {
    throw new AssetError(
      `PBR material "${id}" failed to load required textures: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  for (const map of [colorMap, normalMap, roughnessMap]) {
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
  }

  const mat = new THREE.MeshStandardMaterial({
    map: colorMap,
    normalMap,
    roughnessMap,
  });

  // Optional maps — load and attach if they exist
  const optionalLoads: Promise<void>[] = [];

  optionalLoads.push(
    loadTexture(pbrUrl(dir, 'displacement.jpg'))
      .then((tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        mat.displacementMap = tex;
        mat.displacementScale = 0.05;
      })
      .catch(() => {
        /* displacement is optional */
      }),
  );

  optionalLoads.push(
    loadTexture(pbrUrl(dir, 'ao.jpg'))
      .then((tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        mat.aoMap = tex;
        mat.aoMapIntensity = 1.0;
      })
      .catch(() => {
        /* AO is optional */
      }),
  );

  await Promise.all(optionalLoads);

  mat.needsUpdate = true;
  cache.set(id, mat);
  return mat;
}
