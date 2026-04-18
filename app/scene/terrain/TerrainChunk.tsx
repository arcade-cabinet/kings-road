import { HeightfieldCollider, RigidBody } from '@react-three/rapier';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadPbrMaterial } from '@/assets/pbr/loader';
import type { BiomeConfig } from '@/biome/schema';
import {
  buildDisplacedGeometry,
  buildProceduralHeightmap,
  buildSplatMap,
  loadHeightmap,
} from '@/world/terrain';
import { CHUNK_SIZE } from '@/utils/worldGen';
import { buildSplatBlendMaterial } from './SplatBlendMaterial';

/** Subdivisions per chunk edge — 32 gives good fidelity at mobile perf budget. */
const TERRAIN_SEGMENTS = 32;

export interface TerrainChunkProps {
  /** Biome configuration — drives heightmap dispatch, materials, and splat weights. */
  biomeConfig: BiomeConfig;
  /** World-seed string for deterministic noise. */
  seed: string;
  /** Chunk grid column (X axis). */
  cx: number;
  /** Chunk grid row (Z axis). */
  cz: number;
  /**
   * Total number of chunks along one axis, used by buildDisplacedGeometry to
   * compute exact seam UVs. Defaults to 1 (standalone chunk).
   */
  totalChunks?: number;
}

interface TerrainState {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  /** Flat row-major height array for Rapier HeightfieldCollider. */
  heights: number[];
  splatMap: THREE.DataTexture;
}

/**
 * Async loader — builds heightmap, geometry, splat map, and PBR materials.
 * Suspends the caller via useState / useEffect pattern (no Suspense wrapper
 * needed at call site — returns null until ready, then swaps in the mesh).
 */
async function buildTerrainState(
  biomeConfig: BiomeConfig,
  seed: string,
  cx: number,
  cz: number,
  totalChunks: number,
): Promise<TerrainState> {
  const { terrain } = biomeConfig;

  // --- 1. Heightmap ---
  const heightmap =
    terrain.heightmap === 'procedural'
      ? buildProceduralHeightmap(seed, cx, cz)
      : await loadHeightmap(terrain.heightmap);

  // --- 2. Displaced geometry ---
  const geometry = buildDisplacedGeometry(heightmap, {
    chunkSize: CHUNK_SIZE,
    segments: TERRAIN_SEGMENTS,
    heightScale: terrain.displacementScale * terrain.scale,
    chunkCx: cx,
    chunkCz: cz,
    totalChunks,
  });

  // Build heights array from geometry for Rapier collider (row-major Z×X).
  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  const verts = TERRAIN_SEGMENTS + 1;
  const heights: number[] = new Array(verts * verts);
  for (let i = 0; i < posAttr.count; i++) {
    heights[i] = posAttr.getY(i);
  }

  // --- 3. Splat map — first 4 materials only ---
  const materialIds = terrain.materials.slice(0, 4);
  const splatBiomeConfig = {
    ...biomeConfig,
    terrain: { ...terrain, materials: materialIds },
  } as BiomeConfig;
  const splatMap = buildSplatMap(splatBiomeConfig, seed, {
    chunkCx: cx,
    chunkCz: cz,
  });

  // --- 4. PBR materials ---
  const pbrMaterials = await Promise.all(
    materialIds.map((id) =>
      loadPbrMaterial(id, {
        displacementScale: terrain.displacementScale,
      }),
    ),
  );

  // --- 5. Splat-blend shader material ---
  const material = buildSplatBlendMaterial({
    splatMap,
    materials: pbrMaterials as THREE.MeshStandardMaterial[],
    tileScale: 8,
  });

  return { geometry, material, heights, splatMap };
}

export function TerrainChunk({
  biomeConfig,
  seed,
  cx,
  cz,
  totalChunks = 1,
}: TerrainChunkProps) {
  const [state, setState] = useState<TerrainState | null>(null);
  const mountedRef = useRef(true);

  // Track key for dependency-change detection
  const stateKey = `${biomeConfig.id}:${seed}:${cx}:${cz}:${totalChunks}`;
  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    if (prevKeyRef.current === stateKey && state !== null) return;
    prevKeyRef.current = stateKey;

    buildTerrainState(biomeConfig, seed, cx, cz, totalChunks).then((s) => {
      if (mountedRef.current) setState(s);
    });

    return () => {
      mountedRef.current = false;
    };
  }, [stateKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dispose GPU resources when state changes or component unmounts.
  useEffect(() => {
    return () => {
      if (state) {
        state.geometry.dispose();
        state.material.dispose();
        state.splatMap.dispose();
      }
    };
  }, [state]);

  const worldX = cx * CHUNK_SIZE;
  const worldZ = cz * CHUNK_SIZE;
  const centerX = worldX + CHUNK_SIZE / 2;
  const centerZ = worldZ + CHUNK_SIZE / 2;

  const colliderScale = useMemo(
    () => ({
      x: CHUNK_SIZE,
      y: biomeConfig.terrain.displacementScale * biomeConfig.terrain.scale,
      z: CHUNK_SIZE,
    }),
    [biomeConfig.terrain.displacementScale, biomeConfig.terrain.scale],
  );

  if (!state) return null;

  return (
    <group>
      <mesh
        geometry={state.geometry}
        position={[centerX, 0, centerZ]}
        receiveShadow
      >
        <primitive object={state.material} attach="material" />
      </mesh>

      <RigidBody type="fixed" colliders={false}>
        <HeightfieldCollider
          args={[
            TERRAIN_SEGMENTS,
            TERRAIN_SEGMENTS,
            state.heights,
            colliderScale,
          ]}
          position={[centerX, 0, centerZ]}
        />
      </RigidBody>
    </group>
  );
}
