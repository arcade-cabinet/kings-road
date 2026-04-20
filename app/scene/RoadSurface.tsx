/**
 * Road surface mesh that conforms to terrain heightmap.
 *
 * Renders a textured road strip for chunks with `hasRoad` on their kingdom tile.
 * The mesh samples getTerrainHeight() at each vertex to follow terrain contours.
 * Road width and color vary by road type (highway, secondary, path, trail).
 *
 * Neighbor tile connectivity determines which directions the road extends,
 * producing correct straight segments, turns, and intersections.
 */

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { loadPbrMaterial } from '@/assets';
import { reportRuntimeError } from '@app/runtime-error-bus';
import type {
  KingdomMap,
  MapTile,
  RoadType,
} from '@/schemas/kingdom.schema';
import { CHUNK_SIZE } from '@/utils/worldCoords';
import { getKingdomTile } from '@/world/kingdom-gen';

/** Subdivisions along each road strip axis */
const ROAD_SEGMENTS = 12;

/**
 * Small Y offset above terrain to prevent z-fighting. Thornfield's procedural
 * heightmap displaces at most `displacementScale × scale = 0.375m` above the
 * flat terrain plane at y=0, so the road can sit just above that ceiling and
 * still read as "on the ground". The previous implementation sampled
 * `getTerrainHeight()` which returns `elevation × 30m` (ballooning up to 15m
 * for a moderate-elevation tile) — that's a different height system from the
 * procedural displacement the terrain mesh actually uses, which is why roads
 * were floating way above the ground (and the player with them, since the
 * character controller lands on the nearest collider).
 */
const ROAD_Y = 0.4;

/** Road width in world units per road type */
const ROAD_WIDTHS: Record<RoadType, number> = {
  highway: 24,
  secondary: 14,
  path: 7,
  trail: 4,
};

/**
 * Map road type → PBR material id in the ingested palette. Keeps the road
 * visually consistent with the ground-PBR splat-blended terrain instead of
 * rendering as a flat matte color swatch.
 */
const ROAD_PBR: Record<RoadType, string> = {
  highway: 'wet-cobblestone', // warm honey cobblestone
  secondary: 'packed-mud', // earthy brown dirt
  path: 'packed-dirt', // trampled path
  trail: 'dead-grass', // subtle grass trail
};

/** UV tile scale for road materials — keeps texel density reasonable at road width. */
const ROAD_TILE_SCALE = 3;

