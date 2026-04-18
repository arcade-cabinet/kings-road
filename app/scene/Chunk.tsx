import {
  CuboidCollider,
  HeightfieldCollider,
  RigidBody,
} from '@react-three/rapier';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useWorldSession } from '@/ecs/hooks/useWorldSession';
import type { ChunkData } from '@/types/game';
import { cyrb128, mulberry32 } from '@/utils/random';
import { getBiomeGroundMaterial, getMaterials } from '@/utils/textures';
import type { HeightSampler } from '@/utils/vegetation';
import { placeVegetation } from '@/utils/vegetation';
import { GlbInstancer } from './GlbInstancer';
import {
  BLOCK_SIZE,
  CHUNK_SIZE,
  getTerrainHeight,
  MAX_TERRAIN_HEIGHT,
} from '@/utils/worldGen';
import { Building } from './Building';
import { Feature } from './Feature';
import { NPC } from './NPC';
import { Relic } from './Relic';
import { RoadSurface } from './RoadSurface';

/** Number of subdivisions per chunk edge for terrain mesh */
const TERRAIN_SEGMENTS = 16;

interface ChunkProps {
  chunkData: ChunkData;
  seedPhrase: string;
}

interface MeshInstance {
  x: number;
  y: number;
  z: number;
  sx?: number;
  sy?: number;
  sz?: number;
  rotY?: number;
}

interface GemData {
  id: number;
  x: number;
  y: number;
  z: number;
}

interface MeshData {
  townWall: MeshInstance[];
  dungeonWall: MeshInstance[];
  wood: MeshInstance[];
  roof: MeshInstance[];
  door: MeshInstance[];
  windowGlow: MeshInstance[];
  crate: MeshInstance[];
  barrel: MeshInstance[];
  pine: MeshInstance[];
  oak: MeshInstance[];
  bush: MeshInstance[];
  grassTuft: MeshInstance[];
  deadTree: MeshInstance[];
  heather: MeshInstance[];
  boulder: MeshInstance[];
  gems: GemData[];
}

// Helper function to build a modular building
function buildModularBuilding(
  data: MeshData,
  bx: number,
  bz: number,
  buildingType: string,
  localRng: () => number,
) {
  let w = 2,
    d = 2,
    h = 1;
  if (buildingType === 'inn') {
    w = 3;
    d = 4;
    h = 2;
  }
  if (buildingType === 'blacksmith') {
    w = 2;
    d = 2;
    h = 1;
  }
  if (buildingType === 'house') {
    h = 1 + Math.floor(localRng() * 2);
  }

  const centerX = bx + (w * BLOCK_SIZE) / 2;
  const centerZ = bz + (d * BLOCK_SIZE) / 2;

  // Stone foundation
  data.dungeonWall.push({
    x: centerX,
    y: 0.25,
    z: centerZ,
    sx: w,
    sy: 0.1,
    sz: d,
  });

  for (let fl = 0; fl < h; fl++) {
    const py = fl * BLOCK_SIZE + BLOCK_SIZE / 2;
    const overhang = buildingType === 'inn' && fl > 0 ? 0.2 : 0;

    for (let ix = 0; ix < w; ix++) {
      for (let iz = 0; iz < d; iz++) {
        const px = bx + ix * BLOCK_SIZE + BLOCK_SIZE / 2;
        const pz = bz + iz * BLOCK_SIZE + BLOCK_SIZE / 2;
        const isPerimeter =
          ix === 0 || ix === w - 1 || iz === 0 || iz === d - 1;

        if (isPerimeter) {
          // Timber frame corners
          data.wood.push({
            x: px - BLOCK_SIZE / 2,
            y: py,
            z: pz - BLOCK_SIZE / 2,
            sx: 1,
            sy: 1,
            sz: 1,
          });
          data.wood.push({
            x: px + BLOCK_SIZE / 2,
            y: py,
            z: pz + BLOCK_SIZE / 2,
            sx: 1,
            sy: 1,
            sz: 1,
          });

          // Open front for blacksmith
          if (buildingType === 'blacksmith' && fl === 0 && iz === d - 1)
            continue;

          // Door
          if (fl === 0 && iz === d - 1 && ix === Math.floor(w / 2)) {
            data.door.push({ x: px, y: BLOCK_SIZE / 4, z: pz });
          } else {
            data.townWall.push({
              x: px,
              y: py,
              z: pz,
              sx: 1 + overhang,
              sz: 1 + overhang,
            });

            // Windows
            if (localRng() > 0.5) {
              let wz = pz,
                wx = px;
              if (iz === d - 1) wz = pz + BLOCK_SIZE / 2 + 0.05;
              else if (iz === 0) wz = pz - BLOCK_SIZE / 2 - 0.05;
              if (ix === w - 1) wx = px + BLOCK_SIZE / 2 + 0.05;
              else if (ix === 0) wx = px - BLOCK_SIZE / 2 - 0.05;

              if (wz !== pz || wx !== px) {
                data.windowGlow.push({ x: wx, y: py, z: wz });
              }
            }
          }
        }
      }
    }
  }

  // Roof
  data.roof.push({
    x: centerX,
    y: h * BLOCK_SIZE + BLOCK_SIZE * 0.6,
    z: centerZ,
    sx: w * 0.75,
    sz: d * 0.75,
  });

  // Clutter
  if (buildingType === 'blacksmith') {
    data.barrel.push({
      x: centerX + BLOCK_SIZE / 2,
      y: BLOCK_SIZE * 0.25,
      z: centerZ + BLOCK_SIZE / 2,
    });
  } else if (buildingType === 'inn') {
    for (let i = 0; i < 4; i++) {
      data.crate.push({
        x: bx - BLOCK_SIZE / 2 + localRng() * 2,
        y: BLOCK_SIZE * 0.2,
        z: centerZ + localRng() * 4,
      });
    }
  }
}

