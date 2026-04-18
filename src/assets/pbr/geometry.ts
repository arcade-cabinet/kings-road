import type * as THREE from 'three';

/**
 * Verifies a geometry has the `uv` attribute that PBR materials need.
 *
 * three.js r150+ reads `aoMap` from the texture's `channel` property (default
 * 0, which resolves to the `uv` attribute). The older `uv2` convention is no
 * longer used for `aoMap` unless a texture explicitly sets `channel = 2`.
 *
 * Since all PBR materials in this project use the default channel=0, the
 * only thing `aoMap` needs is that the geometry has `uv` at all. This helper
 * asserts that invariant at material-apply time and warns if it's missing
 * (a GLB without UVs can't be textured regardless of channel).
 */
export function prepareGeometryForPbr(geometry: THREE.BufferGeometry): void {
  if (!geometry.attributes.uv) {
    console.warn(
      'prepareGeometryForPbr: geometry has no `uv` attribute; PBR textures will not render',
    );
  }
}
