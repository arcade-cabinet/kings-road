/**
 * DungeonEntrySystem — spawns dungeon entrance interactables near
 * settlements that have dungeons, and handles the transition into
 * dungeon mode when the player interacts with one.
 *
 * Matching strategy: road spine anchors link anchorId to
 * mainQuestChapter. Kingdom map settlements also have
 * mainQuestChapter. Dungeons have anchorId. We chain:
 *   dungeon.anchorId -> roadSpine.anchor.mainQuestChapter
 *     -> settlement.mainQuestChapter -> settlement.position
 *
 * Detection strategy: when dialogue opens for a dungeon entrance NPC
 * (identified by its interactable id prefix `dungeon-entrance-`), we
 * intercept it, close the dialogue, and transition into the dungeon.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { isContentStoreReady } from '@/db/content-queries';
import type { DungeonLayout } from '@/schemas/dungeon.schema';
import type { Settlement } from '@/schemas/kingdom.schema';
import { type ActiveDungeon, useGameStore } from '@/stores/gameStore';
import { useWorldSession } from '@/ecs/hooks/useWorldSession';
import {
  clearWorld,
  generateWorld,
  getFeaturesAt,
  getTileAtGrid,
  getTileAtWorld,
  getWorldState,
  setWorldState,
} from '@/ecs/actions/world';
import type { Interactable } from '@/types/game';
import { CHUNK_SIZE } from '@/utils/worldGen';
import {
  DUNGEON_DEPTH,
  generateDungeonLayout,
} from '@/world/dungeon-generator';
import { getAllDungeons } from '@/world/dungeon-registry';
import { getAnchorById } from '@/world/road-spine';

const PLAYER_EYE_HEIGHT = 1.6;
const ENTRANCE_INTERACTION_RADIUS = 6;
const DUNGEON_ENTRANCE_PREFIX = 'dungeon-entrance-';

interface DungeonEntrance {
  layout: DungeonLayout;
  interactable: Interactable;
  worldPosition: THREE.Vector3;
}

/**
 * Convert a settlement's grid position to a world-space center point.
 */
function settlementToWorld(settlement: Settlement): THREE.Vector3 {
  const [gx, gz] = settlement.position;
  return new THREE.Vector3(
    gx * CHUNK_SIZE + CHUNK_SIZE / 2,
    0,
    gz * CHUNK_SIZE + CHUNK_SIZE / 2,
  );
}

/**
 * Find the kingdom map settlement associated with a dungeon via the road spine.
 */
function findSettlementForDungeon(
  layout: DungeonLayout,
  settlements: Settlement[],
): Settlement | undefined {
  // Chain: dungeon.anchorId -> road spine anchor -> mainQuestChapter -> settlement
  const anchor = getAnchorById(layout.anchorId);
  if (!anchor?.mainQuestChapter) return undefined;

  return settlements.find(
    (s) => s.mainQuestChapter === anchor.mainQuestChapter,
  );
}

/**
 * DungeonEntrySystem — should be rendered as a child of Physics in
 * the overworld scene. Registers dungeon entrance interactables and
 * handles entry transitions.
 */
export function DungeonEntrySystem() {
  const gameActive = useGameStore((s) => s.gameActive);
  const inDungeon = useGameStore((s) => s.inDungeon);
  const kingdomMap = useWorldSession().kingdomMap;

  const registeredRef = useRef(false);
  const entrancesRef = useRef<DungeonEntrance[]>([]);
  const interactablesRef = useRef<Interactable[]>([]);
  const prevInDungeonRef = useRef(false);

  // Reset registration when exiting a dungeon so entrances get re-added
  useEffect(() => {
    if (prevInDungeonRef.current && !inDungeon) {
      registeredRef.current = false;
    }
    prevInDungeonRef.current = inDungeon;
  }, [inDungeon]);

  // Register dungeon entrance interactables once content and kingdom map are ready
  useEffect(() => {
    if (!gameActive || registeredRef.current || !kingdomMap) return;
    if (!isContentStoreReady()) return;

    const dungeons = getAllDungeons();
    if (dungeons.length === 0) return;

    const entrances: DungeonEntrance[] = [];
    const newInteractables: Interactable[] = [];

    for (const layout of dungeons) {
      const settlement = findSettlementForDungeon(
        layout,
        kingdomMap.settlements,
      );
      if (!settlement) continue;

      // Place entrance offset from settlement center (northeast)
      const center = settlementToWorld(settlement);
      const wx = center.x + 15;
      const wz = center.z + 15;
      const pos = new THREE.Vector3(wx, 0, wz);

      const interactable: Interactable = {
        id: `${DUNGEON_ENTRANCE_PREFIX}${layout.id}`,
        position: pos,
        radius: ENTRANCE_INTERACTION_RADIUS,
        type: 'wanderer',
        name: layout.name,
        dialogueText: `${layout.description} (Level ${layout.recommendedLevel})`,
        actionVerb: 'ENTER',
      };

      entrances.push({ layout, interactable, worldPosition: pos });
      newInteractables.push(interactable);
    }

    if (newInteractables.length > 0) {
      const { addGlobalInteractables } = useGameStore.getState();
      addGlobalInteractables(newInteractables);
      entrancesRef.current = entrances;
      interactablesRef.current = newInteractables;
      registeredRef.current = true;
    }

    return () => {
      if (interactablesRef.current.length > 0) {
        const { removeGlobalInteractables } = useGameStore.getState();
        removeGlobalInteractables(interactablesRef.current);
        entrancesRef.current = [];
        interactablesRef.current = [];
        registeredRef.current = false;
      }
    };
  }, [gameActive, kingdomMap]);

  // Per-frame: detect when dialogue opens for a dungeon entrance and redirect
  useFrame(() => {
    if (!gameActive || inDungeon) return;

    const state = useGameStore.getState();
    if (!state.inDialogue) return;

    // Check if the current interactable is a dungeon entrance
    const current = state.currentInteractable;
    if (!current || !current.id.startsWith(DUNGEON_ENTRANCE_PREFIX)) return;

    // Find the matching entrance
    const entrance = entrancesRef.current.find(
      (e) => e.interactable.id === current.id,
    );
    if (!entrance) return;

    // Close dialogue and enter dungeon
    state.closeDialogue();
    transitionIntoDungeon(entrance);
  });

  // Render stone archway meshes at each entrance position (overworld only)
  if (inDungeon || entrancesRef.current.length === 0) return null;

  return (
    <>
      {entrancesRef.current.map((entrance) => (
        <DungeonEntranceMesh
          key={entrance.layout.id}
          position={entrance.worldPosition}
        />
      ))}
    </>
  );
}

