import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Chunk } from '../components/Chunk';
import { useGameStore } from '../stores/gameStore';
import type { AABB, ChunkData, Interactable, PlacedBuildingData, PlacedNPCData } from '../types';
import { cyrb128, mulberry32 } from '../utils/random';
import {
  BLOCK_SIZE,
  CHUNK_SIZE,
  getChunkName,
  getChunkType,
  getRandomDialogue,
  getRandomNPCName,
  VIEW_DISTANCE,
} from '../utils/worldGen';
import { getTownConfig, resolveBuildingArchetype, resolveNPCBlueprint } from '../world/town-configs';
import { layoutTown } from '../world/town-layout';

// Generate chunk data (colliders, interactables, etc.)
function generateChunkData(
  cx: number,
  cz: number,
  seedPhrase: string,
  chunkDeltas: Record<string, { gems: number[] }>,
): ChunkData {
  const key = `${cx},${cz}`;
  const type = getChunkType(cx, cz, seedPhrase);
  let name = getChunkName(cx, cz, type, seedPhrase);
  const rng = mulberry32(cyrb128(seedPhrase + key));

  const collidables: AABB[] = [];
  const interactables: Interactable[] = [];
  const collectedGems = new Set<number>(chunkDeltas[key]?.gems || []);

  const oX = cx * CHUNK_SIZE;
  const oZ = cz * CHUNK_SIZE;

  // Helper to add AABB
  const addAABB = (x: number, z: number, width: number, depth: number) => {
    collidables.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
    });
  };

  // Helper to add interactable
  const addInteractable = (
    x: number,
    z: number,
    npcType: Interactable['type'],
  ) => {
    const npcName = getRandomNPCName(rng);
    const dialogue = getRandomDialogue(npcType, rng);
    const actionVerb =
      npcType === 'blacksmith' ||
      npcType === 'innkeeper' ||
      npcType === 'merchant'
        ? 'TALK'
        : 'GREET';

    interactables.push({
      id: `${key}-npc-${interactables.length}`,
      position: new THREE.Vector3(x, 0, z),
      radius: 4.0,
      type: npcType,
      name: npcName,
      dialogueText: dialogue,
      actionVerb,
    });
  };

  if (type === 'TOWN') {
    // Buildings colliders
    // Inn
    const innW = 3,
      innD = 4;
    const innX = oX + 20 + (innW * BLOCK_SIZE) / 2;
    const innZ = oZ + 20 + (innD * BLOCK_SIZE) / 2;
    addAABB(innX, innZ, innW * BLOCK_SIZE, innD * BLOCK_SIZE);
    addInteractable(innX, oZ + 20 + BLOCK_SIZE * 1.5, 'innkeeper');

    // Blacksmith
    const bsW = 2,
      bsD = 2;
    const bsX = oX + CHUNK_SIZE - 40 + (bsW * BLOCK_SIZE) / 2;
    const bsZ = oZ + 20 + (bsD * BLOCK_SIZE) / 2;
    addAABB(bsX, bsZ, bsW * BLOCK_SIZE, bsD * BLOCK_SIZE);
    addInteractable(bsX - 2, bsZ + 2, 'blacksmith');

    // Houses
    const houses = [
      { x: oX + 20, z: oZ + 80 },
      { x: oX + 20 + BLOCK_SIZE * 2, z: oZ + 80 },
      { x: oX + CHUNK_SIZE - 35, z: oZ + 70 },
    ];

    houses.forEach((house) => {
      const hW = 2,
        hD = 2;
      const hX = house.x + (hW * BLOCK_SIZE) / 2;
      const hZ = house.z + (hD * BLOCK_SIZE) / 2;
      addAABB(hX, hZ, hW * BLOCK_SIZE, hD * BLOCK_SIZE);

      if (rng() > 0.4) {
        addInteractable(hX, hZ + BLOCK_SIZE * 1.8, 'wanderer');
      }
    });

    // Town merchant
    if (rng() > 0.5) {
      addInteractable(
        oX + CHUNK_SIZE / 2 + rng() * 20 - 10,
        oZ + CHUNK_SIZE / 2,
        'merchant',
      );
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
      const dir = Math.floor(rng() * 4);
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

    // Add colliders for walls
    for (let z = 0; z < mSize; z++) {
      for (let x = 0; x < mSize; x++) {
        if (grid[z][x] === 1) {
          const px = oX + offset + x * BLOCK_SIZE + BLOCK_SIZE / 2;
          const pz = oZ + offset + z * BLOCK_SIZE + BLOCK_SIZE / 2;
          addAABB(px, pz, BLOCK_SIZE, BLOCK_SIZE);
        }
      }
    }
  } else if (type === 'WILD') {
    // Trees as obstacles
    for (let i = 0; i < 60; i++) {
      const px = oX + rng() * CHUNK_SIZE;
      const pz = oZ + rng() * CHUNK_SIZE;
      addAABB(px, pz, BLOCK_SIZE * 0.4, BLOCK_SIZE * 0.4);
    }

    // Boulders
    for (let i = 0; i < 30; i++) {
      const px = oX + rng() * CHUNK_SIZE;
      const pz = oZ + rng() * CHUNK_SIZE;
      const s = 0.5 + rng();
      addAABB(px, pz, BLOCK_SIZE * 0.5 * s, BLOCK_SIZE * 0.5 * s);
    }

    // Occasional wanderer in wilderness
    if (rng() > 0.85) {
      addInteractable(
        oX + 20 + rng() * (CHUNK_SIZE - 40),
        oZ + 20 + rng() * (CHUNK_SIZE - 40),
        'wanderer',
      );
    }
  }

  // Config-driven town: if a town config is anchored at these coords, overlay it
  let placedBuildings: PlacedBuildingData[] | undefined;
  let npcBlueprints: PlacedNPCData[] | undefined;

  const townConfig = getTownConfig(cx, cz);
  if (townConfig && type === 'TOWN') {
    const oXTown = cx * CHUNK_SIZE;
    const oZTown = cz * CHUNK_SIZE;
    const placed = layoutTown(townConfig, oXTown, oZTown);

    placedBuildings = placed
      .map((p) => {
        const archetype = resolveBuildingArchetype(
          p.archetype,
          p.overrides as Record<string, unknown> | undefined,
        );
        if (!archetype) return null;
        return {
          archetype,
          label: p.label,
          worldX: p.worldX,
          worldZ: p.worldZ,
          rotation: p.rotation,
        };
      })
      .filter((b): b is PlacedBuildingData => b !== null);

    // Add building collision AABBs
    for (const b of placedBuildings) {
      const fw = b.archetype.footprint.width * BLOCK_SIZE;
      const fd = b.archetype.footprint.depth * BLOCK_SIZE;
      collidables.push({
        minX: b.worldX - fw / 2,
        maxX: b.worldX + fw / 2,
        minZ: b.worldZ - fd / 2,
        maxZ: b.worldZ + fd / 2,
      });
    }

    // Resolve NPC blueprints and create interactables for them
    npcBlueprints = [];
    for (const npcPlacement of townConfig.npcs) {
      const blueprint = resolveNPCBlueprint(npcPlacement.id);
      if (!blueprint) continue;

      // Find the building this NPC is attached to, for position
      let npcX = oXTown + CHUNK_SIZE / 2;
      let npcZ = oZTown + CHUNK_SIZE / 2;

      if (npcPlacement.building && placedBuildings) {
        const bldg = placedBuildings.find((b) => b.label === npcPlacement.building);
        if (bldg) {
          // Place NPC just outside the building's front
          npcX = bldg.worldX;
          npcZ = bldg.worldZ + (bldg.archetype.footprint.depth * BLOCK_SIZE) / 2 + 2;
        }
      } else if (npcPlacement.position) {
        npcX = oXTown + npcPlacement.position[0] * BLOCK_SIZE;
        npcZ = oZTown + npcPlacement.position[1] * BLOCK_SIZE;
      }

      const npcType = (['blacksmith', 'innkeeper', 'merchant', 'wanderer'].includes(npcPlacement.archetype)
        ? npcPlacement.archetype
        : 'wanderer') as Interactable['type'];

      const greeting = blueprint.dialogue?.greeting?.[0] ?? 'Well met, traveller.';

      const interactable: Interactable = {
        id: `${key}-bp-${npcPlacement.id}`,
        position: new THREE.Vector3(npcX, 0, npcZ),
        radius: 4.0,
        type: npcType,
        name: npcPlacement.name ?? blueprint.name ?? npcPlacement.id,
        dialogueText: greeting,
        actionVerb: blueprint.behavior?.interactionVerb ?? 'TALK',
      };

      interactables.push(interactable);
      npcBlueprints.push({ interactable, blueprint });
    }

    // Override the name with the town config name
    name = townConfig.name;
  }

  return {
    cx,
    cz,
    key,
    type,
    name,
    collidables,
    interactables,
    collectedGems,
    placedBuildings,
    npcBlueprints,
  };
}

