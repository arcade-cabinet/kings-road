import * as THREE from 'three';
import type { HeightmapData } from './heightmap';
import { sampleHeightmap } from './heightmap';

export interface DisplacedGeometryOptions {
  /** World-space size of the chunk (X and Z). */
  chunkSize: number;
  /** Chunk grid X index (integer, may be negative). */
  chunkCx: number;
  /** Chunk grid Z index (integer, may be negative). */
  chunkCz: number;
  /** Total number of chunks along each axis (used for UV mapping). */
  totalChunks: number;
  /** Subdivisions per side. Higher = more detail. Recommended: 64–128. */
  segments?: number;
  /** Scale applied to normalised [0,1] height values to get world Y. */
  heightScale?: number;
}

/**
 * Build a displaced BufferGeometry for one terrain chunk.
 *
 * Seam rule: the UV range for this chunk extends 1 texel into each
 * neighbour so that shared edges sample identical height values regardless
 * of floating-point rounding order. The caller is responsible for ensuring
 * adjacent chunks use the same heightmap and heightScale.
 */
export function buildDisplacedGeometry(
  heightmap: HeightmapData,
  options: DisplacedGeometryOptions,
): THREE.BufferGeometry {
  const {
    chunkSize,
    chunkCx,
    chunkCz,
    totalChunks,
    segments = 64,
    heightScale = 20,
  } = options;

  const vertCount = (segments + 1) * (segments + 1);
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);

  // UV extent of one chunk in the global heightmap.
  // Shared edges use the exact boundary UV so adjacent chunks sample the same
  // heightmap value — no inset here. The 1-pixel-into-neighbour rule applies
  // only to interior samples that want to avoid texture seams from linear
  // filtering; the *boundary* of a chunk must land on the exact same UV as
  // the *boundary* of its neighbour.
  const chunkUvSize = 1 / totalChunks;

  const uMin = chunkCx * chunkUvSize;
  const uMax = (chunkCx + 1) * chunkUvSize;
  const vMin = chunkCz * chunkUvSize;
  const vMax = (chunkCz + 1) * chunkUvSize;

  let idx = 0;
  for (let row = 0; row <= segments; row++) {
    const t = row / segments;
    const v = vMin + t * (vMax - vMin);
    const worldZ = (t - 0.5) * chunkSize;

    for (let col = 0; col <= segments; col++) {
      const s = col / segments;
      const u = uMin + s * (uMax - uMin);
      const worldX = (s - 0.5) * chunkSize;

      const h = sampleHeightmap(heightmap, u, v);
      const worldY = h * heightScale;

      positions[idx * 3 + 0] = worldX;
      positions[idx * 3 + 1] = worldY;
      positions[idx * 3 + 2] = worldZ;

      uvs[idx * 2 + 0] = s;
      uvs[idx * 2 + 1] = 1 - t;

      idx++;
    }
  }

  // Triangle indices
  const indexCount = segments * segments * 6;
  const indices = new Uint32Array(indexCount);
  let ii = 0;
  for (let row = 0; row < segments; row++) {
    for (let col = 0; col < segments; col++) {
      const a = row * (segments + 1) + col;
      const b = a + 1;
      const c = a + (segments + 1);
      const d = c + 1;
      indices[ii++] = a;
      indices[ii++] = c;
      indices[ii++] = b;
      indices[ii++] = b;
      indices[ii++] = c;
      indices[ii++] = d;
    }
  }

  computeNormals(positions, indices, normals, segments);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  // uv2 mirrors uv so aoMap renders correctly without extra setup
  geo.setAttribute('uv2', new THREE.BufferAttribute(uvs.slice(), 2));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  return geo;
}

function computeNormals(
  positions: Float32Array,
  indices: Uint32Array,
  out: Float32Array,
  segments: number,
): void {
  const stride = segments + 1;

  // Compute per-triangle normals and accumulate onto vertices
  const tmp = new Float32Array(out.length);

  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;

    const ax = positions[ib] - positions[ia];
    const ay = positions[ib + 1] - positions[ia + 1];
    const az = positions[ib + 2] - positions[ia + 2];

    const bx = positions[ic] - positions[ia];
    const by = positions[ic + 1] - positions[ia + 1];
    const bz = positions[ic + 2] - positions[ia + 2];

    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;

    for (const vi of [ia, ib, ic]) {
      tmp[vi] += nx;
      tmp[vi + 1] += ny;
      tmp[vi + 2] += nz;
    }
  }

  // Normalise
  for (let i = 0; i < tmp.length; i += 3) {
    const len = Math.sqrt(tmp[i] ** 2 + tmp[i + 1] ** 2 + tmp[i + 2] ** 2);
    if (len > 0) {
      out[i] = tmp[i] / len;
      out[i + 1] = tmp[i + 1] / len;
      out[i + 2] = tmp[i + 2] / len;
    } else {
      out[i + 1] = 1; // flat normal fallback
    }
  }

  // Suppress unused-var warning — stride is computed for readability
  void stride;
}