// ── Dungeon transition ───────────────────────────────────────────────

/**
 * Generate dungeon layout and transition the player into it.
 */
function transitionIntoDungeon(entrance: DungeonEntrance) {
  const state = useGameStore.getState();

  // Generate spatial layout from the dungeon definition
  const spatial = generateDungeonLayout(entrance.layout);

  // Find the entrance room
  const entranceRoom = spatial.roomById.get(entrance.layout.entranceRoomId);
  if (!entranceRoom) {
    console.warn(
      `[DungeonEntrySystem] Entrance room '${entrance.layout.entranceRoomId}' not found in dungeon '${entrance.layout.id}'`,
    );
    return;
  }

  const entranceIndex = spatial.rooms.indexOf(entranceRoom);

  // Build active dungeon state
  const activeDungeon: ActiveDungeon = {
    id: entrance.layout.id,
    name: entrance.layout.name,
    spatial,
    currentRoomIndex: entranceIndex,
    overworldPosition: state.playerPosition.clone(),
    overworldYaw: state.cameraYaw,
  };

  // Teleport player to the entrance room center
  const dungeonPos = new THREE.Vector3(
    entranceRoom.worldX,
    DUNGEON_DEPTH + PLAYER_EYE_HEIGHT,
    entranceRoom.worldZ,
  );

  state.setPlayerPosition(dungeonPos);
  state.setCameraYaw(Math.PI); // Face north (into the dungeon)
  state.enterDungeon(activeDungeon);
}

// ── Overworld entrance visual — stone archway ────────────────────────

const archMaterial = new THREE.MeshStandardMaterial({
  color: 0x6a6a5e,
  roughness: 0.9,
  metalness: 0.05,
});

const darkInteriorMaterial = new THREE.MeshBasicMaterial({
  color: 0x111111,
});

function DungeonEntranceMesh({ position }: { position: THREE.Vector3 }) {
  const archWidth = 3;
  const archHeight = 4;
  const pillarWidth = 0.8;
  const pillarDepth = 0.8;
  const lintelHeight = 0.5;

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Left pillar */}
      <mesh
        position={[-(archWidth / 2 + pillarWidth / 2), archHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[pillarWidth, archHeight, pillarDepth]} />
        <primitive object={archMaterial} attach="material" />
      </mesh>
      {/* Right pillar */}
      <mesh
        position={[archWidth / 2 + pillarWidth / 2, archHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[pillarWidth, archHeight, pillarDepth]} />
        <primitive object={archMaterial} attach="material" />
      </mesh>
      {/* Lintel */}
      <mesh
        position={[0, archHeight + lintelHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[archWidth + pillarWidth * 2, lintelHeight, pillarDepth]}
        />
        <primitive object={archMaterial} attach="material" />
      </mesh>
      {/* Dark interior plane */}
      <mesh position={[0, archHeight / 2, -pillarDepth / 2 + 0.01]}>
        <planeGeometry args={[archWidth, archHeight]} />
        <primitive object={darkInteriorMaterial} attach="material" />
      </mesh>
      {/* Capstone decoration */}
      <mesh position={[0, archHeight + lintelHeight + 0.3, 0]}>
        <boxGeometry args={[1.5, 0.6, pillarDepth * 0.8]} />
        <primitive object={archMaterial} attach="material" />
      </mesh>
    </group>
  );
}
