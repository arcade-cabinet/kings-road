import {
  CuboidCollider,
  RigidBody,
} from '@react-three/rapier';
import { useMemo } from 'react';
import { BiomeService } from '@/biome';
import { composeRuins } from '@/composition/ruins';
import { composeVegetation } from '@/composition/vegetation';
import { composeStoryProps } from '@/composition/story-props';
import { composeDungeonRoom } from '@/composition/dungeon-kit';
import { composeBuilding, composeTownLayout } from '@/composition/village';
import type { DungeonKitRoom } from '@/composition/dungeon-kit';
import type { TownConfig } from '@/composition/ruins';
import type {
  BuildingPlacement,
  VillageTownConfig,
} from '@/composition/village';
import type { HeightSampler } from '@/composition/vegetation';
import { useWorldSession } from '@/ecs/hooks/useWorldSession';
import type { ChunkData } from '@/types/game';
import { getTerrainHeight, CHUNK_SIZE, BLOCK_SIZE, MAX_TERRAIN_HEIGHT } from '@/utils/worldGen';
import { createRng, cyrb128, mulberry32 } from '@/core';
import { Building } from './Building';
import { CompositionLayer } from './CompositionLayer';
import { Feature } from './Feature';
import { NPC } from './NPC';
import { Relic } from './Relic';
import { RoadSurface } from './RoadSurface';
import { TerrainChunk } from './terrain/TerrainChunk';

const GEM_COUNT_PER_DUNGEON_CHUNK = 3;

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

  const biomeConfig = useMemo(() => {
    if (!chunkData.biome) return null;
    return BiomeService.resolveForChunk(chunkData.biome);
  }, [chunkData.biome]);

  const heightSampler = useMemo<HeightSampler>(() => {
    if (kingdomMap) return (wx: number, wz: number) => getTerrainHeight(kingdomMap, wx, wz);
    // Fallback: approximate ground Y from tile elevation so vegetation doesn't float.
    const fallbackY = chunkData.kingdomTile
      ? chunkData.kingdomTile.elevation * MAX_TERRAIN_HEIGHT
      : 0;
    return () => fallbackY;
  }, [kingdomMap, chunkData.kingdomTile]);

  const placements = useMemo(() => {
    if (type === 'WILD' || type === 'ROAD') {
      const vegPlacements = biomeConfig
        ? composeVegetation(biomeConfig, cx, cz, heightSampler, seedPhrase)
        : [];

      const storyPlacements = biomeConfig
        ? composeStoryProps(biomeConfig.id, [oZ, oZ + CHUNK_SIZE], seedPhrase).map((p) => ({
            ...p,
            position: { ...p.position, x: p.position.x + oX },
          }))
        : [];

      return [...vegPlacements, ...storyPlacements];
    }

    if (type === 'TOWN' && hasConfigTown) {
      const townCenter = { x: oX + CHUNK_SIZE / 2, z: oZ + CHUNK_SIZE / 2 };
      const isThornfield = biomeConfig?.id === 'thornfield';

      if (isThornfield) {
        // Thornfield is "dead forest wrapped around ruins" — keep the
        // existing ruins + overgrown foliage path. No procedural village.
        const townConfig: TownConfig = {
          id: key,
          center: { x: townCenter.x, y: 0, z: townCenter.z },
          radius: CHUNK_SIZE / 2,
        };
        const ruinPlacements = biomeConfig
          ? composeRuins(biomeConfig, townConfig, seedPhrase)
          : [];
        const townVegPlacements = biomeConfig
          ? composeVegetation(biomeConfig, cx, cz, heightSampler, seedPhrase, {
              clearCenter: townCenter,
              clearRadius: 30,
            })
          : [];
        return [...ruinPlacements, ...townVegPlacements];
      }

      // Other biomes: Phase B procedural village from authored parts.
      const villageConfig: VillageTownConfig = {
        id: key,
        center: townCenter,
        radius: CHUNK_SIZE / 2,
        roles: [
          'landmark',
          'tavern',
          'house',
          'house',
          'barn',
          'house',
          'house',
          'house',
        ],
      };
      const layoutRng = createRng(`village-layout:${key}:${seedPhrase}`);
      const slots = composeTownLayout(villageConfig, layoutRng);
      const villagePlacements: BuildingPlacement[] = slots.flatMap((slot, slotIndex) => {
        // Use slotIndex + full-precision coords to keep the seed unique even
        // when two slots happen to quantize to the same 0.01m cell.
        const buildingRng = createRng(
          `village-building:${slotIndex}:${slot.position.x}:${slot.position.z}:${slot.rotationY}:${seedPhrase}`,
        );
        return composeBuilding(slot.footprint, buildingRng).map((p) => ({
          ...p,
          position: {
            x: p.position.x + slot.position.x,
            y: p.position.y + slot.position.y,
            z: p.position.z + slot.position.z,
          },
          rotation: p.rotation + slot.rotationY,
        }));
      });
      const townVegPlacements = biomeConfig
        ? composeVegetation(biomeConfig, cx, cz, heightSampler, seedPhrase, {
            clearCenter: townCenter,
            clearRadius: 30,
          })
        : [];
      return [...villagePlacements, ...townVegPlacements];
    }

    if (type === 'DUNGEON') {
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
  }, [type, biomeConfig, cx, cz, key, oX, oZ, seedPhrase, hasConfigTown, heightSampler]);

  // Seeded deterministic gem positions — collectedGems is the collected set, not spawn list.
  const gems = useMemo(() => {
    if (type !== 'DUNGEON') return [];
    const rng = mulberry32(cyrb128(`gems:${key}`));
    return Array.from({ length: GEM_COUNT_PER_DUNGEON_CHUNK }, (_, i) => ({
      id: `${key}-gem-${i}`,
      index: i,
      x: oX + CHUNK_SIZE * 0.2 + rng() * CHUNK_SIZE * 0.6,
      y: 1,
      z: oZ + CHUNK_SIZE * 0.2 + rng() * CHUNK_SIZE * 0.6,
    }));
  }, [type, key, oX, oZ]);

  const isOcean = chunkData.kingdomTile != null && !chunkData.kingdomTile.isLand;
  if (isOcean) return null;

  if (type === 'TOWN' && !hasConfigTown) {
    throw new Error(
      `Chunk ${key} has type=TOWN but no town config resolved from ` +
        `getTownConfig(). Add a JSON file under src/content/towns/ or fix ` +
        `the chunk classification.`,
    );
  }

  const groundY = chunkData.kingdomTile
    ? chunkData.kingdomTile.elevation * MAX_TERRAIN_HEIGHT
    : 0;

  return (
    <group>
      {/* Ground — TerrainChunk for land biomes, flat collider otherwise.
          Ocean chunks skip terrain entirely: OceanPlane (rendered once at
          the scene root) provides the global Gerstner water surface, and
          the flat collider prevents the player from falling through where
          ocean tiles border land. */}
      {biomeConfig && biomeConfig.id !== 'ocean' ? (
        <TerrainChunk biomeConfig={biomeConfig} seed={seedPhrase} cx={cx} cz={cz} />
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

      {/* Collectible gems — seeded positions, collected flag from save state */}
      {gems.map((gem) => (
        <Relic
          key={gem.id}
          chunkKey={key}
          gemId={gem.index}
          position={[gem.x, gem.y, gem.z]}
          collected={chunkData.collectedGems?.has(gem.index) ?? false}
        />
      ))}

      {/* Static obstacle colliders — skip for DUNGEON (kit compositor owns geometry) */}
      {type !== 'DUNGEON' && (
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
      )}
    </group>
  );
}