interface RoadNeighbors {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

function getRoadNeighbors(
  kingdomMap: KingdomMap,
  gx: number,
  gy: number,
): RoadNeighbors {
  const check = (dx: number, dy: number): boolean => {
    const nx = gx + dx;
    const ny = gy + dy;
    const tile = getKingdomTile(kingdomMap, nx, ny);
    if (!tile) return false;
    if (tile.hasRoad) return true;
    // Also connect to settlement tiles (road endpoints)
    return kingdomMap.settlements.some(
      (s) => s.position[0] === nx && s.position[1] === ny,
    );
  };

  return {
    north: check(0, -1),
    south: check(0, 1),
    east: check(1, 0),
    west: check(-1, 0),
  };
}

interface RoadSurfaceProps {
  /** World-space origin X of the chunk */
  oX: number;
  /** World-space origin Z of the chunk */
  oZ: number;
  /** The kingdom map tile for this chunk */
  kingdomTile: MapTile;
  /** The full kingdom map for neighbor lookups and height sampling */
  kingdomMap: KingdomMap;
}

export function RoadSurface({
  oX,
  oZ,
  kingdomTile,
  kingdomMap,
}: RoadSurfaceProps) {
  const roadType = kingdomTile.roadType ?? 'highway';

  // Load PBR material async so the road shares the palette with the splat-blended
  // terrain underneath. While it's loading we render nothing (no flashing flat
  // colour). Cache is keyed by id so the same pack only downloads once for the
  // whole session.
  const [material, setMaterial] = useState<THREE.MeshStandardMaterial | null>(
    null,
  );
  useEffect(() => {
    let cancelled = false;
    const pbrId = ROAD_PBR[roadType];
    loadPbrMaterial(pbrId)
      .then((base) => {
        if (cancelled) return;
        // Clone so we can tweak tiling per road mesh without mutating the
        // cached shared material that other callers read.
        const mat = base.clone();
        if (mat.map) {
          mat.map = mat.map.clone();
          mat.map.wrapS = THREE.RepeatWrapping;
          mat.map.wrapT = THREE.RepeatWrapping;
          mat.map.repeat.set(ROAD_TILE_SCALE, ROAD_TILE_SCALE);
          mat.map.needsUpdate = true;
        }
        if (mat.normalMap) {
          mat.normalMap = mat.normalMap.clone();
          mat.normalMap.wrapS = THREE.RepeatWrapping;
          mat.normalMap.wrapT = THREE.RepeatWrapping;
          mat.normalMap.repeat.set(ROAD_TILE_SCALE, ROAD_TILE_SCALE);
          mat.normalMap.needsUpdate = true;
        }
        if (mat.roughnessMap) {
          mat.roughnessMap = mat.roughnessMap.clone();
          mat.roughnessMap.wrapS = THREE.RepeatWrapping;
          mat.roughnessMap.wrapT = THREE.RepeatWrapping;
          mat.roughnessMap.repeat.set(ROAD_TILE_SCALE, ROAD_TILE_SCALE);
          mat.roughnessMap.needsUpdate = true;
        }
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -1;
        mat.polygonOffsetUnits = -1;

        // Mute the road tint so the bright-white PavingStones pack
        // doesn't over-expose the composition. Previous 0x7a6e60 still
        // read as a bright plaza dominating the screen on cb=142 —
        // dropped to 0x4a3f36 (dark mossy stone) so the road recedes
        // into the scene as a surface to walk on, not a stage light.
        mat.color.setHex(0x4a3f36);
        // Roughness locked to max — weathered, non-reflective.
        mat.roughness = 0.98;

        setMaterial(mat);
      })
      .catch((err) => {
        if (cancelled) return;
        // Surface the failure via the runtime error bus. A missing road
        // PBR means the asset pipeline is broken — silently rendering an
        // invisible road masks the bug until someone notices the player
        // walking on nothing.
        reportRuntimeError(err, `RoadSurface.loadPbrMaterial(${pbrId})`);
      });
    return () => {
      cancelled = true;
    };
  }, [roadType]);

  // Dispose the cloned material + its cloned textures when React swaps
  // to a new material (e.g. roadType changes) or when the component
  // unmounts (chunk unloads from view-distance). React fires the cleanup
  // with the previous `material` captured in scope; the new material is
  // owned by the next render.
  useEffect(() => {
    return () => {
      disposeRoadMaterial(material);
    };
  }, [material]);

  const geometry = useMemo(() => {
    const gx = kingdomTile.x;
    const gy = kingdomTile.y;
    const neighbors = getRoadNeighbors(kingdomMap, gx, gy);

    const halfChunk = CHUNK_SIZE / 2;
    const roadWidth = ROAD_WIDTHS[roadType];
    const halfRoad = roadWidth / 2;
    const segs = ROAD_SEGMENTS;

    // Collect all road strip quads into a single merged geometry.
    // Each direction (N/S/E/W) that has a road neighbor gets a strip
    // from center to that edge. If no neighbors, render a center patch.
    const geometries: THREE.BufferGeometry[] = [];

    // Always render a center intersection patch
    const centerGeo = buildRoadPatch(
      oX + halfChunk - halfRoad,
      oZ + halfChunk - halfRoad,
      roadWidth,
      roadWidth,
      segs,
    );
    geometries.push(centerGeo);

    if (neighbors.north) {
      geometries.push(
        buildRoadPatch(
          oX + halfChunk - halfRoad,
          oZ,
          roadWidth,
          halfChunk - halfRoad,
          segs,
        ),
      );
    }
    if (neighbors.south) {
      geometries.push(
        buildRoadPatch(
          oX + halfChunk - halfRoad,
          oZ + halfChunk + halfRoad,
          roadWidth,
          halfChunk - halfRoad,
          segs,
        ),
      );
    }
    if (neighbors.west) {
      geometries.push(
        buildRoadPatch(
          oX,
          oZ + halfChunk - halfRoad,
          halfChunk - halfRoad,
          roadWidth,
          segs,
        ),
      );
    }
    if (neighbors.east) {
      geometries.push(
        buildRoadPatch(
          oX + halfChunk + halfRoad,
          oZ + halfChunk - halfRoad,
          halfChunk - halfRoad,
          roadWidth,
          segs,
        ),
      );
    }

    const merged = mergeGeometries(geometries);
    for (const g of geometries) g.dispose();
    return merged;
  }, [oX, oZ, kingdomTile, kingdomMap, roadType]);

  // Dispose merged geometry on unmount or when a new one is computed. The
  // chunk manager unmounts RoadSurface when the player walks out of
  // view-distance — without this effect the BufferGeometry leaks once per
  // unloaded chunk.
  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  if (!geometry || !material) return null;

  return <mesh geometry={geometry} material={material} receiveShadow />;
}

/**
 * Dispose a cloned road material and its cloned textures. The PBR loader
 * hands out shared cached materials; RoadSurface clones them (and the
 * individual maps) so it can set per-instance tiling. Those clones must
 * be released explicitly — the shared cache keeps the originals alive.
 */
function disposeRoadMaterial(
  mat: THREE.MeshStandardMaterial | null | undefined,
): void {
  if (!mat) return;
  mat.map?.dispose();
  mat.normalMap?.dispose();
  mat.roughnessMap?.dispose();
  mat.dispose();
}

/**
 * Build a flat road patch at y=ROAD_Y.
 *
 * The surface is a subdivision grid even though it's flat — subdivision stays
 * in place because future visual polish (height-conforming, edge feathering)
 * will need the extra vertices, and the mesh is still fewer than 200 verts
 * per chunk per road strip.
 *
 * @param startX  World X of the patch's west edge
 * @param startZ  World Z of the patch's north edge
 * @param width   Patch width in world units (X axis)
 * @param depth   Patch depth in world units (Z axis)
 * @param segs    Number of subdivisions per axis
 */
function buildRoadPatch(
  startX: number,
  startZ: number,
  width: number,
  depth: number,
  segs: number,
): THREE.BufferGeometry {
  const vertsX = segs + 1;
  const vertsZ = segs + 1;
  const vertCount = vertsX * vertsZ;
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);

