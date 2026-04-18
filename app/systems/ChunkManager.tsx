import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { KingdomMap, Settlement } from '@/schemas/kingdom.schema';
import { Chunk } from '@app/scene/Chunk';
import {
  addGlobalAABBs,
  addGlobalInteractables,
  addChunk,
  getFlags,
  getPlayer,
  getSeedPhrase,
  removeChunk,
  removeGlobalAABBs,
  removeGlobalInteractables,
  setCurrentChunk,
  getChunkState,
} from '@/ecs/actions/game';
import {
  useChunkState,
  useFlags,
  useSeed,
} from '@/ecs/hooks/useGameSession';
import { useWorldSession } from '@/ecs/hooks/useWorldSession';
import type {
  AABB,
  ChunkData,
  Interactable,
  PlacedBuildingData,
  PlacedFeatureData,
  PlacedNPCData,
} from '@/types/game';
import { cyrb128, mulberry32 } from '@/utils/random';
import {
  BLOCK_SIZE,
  CHUNK_SIZE,
  chunkToWorldOrigin,
  VIEW_DISTANCE,
  worldToChunk,
} from '@/utils/worldCoords';
import {
  getChunkTypeFromKingdom,
  getRandomDialogue,
  getRandomNPCName,
  getTerrainHeight,
} from '@/utils/worldGen';
import type { PlacedFeature } from '@/world/feature-placement';
import { getRegionAt } from '@/world/kingdom-gen';
import {
  generateNPCFromPool,
  getNPCPool,
  getTownConfigBySettlement,
  resolveBuildingArchetype,
  resolveNPCBlueprint,
} from '@/world/town-configs';
import { layoutTown } from '@/world/town-layout';

