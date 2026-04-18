import {
  CuboidCollider,
  HeightfieldCollider,
  RigidBody,
} from '@react-three/rapier';
import { useMemo } from 'react';
import { BiomeService } from '@/biome';
import { composeRuins } from '@/composition/ruins';
import { composeVegetation } from '@/composition/vegetation';
import { composeStoryProps } from '@/composition/story-props';
import { composeDungeonRoom } from '@/composition/dungeon-kit';
import type { DungeonKitRoom } from '@/composition/dungeon-kit';
import type { TownConfig } from '@/composition/ruins';
import type { HeightSampler } from '@/composition/vegetation';
import { useWorldSession } from '@/ecs/hooks/useWorldSession';
import type { ChunkData } from '@/types/game';
import { getTerrainHeight, CHUNK_SIZE, BLOCK_SIZE } from '@/utils/worldGen';
import { Building } from './Building';
import { CompositionLayer } from './CompositionLayer';
import { Feature } from './Feature';
import { NPC } from './NPC';
import { Relic } from './Relic';
import { RoadSurface } from './RoadSurface';
import { TerrainChunk } from './terrain/TerrainChunk';

interface ChunkProps {
  chunkData: ChunkData;
  seedPhrase: string;
}

export function Chunk({ chunkData, seedPhrase }: ChunkProps) {
  const { cx, cz, key, type, placedBuildings, npcBlueprints } = chunkData;

  const hasConfigTown = type === 'TOWN' && placedBuildings !== undefined;
  const hasPlacedBuildings =
    hasConfigTown && (placedBuildings?.length ?? 0) > 0;

  const oX = cx * CHUNK_SIZE;
  const oZ = cz * CHUNK_SIZE;

  const { kingdomMap } = useWorldSession();

  // Resolve full BiomeConfig when biome id is present — needed by compositors.
  const biomeConfig = useMemo(() => {
    if (!chunkData.biome) return null;
    try {
      return BiomeService.getBiomeById(chunkData.biome);
    } catch {
      return null;
    }
  }, [chunkData.biome]);

  // Height sampler for vegetation — threads terrain elevation into placement Y.
  const heightSampler = useMemo<HeightSampler | undefined>(() => {
    if (!kingdomMap) return undefined;
    return (wx: number, wz: number) => getTerrainHeight(kingdomMap, wx, wz);
  }, [kingdomMap]);

  // Composition output — pure data, no Three.js.
  const placements = useMemo(() => {
    if (type === 'WILD' || type === 'ROAD') {
      const vegPlacements = biomeConfig
        ? composeVegetation(biomeConfig, cx, cz, heightSampler ?? (() => 0), seedPhrase)
        : [];

      // Story props along the road spine (road distance ≈ world Z).
      const storyPlacements =
        biomeConfig && (type === 'WILD' || type === 'ROAD')
          ? composeStoryProps(biomeConfig.id, [oZ, oZ + CHUNK_SIZE], seedPhrase)
          : [];

      return [...vegPlacements, ...storyPlacements];
    }

    if (type === 'TOWN' && hasConfigTown) {
      const townConfig: TownConfig = {
        id: key,
        center: { x: oX + CHUNK_SIZE / 2, y: 0, z: oZ + CHUNK_SIZE / 2 },
        radius: CHUNK_SIZE / 2,
      };
      return biomeConfig
        ? composeRuins(biomeConfig, townConfig, seedPhrase)
        : [];
    }

    if (type === 'DUNGEON') {
      // Synthesise a DungeonKitRoom spanning the full chunk interior.
      const room: DungeonKitRoom = {
        id: key,
        type: 'chamber',
        center: { x: oX + CHUNK_SIZE / 2, y: 0, z: oZ + CHUNK_SIZE / 2 },
        width: CHUNK_SIZE * 0.8,
        depth: CHUNK_SIZE * 0.8,
        exits: ['north', 'south'],
      };
      return composeDungeonRoom(room, seedPhrase);
    }

    return [];
  }, [
    type,
    biomeConfig,
    cx,
    cz,
    key,
    oX,
    oZ,
    seedPhrase,
    hasConfigTown,
    heightSampler,
  ]);

  // Gem collectibles from chunk collidables — kept from original.
  const gems = useMemo(() => {
    if (type !== 'DUNGEON') return [];
    return chunkData.collectedGems
      ? Array.from(chunkData.collectedGems).map((id) => ({ id, x: oX + CHUNK_SIZE / 2, y: 1, z: oZ + CHUNK_SIZE / 2 }))
      : [];
  }, [type, chunkData.collectedGems, oX, oZ]);

  const isOcean =
    chunkData.kingdomTile != null && !chunkData.kingdomTile.isLand;

  if (isOcean) return null;

  if (type === 'TOWN' && !hasConfigTown) {
    throw new Error(
      `Chunk ${key} has type=TOWN but no town config resolved from ` +
        `getTownConfig(). Add a JSON file under src/content/towns/ or fix ` +
        `the chunk classification.`,
    );
  }

  const groundY = chunkData.kingdomTile
    ? chunkData.kingdomTile.elevation * 20
    : 0;

  return (
    <group>
      {/* Ground — TerrainChunk when biome config is available, flat plane otherwise */}
      {biomeConfig ? (
        <TerrainChunk
          biomeConfig={biomeConfig}
          seed={seedPhrase}
          cx={cx}
          cz={cz}
        />
      ) : (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider
            args={[CHUNK_SIZE / 2, 0.1, CHUNK_SIZE / 2]}
            position={[oX + CHUNK_SIZE / 2, groundY - 0.1, oZ + CHUNK_SIZE / 2]}
          />
        </RigidBody>
      )}

      {/* Road surface overlay */}
      {kingdomMap && chunkData.kingdomTile?.hasRoad && (
        <RoadSurface
          oX={oX}
          oZ={oZ}
          kingdomTile={chunkData.kingdomTile}
          kingdomMap={kingdomMap}
        />
      )}

      {/* Composition output — vegetation, ruins, story props, or dungeon kit */}
      <CompositionLayer placements={placements} />

      {/* Config-driven buildings */}
      {hasPlacedBuildings &&
        placedBuildings?.map((b) => (
          <Building
            key={`bldg-${b.label}`}
            archetype={b.archetype}
            position={[b.worldX, 0, b.worldZ]}
            rotation={b.rotation}
            label={b.label}
          />
        ))}

      {/* NPCs */}
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

      {/* Collectible gems */}
      {gems.map((gem) => (
        <Relic
          key={`${key}-gem-${gem.id}`}
          chunkKey={key}
          gemId={gem.id}
          position={[gem.x, gem.y, gem.z]}
          collected={chunkData.collectedGems?.has(gem.id) ?? false}
        />
      ))}

      {/* Static obstacle colliders */}
      <RigidBody type="fixed" colliders={false}>
        {chunkData.collidables.map((aabb) => {
          const w = (aabb.maxX - aabb.minX) / 2;
          const d = (aabb.maxZ - aabb.minZ) / 2;
          const h = BLOCK_SIZE;
          const ccx = (aabb.minX + aabb.maxX) / 2;
          const ccz = (aabb.minZ + aabb.maxZ) / 2;
          return (
            <CuboidCollider
              key={`${ccx.toFixed(1)},${ccz.toFixed(1)}`}
              args={[w, h, d]}
              position={[ccx, h, ccz]}
            />
          );
        })}
      </RigidBody>
    </group>
  );
}