export function Chunk({ chunkData, seedPhrase }: ChunkProps) {
  const { cx, cz, key, type, placedBuildings, npcBlueprints } = chunkData;
  const hasConfigTown =
    type === 'TOWN' && placedBuildings && placedBuildings.length > 0;
  const _rng = useMemo(
    () => mulberry32(cyrb128(seedPhrase + key)),
    [seedPhrase, key],
  );
  const materials = useMemo(() => getMaterials(), []);

  const oX = cx * CHUNK_SIZE;
  const oZ = cz * CHUNK_SIZE;

  // Kingdom map from world store for heightmap sampling (needed early for vegetation)
  const kingdomMap = useWorldSession().kingdomMap;

  // Generate all mesh data for this chunk
  const meshData = useMemo(() => {
    const data: MeshData = {
      townWall: [],
      dungeonWall: [],
      wood: [],
      roof: [],
      door: [],
      windowGlow: [],
      crate: [],
      barrel: [],
      pine: [],
      oak: [],
      bush: [],
      grassTuft: [],
      deadTree: [],
      heather: [],
      boulder: [],
      gems: [],
    };

    // Local RNG that we can call during generation
    const localRng = mulberry32(cyrb128(seedPhrase + key));

    if (type === 'TOWN' || type === 'ROAD') {
      // Legacy central highway stones — skip when RoadSurface handles rendering
      if (!chunkData.kingdomTile?.hasRoad) {
        for (let z = 0; z < CHUNK_SIZE; z += 4) {
          for (let w = -3; w <= 3; w++) {
            data.dungeonWall.push({
              x: oX + CHUNK_SIZE / 2 + w * 4 + localRng() * 2,
              y: 0.05,
              z: oZ + z,
              sy: 0.02,
            });
          }
        }
      }

      if (type === 'TOWN' && !hasConfigTown) {
        // Legacy instanced buildings — only for towns without a config
        buildModularBuilding(data, oX + 20, oZ + 20, 'inn', localRng);
        buildModularBuilding(
          data,
          oX + CHUNK_SIZE - 40,
          oZ + 20,
          'blacksmith',
          localRng,
        );
        buildModularBuilding(data, oX + 20, oZ + 80, 'house', localRng);
        buildModularBuilding(
          data,
          oX + 20 + BLOCK_SIZE * 2,
          oZ + 80,
          'house',
          localRng,
        );
        buildModularBuilding(
          data,
          oX + CHUNK_SIZE - 35,
          oZ + 70,
          'house',
          localRng,
        );

        // Town decorations
        for (let i = 0; i < 8; i++) {
          data.barrel.push({
            x: oX + 30 + localRng() * 60,
            y: BLOCK_SIZE * 0.25,
            z: oZ + 30 + localRng() * 60,
          });
        }
      } else if (type === 'TOWN' && hasConfigTown) {
        // Config-driven town — add barrels/crates as decorations only
        for (let i = 0; i < 6; i++) {
          data.barrel.push({
            x: oX + 30 + localRng() * 60,
            y: BLOCK_SIZE * 0.25,
            z: oZ + 30 + localRng() * 60,
          });
        }
      }
    } else if (type === 'DUNGEON') {
      const mSize = 17;
      const offset = (CHUNK_SIZE - mSize * BLOCK_SIZE) / 2;

      // Generate maze
      const grid: number[][] = Array.from({ length: mSize }, () =>
        Array(mSize).fill(1),
      );
      let currX = 8,
        currZ = 8;
      grid[currZ][currX] = 0;

      for (let i = 0; i < 300; i++) {
        const dir = Math.floor(localRng() * 4);
        if (dir === 0 && currX > 1) currX -= 1;
        else if (dir === 1 && currX < mSize - 2) currX += 1;
        else if (dir === 2 && currZ > 1) currZ -= 1;
        else if (dir === 3 && currZ < mSize - 2) currZ += 1;
        grid[currZ][currX] = 0;
      }

      // Entrances
      grid[8][0] = 0;
      grid[8][1] = 0;
      if (cx > 0) grid[8][0] = 0;
      else grid[8][mSize - 1] = 0;

      let gemIdx = 0;
      for (let z = 0; z < mSize; z++) {
        for (let x = 0; x < mSize; x++) {
          const px = oX + offset + x * BLOCK_SIZE + BLOCK_SIZE / 2;
          const pz = oZ + offset + z * BLOCK_SIZE + BLOCK_SIZE / 2;

          if (grid[z][x] === 1) {
            // Corner towers
            if ((x === 0 || x === mSize - 1) && (z === 0 || z === mSize - 1)) {
              data.dungeonWall.push({ x: px, y: BLOCK_SIZE, z: pz, sy: 2 });
              data.wood.push({ x: px, y: BLOCK_SIZE * 2, z: pz });
            } else {
              data.dungeonWall.push({ x: px, y: BLOCK_SIZE / 2, z: pz });
            }
          } else {
            // Chance for gem in open areas
            if (localRng() < 0.05) {
              data.gems.push({ id: gemIdx, x: px, y: 1.0, z: pz });
            }
            gemIdx++;
          }
        }
      }

      // Floor
      data.dungeonWall.push({
        x: oX + CHUNK_SIZE / 2,
        y: 0.1,
        z: oZ + CHUNK_SIZE / 2,
        sx: mSize,
        sy: 0.05,
        sz: mSize,
      });
    } else {
      // WILD — biome-aware vegetation placement
      // Pass terrain height sampler so vegetation sits on the heightmap
      const heightSampler: HeightSampler | undefined = kingdomMap
        ? (wx: number, wz: number) => getTerrainHeight(kingdomMap, wx, wz)
        : undefined;
      const veg = placeVegetation(
        chunkData.biome,
        oX,
        oZ,
        localRng,
        heightSampler,
      );
      data.pine.push(...veg.pine);
      data.oak.push(...veg.oak);
      data.bush.push(...veg.bush);
      data.grassTuft.push(...veg.grassTuft);
      data.deadTree.push(...veg.deadTree);
      data.heather.push(...veg.heather);
      data.boulder.push(...veg.boulder);
    }

    return data;
  }, [
    cx,
    key,
    type,
    oX,
    oZ,
    seedPhrase,
    hasConfigTown,
    chunkData.kingdomTile?.hasRoad,
    chunkData.biome,
    kingdomMap,
  ]);

  // Ground material: biome-aware when kingdom tile is present
  const groundMaterial = useMemo(() => {
    if (chunkData.biome) {
      // Kingdom-map-aware: use biome for ground material
      if (type === 'TOWN') return materials.groundTown;
      if (type === 'ROAD') return materials.groundRoad;
      return getBiomeGroundMaterial(chunkData.biome);
    }
    // Legacy fallback
    if (type === 'WILD') return materials.groundWild;
    if (type === 'ROAD') return materials.groundRoad;
    return materials.groundTown;
  }, [chunkData.biome, type, materials]);

  // Terrain material with vertex colors enabled (multiplied with base material color)
  const terrainMaterial = useMemo(() => {
    if (!groundMaterial) return null;
    const mat = groundMaterial.clone();
    mat.vertexColors = true;
    return mat;
  }, [groundMaterial]);

  // Is this an ocean tile? Skip terrain rendering for non-land tiles.
  const isOcean =
    chunkData.kingdomTile != null && !chunkData.kingdomTile.isLand;

  // Ground elevation from kingdom tile (world-space height) — legacy flat fallback
  const groundY = chunkData.kingdomTile
    ? chunkData.kingdomTile.elevation * MAX_TERRAIN_HEIGHT
    : 0;

  // Generate heightmap terrain geometry when kingdom map is available
  const terrainData = useMemo(() => {
    if (!kingdomMap || !chunkData.kingdomTile || isOcean) return null;

    const segs = TERRAIN_SEGMENTS;
    const verts = segs + 1;

    // Create subdivided plane in XZ space, centered at origin.
    // After rotateX(-PI/2), vertices lie in XZ from -CHUNK_SIZE/2 to +CHUNK_SIZE/2.
    // The mesh is positioned at chunk center so local coords map to world coords.
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    const centerX = oX + CHUNK_SIZE / 2;
    const centerZ = oZ + CHUNK_SIZE / 2;

    // Heights array for Rapier HeightfieldCollider (row-major: Z rows, X cols)
    const heights: number[] = new Array(verts * verts);

    // Vertex color buffer for elevation-based tinting
    const colors = new Float32Array(posAttr.count * 3);

    // Displace each vertex Y using interpolated kingdom map elevation
    for (let i = 0; i < posAttr.count; i++) {
      const localX = posAttr.getX(i);
      const localZ = posAttr.getZ(i);
      const worldX = centerX + localX;
      const worldZ = centerZ + localZ;
      const h = getTerrainHeight(kingdomMap, worldX, worldZ);
      posAttr.setY(i, h);

      // Elevation-based vertex color: green lowlands -> brown hills -> grey peaks
      const t = Math.min(Math.max(h / MAX_TERRAIN_HEIGHT, 0), 1);
      if (t < 0.3) {
        // Lush green lowlands
        colors[i * 3] = 0.48 + t * 0.3;
        colors[i * 3 + 1] = 0.72 - t * 0.2;
        colors[i * 3 + 2] = 0.28 + t * 0.1;
      } else if (t < 0.6) {
        // Olive/brown hills
        const mt = (t - 0.3) / 0.3;
        colors[i * 3] = 0.57 + mt * 0.1;
        colors[i * 3 + 1] = 0.66 - mt * 0.2;
        colors[i * 3 + 2] = 0.31 + mt * 0.05;
      } else {
        // Grey rock peaks
        const mt = (t - 0.6) / 0.4;
        colors[i * 3] = 0.67 - mt * 0.1;
        colors[i * 3 + 1] = 0.46 + mt * 0.14;
        colors[i * 3 + 2] = 0.36 + mt * 0.2;
      }
    }

    // Build heightfield heights in row-major order for Rapier collider
    for (let iz = 0; iz < verts; iz++) {
      for (let ix = 0; ix < verts; ix++) {
        const worldX = oX + (ix / segs) * CHUNK_SIZE;
        const worldZ = oZ + (iz / segs) * CHUNK_SIZE;
        heights[iz * verts + ix] = getTerrainHeight(kingdomMap, worldX, worldZ);
      }
    }

    posAttr.needsUpdate = true;
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    return { geometry: geo, heights };
  }, [kingdomMap, chunkData.kingdomTile, isOcean, oX, oZ]);

  // Materials must be ready before the first chunk renders — the
  // material cache is seeded synchronously at module load in
  // `@/utils/textures`. If either is missing, it's a bug, not a runtime
  // condition. Fail hard so ErrorBoundary / ErrorOverlay catch it.
  if (!groundMaterial) {
    throw new Error(
      `[Chunk ${chunkData.key}] groundMaterial missing — check getBiomeGroundMaterial wiring`,
    );
  }
  if (!materials.townWall) {
    throw new Error(
      `[Chunk ${chunkData.key}] materials.townWall missing — getMaterials() cache not seeded`,
    );
  }

  // Ocean chunks: render nothing (water rendering is a separate task)
  if (isOcean) {
    return null;
  }

  return (
    <group>
      {/* Terrain mesh — heightmap when kingdom map present, flat plane otherwise */}
      {terrainData && terrainMaterial ? (
        <mesh
          geometry={terrainData.geometry}
          position={[oX + CHUNK_SIZE / 2, 0, oZ + CHUNK_SIZE / 2]}
          receiveShadow
        >
          <primitive object={terrainMaterial} attach="material" />
        </mesh>
      ) : (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[oX + CHUNK_SIZE / 2, groundY, oZ + CHUNK_SIZE / 2]}
          receiveShadow
        >
          <planeGeometry args={[CHUNK_SIZE, CHUNK_SIZE]} />
          <primitive object={groundMaterial} attach="material" />
        </mesh>
      )}

      {/* Road surface overlay — terrain-conforming road mesh */}
      {kingdomMap && chunkData.kingdomTile?.hasRoad && (
        <RoadSurface
          oX={oX}
          oZ={oZ}
          kingdomTile={chunkData.kingdomTile}
          kingdomMap={kingdomMap}
        />
      )}

      {/* Town walls */}
      <InstancedMeshes
        items={meshData.townWall}
        geometry="cube"
        material={materials.townWall}
      />

      {/* Dungeon walls */}
      <InstancedMeshes
        items={meshData.dungeonWall}
        geometry="cube"
        material={materials.dungeonWall}
      />

      {/* Wood beams */}
      <InstancedMeshes
        items={meshData.wood}
        geometry="pillar"
        material={materials.wood}
      />

      {/* Roofs */}
      <InstancedMeshes
        items={meshData.roof}
        geometry="roof"
        material={materials.roof}
      />

      {/* Doors */}
      <InstancedMeshes
        items={meshData.door}
        geometry="door"
        material={materials.door}
      />

      {/* Windows */}
      <InstancedMeshes
        items={meshData.windowGlow}
        geometry="window"
        material={materials.windowGlow}
      />

      {/* Crates */}
      <InstancedMeshes
        items={meshData.crate}
        geometry="crate"
        material={materials.crate}
      />

      {/* Barrels */}
      {meshData.barrel.length > 0 && (
        <InstancedMeshes
          items={meshData.barrel}
          geometry="barrel"
          material={materials.barrel}
        />
      )}

      {/* Pines — authored GLB, single InstancedMesh per chunk */}
      <GlbInstancer glb="nature/tree15.glb" items={meshData.pine} />

      {/* Oaks — authored GLB */}
      <GlbInstancer glb="nature/tree01.glb" items={meshData.oak} />

      {/* Bushes — authored GLB */}
      <GlbInstancer glb="nature/bush05.glb" items={meshData.bush} />

      {/* Dead trees — reuse tree07 with dark tint via material override */}
      <GlbInstancer glb="nature/tree07.glb" items={meshData.deadTree} />

      {/* Boulders — authored GLB */}
      <GlbInstancer glb="nature/rocks.glb" items={meshData.boulder} />

      {/* Grass tufts — small bush stand-in at reduced scale (no dedicated grass GLB) */}
      <GlbInstancer
        glb="nature/bush01.glb"
        items={meshData.grassTuft}
        baseScale={0.35}
      />

      {/* Heather — bush at reduced scale */}
      <GlbInstancer
        glb="nature/bush01.glb"
        items={meshData.heather}
        baseScale={0.45}
      />

      {/* Config-driven buildings */}
      {hasConfigTown &&
        placedBuildings?.map((b) => (
          <Building
            key={`bldg-${b.label}`}
            archetype={b.archetype}
            position={[b.worldX, 0, b.worldZ]}
            rotation={b.rotation}
            label={b.label}
          />
        ))}

      {/* NPCs — use blueprints when available */}
      {npcBlueprints && npcBlueprints.length > 0
        ? npcBlueprints.map((npcData) => (
            <NPC
              key={npcData.interactable.id}
              interactable={npcData.interactable}
              blueprint={npcData.blueprint}
            />
          ))
        : chunkData.interactables?.map((npc) =>
            npc ? <NPC key={npc.id} interactable={npc} /> : null,
          )}

      {/* Kingdom map placed features */}
      {chunkData.placedFeatures?.map((feature) => (
        <Feature key={feature.id} feature={feature} />
      ))}

      {/* Collectible Artifacts */}
      {meshData.gems?.map((gem) =>
        gem ? (
          <Relic
            key={`${key}-gem-${gem.id}`}
            chunkKey={key}
            gemId={gem.id}
            position={[gem.x, gem.y, gem.z]}
            collected={chunkData.collectedGems?.has(gem.id) ?? false}
          />
        ) : null,
      )}

      {/* Rapier static colliders — ground + all obstacles */}
      <RigidBody type="fixed" colliders={false}>
        {/* Ground collider: heightfield when terrain data present, flat cuboid otherwise */}
        {terrainData ? (
          <HeightfieldCollider
            args={[
              TERRAIN_SEGMENTS,
              TERRAIN_SEGMENTS,
              terrainData.heights,
              { x: CHUNK_SIZE, y: 1, z: CHUNK_SIZE },
            ]}
            position={[oX + CHUNK_SIZE / 2, 0, oZ + CHUNK_SIZE / 2]}
          />
        ) : (
          <CuboidCollider
            args={[CHUNK_SIZE / 2, 0.1, CHUNK_SIZE / 2]}
            position={[oX + CHUNK_SIZE / 2, groundY - 0.1, oZ + CHUNK_SIZE / 2]}
          />
        )}
        {/* Obstacle colliders matching the AABB data */}
        {chunkData.collidables.map((aabb) => {
          const w = (aabb.maxX - aabb.minX) / 2;
          const d = (aabb.maxZ - aabb.minZ) / 2;
          const h = BLOCK_SIZE;
          const cx = (aabb.minX + aabb.maxX) / 2;
          const cz = (aabb.minZ + aabb.maxZ) / 2;
          return (
            <CuboidCollider
              key={`${cx.toFixed(1)},${cz.toFixed(1)}`}
              args={[w, h, d]}
              position={[cx, h, cz]}
            />
          );
        })}
      </RigidBody>
    </group>
  );
}

