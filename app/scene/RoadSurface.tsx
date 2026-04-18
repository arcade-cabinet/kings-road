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

import { useMemo } from 'react';
import * as THREE from 'three';
import type {
  KingdomMap,
  MapTile,
  RoadType,
} from '@/schemas/kingdom.schema';
import { CHUNK_SIZE } from '@/utils/worldCoords';
import { getTerrainHeight } from '@/utils/worldGen';
import { getKingdomTile } from '@/world/kingdom-gen';

/** Subdivisions along each road strip axis */
const ROAD_SEGMENTS = 12;

/** Small Y offset above terrain to prevent z-fighting */
const ROAD_Y_OFFSET = 0.08;

/** Road width in world units per road type */
const ROAD_WIDTHS: Record<RoadType, number> = {
  highway: 24,
  secondary: 14,
  path: 7,
  trail: 4,
};

/** Road material colors per road type (warm palette matching the game mood) */
const ROAD_COLORS: Record<RoadType, number> = {
  highway: 0xc4aa78, // warm honey cobblestone
  secondary: 0x8b7355, // earthy brown dirt
  path: 0x6b7a52, // trampled dark green
  trail: 0x5a6a45, // subtle grass trail
};

/** Cached road materials (one per road type) */
const roadMaterialCache = new Map<RoadType, THREE.MeshStandardMaterial>();

function getRoadMaterial(roadType: RoadType): THREE.MeshStandardMaterial {
  let mat = roadMaterialCache.get(roadType);
  if (mat) return mat;

  mat = new THREE.MeshStandardMaterial({
    color: ROAD_COLORS[roadType],
    roughness: roadType === 'highway' ? 0.85 : 0.95,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  roadMaterialCache.set(roadType, mat);
  return mat;
}

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
  const material = useMemo(() => getRoadMaterial(roadType), [roadType]);

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
      kingdomMap,
    );
    geometries.push(centerGeo);

    // North strip: from center to north edge
    if (neighbors.north) {
      const stripGeo = buildRoadPatch(
        oX + halfChunk - halfRoad,
        oZ,
        roadWidth,
        halfChunk - halfRoad,
        segs,
        kingdomMap,
      );
      geometries.push(stripGeo);
    }

    // South strip: from center to south edge
    if (neighbors.south) {
      const stripGeo = buildRoadPatch(
        oX + halfChunk - halfRoad,
        oZ + halfChunk + halfRoad,
        roadWidth,
        halfChunk - halfRoad,
        segs,
        kingdomMap,
      );
      geometries.push(stripGeo);
    }

    // West strip: from center to west edge
    if (neighbors.west) {
      const stripGeo = buildRoadPatch(
        oX,
        oZ + halfChunk - halfRoad,
        halfChunk - halfRoad,
        roadWidth,
        segs,
        kingdomMap,
      );
      geometries.push(stripGeo);
    }

    // East strip: from center to east edge
    if (neighbors.east) {
      const stripGeo = buildRoadPatch(
        oX + halfChunk + halfRoad,
        oZ + halfChunk - halfRoad,
        halfChunk - halfRoad,
        roadWidth,
        segs,
        kingdomMap,
      );
      geometries.push(stripGeo);
    }

    // Merge all strips into one geometry
    const merged = mergeGeometries(geometries);
    for (const g of geometries) g.dispose();
    return merged;
  }, [oX, oZ, kingdomTile, kingdomMap, roadType]);

  if (!geometry) return null;

  return <mesh geometry={geometry} material={material} receiveShadow />;
}

/**
 * Build a terrain-conforming road patch (subdivision grid).
 *
 * @param startX  World X of the patch's west edge
 * @param startZ  World Z of the patch's north edge
 * @param width   Patch width in world units (X axis)
 * @param depth   Patch depth in world units (Z axis)
 * @param segs    Number of subdivisions per axis
 * @param map     Kingdom map for height sampling
 */
function buildRoadPatch(
  startX: number,
  startZ: number,
  width: number,
  depth: number,
  segs: number,
  map: KingdomMap,
): THREE.BufferGeometry {
  const vertsX = segs + 1;
  const vertsZ = segs + 1;
  const vertCount = vertsX * vertsZ;
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);

  // Build vertices
  for (let iz = 0; iz < vertsZ; iz++) {
    for (let ix = 0; ix < vertsX; ix++) {
      const idx = iz * vertsX + ix;
      const wx = startX + (ix / segs) * width;
      const wz = startZ + (iz / segs) * depth;
      const wy = getTerrainHeight(map, wx, wz) + ROAD_Y_OFFSET;

      positions[idx * 3] = wx;
      positions[idx * 3 + 1] = wy;
      positions[idx * 3 + 2] = wz;

      uvs[idx * 2] = ix / segs;
      uvs[idx * 2 + 1] = iz / segs;

      // Default up normal (will be recalculated)
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
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (indices.length > 0) {
    merged.setIndex(indices);
  }

  return merged;
}