// Generate chunk data (colliders, interactables, etc.)
function generateChunkData(
  cx: number,
  cz: number,
  seedPhrase: string,
  chunkDeltas: Record<string, { gems: number[] }>,
  kingdomMap: KingdomMap,
  featureIndex?: Map<string, PlacedFeature[]>,
): ChunkData {
  const key = `${cx},${cz}`;

  // Kingdom-map-aware type resolution
  let type: ChunkData['type'];
  let name: string;
  let kingdomTile: ChunkData['kingdomTile'];
  let biome: ChunkData['biome'];
  let settlement: Settlement | undefined;
  const resolved = getChunkTypeFromKingdom(kingdomMap, cx, cz);
  if (!resolved) {
    // Outside map bounds or ocean — skip rendering
    type = 'WILD';
    name = 'The Ocean';
    biome = 'ocean';
  } else {
    type = resolved.type;
    name = resolved.name;
    kingdomTile = resolved.tile;
    biome = resolved.tile.biome;
    settlement = resolved.settlement;
  }

  const rng = mulberry32(cyrb128(seedPhrase + key));

  const collidables: AABB[] = [];
  const interactables: Interactable[] = [];
  const collectedGems = new Set<number>(chunkDeltas[key]?.gems || []);

  const { x: oX, z: oZ } = chunkToWorldOrigin(cx, cz);

  // Terrain height sampler — places objects on the heightmap surface
  const groundY = (wx: number, wz: number): number =>
    kingdomMap ? getTerrainHeight(kingdomMap, wx, wz) : 0;

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
      position: new THREE.Vector3(x, groundY(x, z), z),
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

    // Wilderness NPC spawning — frequency gated by region danger tier
    const region = getRegionAt(kingdomMap, cx, cz);
    const dangerTier = region?.dangerTier ?? 0;
    // Higher danger = fewer NPCs: tier 0→0.82, tier 1→0.87, tier 2→0.92, tier 3→0.95, tier 4→0.98
    const spawnThreshold = 0.82 + dangerTier * 0.04;

    if (rng() > spawnThreshold) {
      const npcX = oX + 20 + rng() * (CHUNK_SIZE - 40);
      const npcZ = oZ + 20 + rng() * (CHUNK_SIZE - 40);

      // Pick a wilderness NPC archetype (weighted toward wanderers and pilgrims)
      const wildernessArchetypes = [
        'wanderer',
        'wanderer',
        'wanderer',
        'pilgrim',
        'merchant',
        'farmer',
      ];
      const archetype =
        wildernessArchetypes[Math.floor(rng() * wildernessArchetypes.length)];
      const pool = getNPCPool(archetype);

      if (pool) {
        const npcSeed = `wild:${cx},${cz}`;
        const blueprint = generateNPCFromPool(pool, npcSeed);

        const npcType = (
          ['blacksmith', 'innkeeper', 'merchant', 'wanderer'].includes(
            archetype,
          )
            ? archetype
            : 'wanderer'
        ) as Interactable['type'];

        const greeting =
          blueprint.dialogue?.greeting?.[0] ?? 'Well met, traveller.';

        const interactable: Interactable = {
          id: `${key}-wild-npc`,
          position: new THREE.Vector3(npcX, groundY(npcX, npcZ), npcZ),
          radius: 4.0,
          type: npcType,
          name: blueprint.name ?? 'Wanderer',
          dialogueText: greeting,
          actionVerb: blueprint.behavior?.interactionVerb ?? 'TALK',
        };

        interactables.push(interactable);
        // Store as npcBlueprint below (we'll attach it after the town section)
      } else {
        // Fallback to legacy wanderer
        addInteractable(npcX, npcZ, 'wanderer');
      }
    }
  }

  // Config-driven town: use settlement from kingdom map
  let placedBuildings: PlacedBuildingData[] | undefined;
  let npcBlueprints: PlacedNPCData[] | undefined;

  const townConfig = settlement
    ? getTownConfigBySettlement(settlement)
    : undefined;

  if (townConfig && type === 'TOWN') {
    const { x: oXTown, z: oZTown } = chunkToWorldOrigin(cx, cz);
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
        const bldg = placedBuildings.find(
          (b) => b.label === npcPlacement.building,
        );
        if (bldg) {
          // Place NPC just outside the building's front
          npcX = bldg.worldX;
          npcZ =
            bldg.worldZ + (bldg.archetype.footprint.depth * BLOCK_SIZE) / 2 + 2;
        }
      } else if (npcPlacement.position) {
        npcX = oXTown + npcPlacement.position[0] * BLOCK_SIZE;
        npcZ = oZTown + npcPlacement.position[1] * BLOCK_SIZE;
      }

      const npcType = (
        ['blacksmith', 'innkeeper', 'merchant', 'wanderer'].includes(
          npcPlacement.archetype,
        )
          ? npcPlacement.archetype
          : 'wanderer'
      ) as Interactable['type'];

      const greeting =
        blueprint.dialogue?.greeting?.[0] ?? 'Well met, traveller.';

      const interactable: Interactable = {
        id: `${key}-bp-${npcPlacement.id}`,
        position: new THREE.Vector3(npcX, groundY(npcX, npcZ), npcZ),
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

  // Look up pre-placed features from the kingdom map feature index
  let placedFeatures: PlacedFeatureData[] | undefined;
  if (featureIndex) {
    const gridKey = `${cx},${cz}`;
    const features = featureIndex.get(gridKey);
    if (features && features.length > 0) {
      placedFeatures = features.map((f) => {
        // Place feature within the chunk using a seeded sub-position
        const featureRng = mulberry32(cyrb128(`${seedPhrase}:fpos:${f.id}`));
        const margin = CHUNK_SIZE * 0.1;
        const wx = oX + margin + featureRng() * (CHUNK_SIZE - 2 * margin);
        const wz = oZ + margin + featureRng() * (CHUNK_SIZE - 2 * margin);

        return {
          id: f.id,
          definition: f.definition,
          worldPosition: [wx, groundY(wx, wz), wz] as [number, number, number],
          rotation: f.rotation,
        };
      });

      // Add interactables for interactable features
      for (const pf of placedFeatures) {
        if (pf.definition.interactable) {
          const interactable: Interactable = {
            id: pf.id,
            position: new THREE.Vector3(
              pf.worldPosition[0],
              groundY(pf.worldPosition[0], pf.worldPosition[2]),
              pf.worldPosition[2],
            ),
            radius: pf.definition.tier === 'major' ? 6 : 4,
            type: 'wanderer',
            name: pf.definition.name,
            dialogueText:
              pf.definition.dialogueOnInteract ?? pf.definition.description,
            actionVerb: 'EXAMINE',
          };
          interactables.push(interactable);
        }
      }
    }
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
    kingdomTile,
    biome,
    placedFeatures,
  };
}

export function ChunkManager() {
  const { seedPhrase } = useSeed();
  const { activeChunks, chunkDeltas } = useChunkState();
  const { gameActive } = useFlags();
  const kingdomMap = useWorldSession().kingdomMap;
  const featureIndex = useWorldSession().featureIndex;

  const lastChunkKey = useRef('');
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update chunks based on player position
  useFrame(() => {
    if (!gameActive || !seedPhrase || !kingdomMap) return;

    const { playerPosition } = getPlayer();
    const { cx: currentCx, cz: currentCz } = worldToChunk(
      playerPosition.x,
      playerPosition.z,
    );
    const newKey = `${currentCx},${currentCz}`;

    // Update location banner when entering new chunk
    if (lastChunkKey.current !== newKey) {
      lastChunkKey.current = newKey;

      const resolved = getChunkTypeFromKingdom(
        kingdomMap,
        currentCx,
        currentCz,
      );
      setCurrentChunk(
        newKey,
        resolved?.name ?? 'The Ocean',
        resolved?.type ?? 'WILD',
      );
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
            kingdomMap,
            featureIndex.size > 0 ? featureIndex : undefined,
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