// Geometry cache
const geometryCache: Record<string, THREE.BufferGeometry> = {};

function getGeometry(type: string): THREE.BufferGeometry {
  if (geometryCache[type]) return geometryCache[type];

  let geo: THREE.BufferGeometry;
  switch (type) {
    case 'cube':
      geo = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      break;
    case 'pillar':
      geo = new THREE.BoxGeometry(
        BLOCK_SIZE * 0.3,
        BLOCK_SIZE,
        BLOCK_SIZE * 0.3,
      );
      break;
    case 'roof':
      geo = new THREE.ConeGeometry(BLOCK_SIZE * 1.5, BLOCK_SIZE * 1.5, 4);
      geo.rotateY(Math.PI / 4);
      break;
    case 'door':
      geo = new THREE.BoxGeometry(
        BLOCK_SIZE * 0.8,
        BLOCK_SIZE * 0.5,
        BLOCK_SIZE * 0.1,
      );
      break;
    case 'window':
      geo = new THREE.BoxGeometry(BLOCK_SIZE * 0.4, BLOCK_SIZE * 0.4, 0.1);
      break;
    case 'crate':
      geo = new THREE.BoxGeometry(
        BLOCK_SIZE * 0.4,
        BLOCK_SIZE * 0.4,
        BLOCK_SIZE * 0.4,
      );
      break;
    case 'barrel':
      geo = new THREE.CylinderGeometry(
        BLOCK_SIZE * 0.2,
        BLOCK_SIZE * 0.2,
        BLOCK_SIZE * 0.5,
        8,
      );
      break;
    case 'beam':
      geo = new THREE.BoxGeometry(
        BLOCK_SIZE * 0.15,
        BLOCK_SIZE * 1.1,
        BLOCK_SIZE * 0.15,
      );
      break;
    case 'halfCube':
      geo = new THREE.BoxGeometry(
        BLOCK_SIZE * 0.5,
        BLOCK_SIZE * 0.5,
        BLOCK_SIZE * 0.1,
      );
      break;
    case 'pineTrunk':
      geo = new THREE.CylinderGeometry(
        BLOCK_SIZE * 0.1,
        BLOCK_SIZE * 0.2,
        BLOCK_SIZE * 2,
        6,
      );
      break;
    case 'pineLeaves':
      geo = new THREE.ConeGeometry(BLOCK_SIZE * 1.2, BLOCK_SIZE * 3, 6);
      break;
    case 'oakTrunk':
      geo = new THREE.CylinderGeometry(
        BLOCK_SIZE * 0.15,
        BLOCK_SIZE * 0.25,
        BLOCK_SIZE * 1.6,
        6,
      );
      break;
    case 'oakLeaves':
      geo = new THREE.IcosahedronGeometry(BLOCK_SIZE * 1.4, 1);
      break;
    case 'bush':
      geo = new THREE.IcosahedronGeometry(BLOCK_SIZE * 0.5, 1);
      break;
    case 'grassTuft':
      geo = new THREE.ConeGeometry(BLOCK_SIZE * 0.2, BLOCK_SIZE * 0.6, 4);
      break;
    case 'deadTree':
      geo = new THREE.CylinderGeometry(
        BLOCK_SIZE * 0.05,
        BLOCK_SIZE * 0.15,
        BLOCK_SIZE * 2.4,
        5,
      );
      break;
    case 'heather':
      geo = new THREE.DodecahedronGeometry(BLOCK_SIZE * 0.35, 0);
      break;
    case 'boulder':
      geo = new THREE.DodecahedronGeometry(BLOCK_SIZE * 0.6, 1);
      break;
    default:
      geo = new THREE.BoxGeometry(1, 1, 1);
  }

  geometryCache[type] = geo;
  return geo;
}

interface InstancedMeshesProps {
  items: MeshInstance[];
  geometry: string;
  material: THREE.Material;
}

function InstancedMeshes({ items, geometry, material }: InstancedMeshesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => getGeometry(geometry), [geometry]);

  // Safety check for required props
  const safeItems = items || [];
  const itemCount = safeItems.length;

  // Use useEffect for setting matrices (side effect)
  useEffect(() => {
    if (!meshRef.current || itemCount === 0) return;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < itemCount; i++) {
      const item = safeItems[i];
      if (!item) continue;
      dummy.position.set(item.x ?? 0, item.y ?? 0, item.z ?? 0);
      dummy.scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
      dummy.rotation.set(0, item.rotY ?? 0, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [safeItems, itemCount]);

  // Don't render if no items or missing required props
  if (itemCount === 0 || !geo || !material) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, material, itemCount]}
      castShadow
      receiveShadow
    />
  );
}