export function ChunkManager() {
  const seedPhrase = useGameStore((state) => state.seedPhrase);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const activeChunks = useGameStore((state) => state.activeChunks);
  const chunkDeltas = useGameStore((state) => state.chunkDeltas);
  const gameActive = useGameStore((state) => state.gameActive);

  const addChunk = useGameStore((state) => state.addChunk);
  const removeChunk = useGameStore((state) => state.removeChunk);
  const addGlobalAABBs = useGameStore((state) => state.addGlobalAABBs);
  const removeGlobalAABBs = useGameStore((state) => state.removeGlobalAABBs);
  const addGlobalInteractables = useGameStore(
    (state) => state.addGlobalInteractables,
  );
  const removeGlobalInteractables = useGameStore(
    (state) => state.removeGlobalInteractables,
  );
  const setCurrentChunk = useGameStore((state) => state.setCurrentChunk);

  const lastChunkKey = useRef('');
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update chunks based on player position
  useFrame(() => {
    if (!gameActive || !seedPhrase) return;

    const currentCx = Math.floor(playerPosition.x / CHUNK_SIZE);
    const currentCz = Math.floor(playerPosition.z / CHUNK_SIZE);
    const newKey = `${currentCx},${currentCz}`;

    // Update location banner when entering new chunk
    if (lastChunkKey.current !== newKey) {
      lastChunkKey.current = newKey;

      const type = getChunkType(currentCx, currentCz, seedPhrase);
      const name = getChunkName(currentCx, currentCz, type, seedPhrase);
      setCurrentChunk(newKey, name, type);
    }

    // Determine which chunks should be active
    const chunksToKeep = new Set<string>();

    for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
      for (let dz = -VIEW_DISTANCE; dz <= VIEW_DISTANCE; dz++) {
        const cx = currentCx + dx;
        const cz = currentCz + dz;
        const key = `${cx},${cz}`;
        chunksToKeep.add(key);

        // Create new chunk if needed
        if (!activeChunks.has(key)) {
          const chunkData = generateChunkData(
            cx,
            cz,
            seedPhrase,
            chunkDeltas || {},
          );
          if (chunkData) {
            addChunk(chunkData);
            if (chunkData.collidables?.length) {
              addGlobalAABBs(chunkData.collidables);
            }
            if (chunkData.interactables?.length) {
              addGlobalInteractables(chunkData.interactables);
            }
          }
        }
      }
    }

    // Remove chunks that are too far
    activeChunks.forEach((chunk, key) => {
      if (!chunksToKeep.has(key) && chunk) {
        if (chunk.collidables?.length) {
          removeGlobalAABBs(chunk.collidables);
        }
        if (chunk.interactables?.length) {
          removeGlobalInteractables(chunk.interactables);
        }
        removeChunk(key);
      }
    });
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, []);

  // Don't render if game isn't active or no seed
  if (!gameActive || !seedPhrase) return null;

  // Safely convert activeChunks to array
  const chunks = activeChunks ? Array.from(activeChunks.values()) : [];

  return (
    <>
      {chunks.map((chunkData) =>
        chunkData ? (
          <Chunk
            key={chunkData.key}
            chunkData={chunkData}
            seedPhrase={seedPhrase}
          />
        ) : null,
      )}
    </>
  );
}