  for (let iz = 0; iz < vertsZ; iz++) {
    for (let ix = 0; ix < vertsX; ix++) {
      const idx = iz * vertsX + ix;
      const wx = startX + (ix / segs) * width;
      const wz = startZ + (iz / segs) * depth;

      positions[idx * 3] = wx;
      positions[idx * 3 + 1] = ROAD_Y;
      positions[idx * 3 + 2] = wz;

      uvs[idx * 2] = ix / segs;
      uvs[idx * 2 + 1] = iz / segs;

      normals[idx * 3] = 0;
      normals[idx * 3 + 1] = 1;
      normals[idx * 3 + 2] = 0;
    }
  }

  // Build triangle indices
  const indexCount = segs * segs * 6;
  const indices = new Uint16Array(indexCount);
  let idx = 0;
  for (let iz = 0; iz < segs; iz++) {
    for (let ix = 0; ix < segs; ix++) {
      const a = iz * vertsX + ix;
      const b = a + 1;
      const c = a + vertsX;
      const d = c + 1;

      indices[idx++] = a;
      indices[idx++] = c;
      indices[idx++] = b;

      indices[idx++] = b;
      indices[idx++] = c;
      indices[idx++] = d;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeVertexNormals();

  return geo;
}

/**
 * Merge multiple BufferGeometries into one.
 * Simple implementation for non-indexed output.
 */
function mergeGeometries(
  geometries: THREE.BufferGeometry[],
): THREE.BufferGeometry | null {
  if (geometries.length === 0) return null;
  if (geometries.length === 1) return geometries[0].clone();

  let totalVerts = 0;

  for (const geo of geometries) {
    totalVerts += geo.attributes.position.count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const indices: number[] = [];

  let vertOffset = 0;

  for (const geo of geometries) {
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const uv = geo.attributes.uv;
    const count = pos.count;

    for (let i = 0; i < count; i++) {
      positions[(vertOffset + i) * 3] = pos.getX(i);
      positions[(vertOffset + i) * 3 + 1] = pos.getY(i);
      positions[(vertOffset + i) * 3 + 2] = pos.getZ(i);

      if (norm) {
        normals[(vertOffset + i) * 3] = norm.getX(i);
        normals[(vertOffset + i) * 3 + 1] = norm.getY(i);
        normals[(vertOffset + i) * 3 + 2] = norm.getZ(i);
      }

      if (uv) {
        uvs[(vertOffset + i) * 2] = uv.getX(i);
        uvs[(vertOffset + i) * 2 + 1] = uv.getY(i);
      }
    }

    if (geo.index) {
      for (let i = 0; i < geo.index.count; i++) {
        indices.push(geo.index.getX(i) + vertOffset);
      }
    }

    vertOffset += count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  const uvAttr = new THREE.BufferAttribute(uvs, 2);
  merged.setAttribute('uv', uvAttr);
  // MeshStandardMaterial's aoMap samples from uv2, not uv. Without this
  // alias the PBR loader's loaded AO texture applies to no pixel. Share
  // the same underlying buffer — road tiling is uniform across all
  // channels, so a second identical UV set is correct and costs zero
  // extra memory beyond the attribute header.
  merged.setAttribute('uv2', uvAttr);
  if (indices.length > 0) {
    merged.setIndex(indices);
  }

  return merged;
}
