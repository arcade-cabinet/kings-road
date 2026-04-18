import type * as THREE from 'three';

/**
 * Ensures a geometry has a uv2 attribute so aoMap renders correctly.
 * three.js aoMap reads from uv2; most GLBs only ship a single UV set (uv).
 *
 * - If uv2 already exists: no-op.
 * - If uv exists: clone it into uv2.
 * - If neither exists: warn and skip.
 */
export function prepareGeometryForPbr(geometry: THREE.BufferGeometry): void {
  if (geometry.attributes.uv2) return;

  const uv = geometry.attributes.uv;
  if (!uv) {
    console.warn(
      'prepareGeometryForPbr: geometry has no UV channel; aoMap will not render',
    );
    return;
  }

  geometry.setAttribute('uv2', uv.clone());
}
