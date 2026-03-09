import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ChunkData } from '../types';
import { cyrb128, mulberry32 } from '../utils/random';
import { getMaterials } from '../utils/textures';
import { BLOCK_SIZE, CHUNK_SIZE } from '../utils/worldGen';
import { NPC } from './NPC';
import { Relic } from './Relic';

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

export function Chunk({ chunkData, seedPhrase }: ChunkProps) {
  const { cx, cz, key, type } = chunkData;
  const _rng = useMemo(
    () => mulberry32(cyrb128(seedPhrase + key)),
    [seedPhrase, key],
  );
  const materials = useMemo(() => getMaterials(), []);

  const oX = cx * CHUNK_SIZE;
  const oZ = cz * CHUNK_SIZE;

  // Generate all mesh data for this chunk
  const meshData = useMemo(() => {
    const data: {
      townWall: MeshInstance[];
      dungeonWall: MeshInstance[];
      wood: MeshInstance[];
      roof: MeshInstance[];
      door: MeshInstance[];
      windowGlow: MeshInstance[];
      crate: MeshInstance[];
      barrel: MeshInstance[];
      pineTrunk: MeshInstance[];
      pineLeaves: MeshInstance[];
      boulder: MeshInstance[];
      gems: GemData[];
    } = {
      townWall: [],
      dungeonWall: [],
      wood: [],
      roof: [],
      door: [],
      windowGlow: [],
      crate: [],
      barrel: [],
      pineTrunk: [],
      pineLeaves: [],
      boulder: [],
      gems: [],
    };

    // Local RNG that we can call during generation
    const localRng = mulberry32(cyrb128(seedPhrase + key));

    if (type === 'TOWN' || type === 'ROAD') {
      // Central highway stones
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

      if (type === 'TOWN') {
        // Build modular buildings
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
      // WILD - Forest
      for (let i = 0; i < 60; i++) {
        const px = oX + localRng() * CHUNK_SIZE;
        const pz = oZ + localRng() * CHUNK_SIZE;
        const s = 0.8 + localRng() * 0.6;

        data.pineTrunk.push({
          x: px,
          y: BLOCK_SIZE,
          z: pz,
          sx: s,
          sy: s,
          sz: s,
        });
        data.pineLeaves.push({
          x: px,
          y: BLOCK_SIZE * 2.5,
          z: pz,
          sx: s,
          sy: s,
          sz: s,
          rotY: localRng() * Math.PI,
        });
      }

      // Boulders
      for (let i = 0; i < 30; i++) {
        const px = oX + localRng() * CHUNK_SIZE;
        const pz = oZ + localRng() * CHUNK_SIZE;
        const s = 0.5 + localRng();

        data.boulder.push({
          x: px,
          y: BLOCK_SIZE * 0.3 * s,
          z: pz,
          sx: s,
          sy: s,
          sz: s,
          rotY: localRng() * Math.PI,
        });
      }
    }

    return data;
  }, [cx, key, type, oX, oZ, seedPhrase, buildModularBuilding]);

  // Helper function to build a modular building
  function buildModularBuilding(
    data: typeof meshData,
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

  // Ground material based on type
  const groundMaterial =
    type === 'WILD'
      ? materials.groundWild
      : type === 'ROAD'
        ? materials.groundRoad
        : materials.groundTown;

  // Safety check - if materials aren't ready, don't render
  if (!groundMaterial || !materials.townWall) {
    console.warn('[Chunk] Materials not ready');
    return null;
  }

  return (
    <group>
      {/* Ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[oX + CHUNK_SIZE / 2, 0, oZ + CHUNK_SIZE / 2]}
        receiveShadow
      >
        <planeGeometry args={[CHUNK_SIZE, CHUNK_SIZE]} />
        <primitive object={groundMaterial} attach="material" />
      </mesh>

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

      {/* Pine trunks */}
      <InstancedMeshes
        items={meshData.pineTrunk}
        geometry="pineTrunk"
        material={materials.pineTrunk}
      />

      {/* Pine leaves */}
      <InstancedMeshes
        items={meshData.pineLeaves}
        geometry="pineLeaves"
        material={materials.pineLeaves}
      />

      {/* Boulders */}
      <InstancedMeshes
        items={meshData.boulder}
        geometry="boulder"
        material={materials.boulder}
      />

      {/* NPCs */}
      {chunkData.interactables?.map((npc) =>
        npc ? <NPC key={npc.id} interactable={npc} /> : null,
      )}

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
