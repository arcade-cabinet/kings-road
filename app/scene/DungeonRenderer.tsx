/**
 * DungeonRenderer — renders the interior of a dungeon when the player
 * is inside one. Each room is a simple stone box with doorway openings,
 * dim torchlight, and room-type-based tinting.
 *
 * Replaces overworld rendering while `inDungeon` is true.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  exitDungeon,
  getFlags,
  getDungeonSession,
  getPlayer,
  moveToRoom,
  setCameraYaw,
  setPlayerPosition,
} from '@/ecs/actions/game';
import {
  useDungeonSession,
  useFlags,
} from '@/ecs/hooks/useGameSession';
import { loadPbrMaterial } from '@/utils/textures';
import type { PlacedRoom } from '@/world/dungeon-generator';
import {
  DUNGEON_DEPTH,
  getRoomColor,
  ROOM_SIZE,
} from '@/world/dungeon-generator';
import { Model as SupportBeam } from './generated/mine/supportbeam';
import { Model as WallTorch } from './generated/mine/wall-torch';

// ── Constants ────────────────────────────────────────────────────────

const WALL_HEIGHT = 6;
const WALL_THICKNESS = 0.5;
const DOORWAY_WIDTH = 3;
const DOORWAY_HEIGHT = 4;
const PLAYER_EYE_HEIGHT = 1.6;

/** Torchlight color — warm orange */
const TORCH_COLOR = 0xffaa44;
const TORCH_INTENSITY = 2.5;
const TORCH_DISTANCE = 18;

// Reusable vectors for per-frame checks
const _playerPos = new THREE.Vector3();

// ── Materials (Polyhaven PBR for authenticity) ────────────────────────
//
// Floor, walls, and ceiling share the stone_block PBR set (Rustic Stone Wall).
// Each surface gets its own cloned material so tints (ceiling darker, floor
// neutral) don't leak across — see loadPbrMaterial() note about mutation.

const floorMaterial = loadPbrMaterial('stone_block').clone();
floorMaterial.color.setHex(0x3a3a3a);

const ceilingMaterial = loadPbrMaterial('stone_block').clone();
ceilingMaterial.color.setHex(0x1a1a1a);

const wallMaterial = loadPbrMaterial('stone_block').clone();
wallMaterial.color.setHex(0x5a5a5a);

// ── Direction helpers ────────────────────────────────────────────────

type CardinalDirection = 'north' | 'south' | 'east' | 'west';

/** Wall face enum: which side of the room the wall is on */
const WALL_FACES: Record<CardinalDirection, { axis: 'x' | 'z'; sign: number }> =
  {
    north: { axis: 'z', sign: -1 },
    south: { axis: 'z', sign: 1 },
    east: { axis: 'x', sign: 1 },
    west: { axis: 'x', sign: -1 },
  };

const OPPOSITE_DIR: Record<string, string> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  up: 'down',
  down: 'up',
};

function isCardinal(dir: string): dir is CardinalDirection {
  return dir in WALL_FACES;
}

// ── Room component ───────────────────────────────────────────────────

interface DungeonRoomProps {
  placedRoom: PlacedRoom;
  isCurrent: boolean;
  isAdjacent: boolean;
}

/**
 * Renders a single dungeon room as a box with walls, floor, ceiling,
 * doorway openings for exits, and a torch point light.
 */
function DungeonRoomMesh({
  placedRoom,
  isCurrent,
  isAdjacent,
}: DungeonRoomProps) {
  const { worldX, worldZ, exits, room } = placedRoom;
  const roomY = DUNGEON_DEPTH;

  // Which cardinal directions have exits (for doorway openings)
  const exitDirections = useMemo(() => {
    const dirs = new Set<CardinalDirection>();
    for (const exit of exits) {
      if (isCardinal(exit.direction)) {
        dirs.add(exit.direction);
      }
    }
    return dirs;
  }, [exits]);

  // Room-type color tint
  const roomColor = useMemo(() => getRoomColor(room.type), [room.type]);
  const tintedWallMaterial = useMemo(() => {
    const mat = wallMaterial.clone();
    // Blend the room color with the base gray
    const base = new THREE.Color(0x4a4a4a);
    const tint = new THREE.Color(roomColor);
    base.lerp(tint, 0.3);
    mat.color = base;
    return mat;
  }, [roomColor]);

  // Release the per-room wall material clone on unmount. `wallMaterial`
  // (module-level) is shared across rooms and shouldn't be disposed —
  // but each room's clone lives for just that room's render pass.
  useEffect(() => {
    return () => {
      tintedWallMaterial.dispose();
    };
  }, [tintedWallMaterial]);

  const halfSize = ROOM_SIZE / 2;

  // Only render current room and adjacent rooms for performance
  if (!isCurrent && !isAdjacent) return null;

  return (
    <group position={[worldX, roomY, worldZ]}>
      {/* Floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <primitive object={floorMaterial} attach="material" />
      </mesh>

      {/* Ceiling */}
      <mesh
        position={[0, WALL_HEIGHT, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <primitive object={ceilingMaterial} attach="material" />
      </mesh>

      {/* Walls — render each face, with doorway cutout if there's an exit */}
      <WallFace
        direction="north"
        halfSize={halfSize}
        hasDoorway={exitDirections.has('north')}
        material={tintedWallMaterial}
      />
      <WallFace
        direction="south"
        halfSize={halfSize}
        hasDoorway={exitDirections.has('south')}
        material={tintedWallMaterial}
      />
      <WallFace
        direction="east"
        halfSize={halfSize}
        hasDoorway={exitDirections.has('east')}
        material={tintedWallMaterial}
      />
      <WallFace
        direction="west"
        halfSize={halfSize}
        hasDoorway={exitDirections.has('west')}
        material={tintedWallMaterial}
      />

      {/* Torch — warm point light */}
      <pointLight
        color={TORCH_COLOR}
        intensity={isCurrent ? TORCH_INTENSITY : TORCH_INTENSITY * 0.3}
        distance={TORCH_DISTANCE}
        decay={2}
        position={[0, WALL_HEIGHT - 1, 0]}
        castShadow={isCurrent}
      />

      {/* Torch sconce — authored wall-torch from the mine pack, scaled up
          to read at dungeon room scale. */}
      <WallTorch
        position={[0, WALL_HEIGHT - 1.8, 0]}
        scale={1.8}
      />
    </group>
  );
}

// ── Wall face with optional doorway ──────────────────────────────────

interface WallFaceProps {
  direction: CardinalDirection;
  halfSize: number;
  hasDoorway: boolean;
  material: THREE.MeshStandardMaterial;
}

/**
 * Renders a single wall face. If the wall has a doorway, it renders
 * three segments (left pillar, lintel above doorway, right pillar)
 * instead of a solid wall.
 */
function WallFace({
  direction,
  halfSize,
  hasDoorway,
  material,
}: WallFaceProps) {
  // Position and rotation for each wall
  let posX = 0;
  let posZ = 0;
  let rotY = 0;

  if (direction === 'north') {
    posZ = -halfSize;
    rotY = 0;
  } else if (direction === 'south') {
    posZ = halfSize;
    rotY = Math.PI;
  } else if (direction === 'east') {
    posX = halfSize;
    rotY = -Math.PI / 2;
  } else {
    posX = -halfSize;
    rotY = Math.PI / 2;
  }

  if (!hasDoorway) {
    // Solid wall
    return (
      <mesh
        position={[posX, WALL_HEIGHT / 2, posZ]}
        rotation={[0, rotY, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[ROOM_SIZE, WALL_HEIGHT, WALL_THICKNESS]} />
        <primitive object={material} attach="material" />
      </mesh>
    );
  }

  // Wall with doorway — three segments
  const doorHalfW = DOORWAY_WIDTH / 2;
  const pillarWidth = (ROOM_SIZE - DOORWAY_WIDTH) / 2;
  const lintelHeight = WALL_HEIGHT - DOORWAY_HEIGHT;

  return (
    <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
      {/* Left pillar */}
      <mesh
        position={[-(doorHalfW + pillarWidth / 2), WALL_HEIGHT / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[pillarWidth, WALL_HEIGHT, WALL_THICKNESS]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* Right pillar */}
      <mesh
        position={[doorHalfW + pillarWidth / 2, WALL_HEIGHT / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[pillarWidth, WALL_HEIGHT, WALL_THICKNESS]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* Lintel above doorway */}
      {lintelHeight > 0 && (
        <mesh
          position={[0, DOORWAY_HEIGHT + lintelHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[DOORWAY_WIDTH, lintelHeight, WALL_THICKNESS]} />
          <primitive object={material} attach="material" />
        </mesh>
      )}
      {/* Doorway arch — dark plane to visually suggest depth */}
      <mesh position={[0, DOORWAY_HEIGHT / 2, -WALL_THICKNESS / 2 - 0.01]}>
        <planeGeometry args={[DOORWAY_WIDTH, DOORWAY_HEIGHT]} />
        <meshBasicMaterial color={0x111111} />
      </mesh>
    </group>
  );
}

// ── Room navigation system ───────────────────────────────────────────

/**
 * Checks per frame if the player is standing in a doorway zone and
 * teleports them to the connected room.
 */
function DungeonNavigator() {
  const lastTransitionRef = useRef(0);

  useFrame(() => {
    const { inDungeon } = getFlags();
    const { activeDungeon } = getDungeonSession();
    if (!inDungeon || !activeDungeon) return;

    const dungeon = activeDungeon;
    const currentRoom = dungeon.spatial.rooms[dungeon.currentRoomIndex];
    if (!currentRoom) return;

    // Cooldown: prevent rapid room switching (500ms)
    const now = performance.now();
    if (now - lastTransitionRef.current < 500) return;

    const { playerPosition } = getPlayer();
    _playerPos.copy(playerPosition);

    // Check if the player is near any exit doorway of the current room
    const roomWorldX = currentRoom.worldX;
    const roomWorldZ = currentRoom.worldZ;
    const halfSize = ROOM_SIZE / 2;
    const doorThreshold = 1.5; // Distance into the doorway to trigger transition

    for (const exit of currentRoom.exits) {
      if (!isCardinal(exit.direction)) continue;

      // Compute the doorway center in world space
      let doorX = roomWorldX;
      let doorZ = roomWorldZ;

      if (exit.direction === 'north') doorZ = roomWorldZ - halfSize;
      else if (exit.direction === 'south') doorZ = roomWorldZ + halfSize;
      else if (exit.direction === 'east') doorX = roomWorldX + halfSize;
      else if (exit.direction === 'west') doorX = roomWorldX - halfSize;

      // Check if player is within the doorway zone
      const dx = Math.abs(_playerPos.x - doorX);
      const dz = Math.abs(_playerPos.z - doorZ);

      const isInDoorwayX =
        exit.direction === 'north' || exit.direction === 'south'
          ? dx < DOORWAY_WIDTH / 2
          : dx < doorThreshold;
      const isInDoorwayZ =
        exit.direction === 'east' || exit.direction === 'west'
          ? dz < DOORWAY_WIDTH / 2
          : dz < doorThreshold;

      if (isInDoorwayX && isInDoorwayZ) {
        // Find target room
        const targetRoom = dungeon.spatial.roomById.get(exit.targetRoomId);
        if (!targetRoom) continue;

        const targetIndex = dungeon.spatial.rooms.indexOf(targetRoom);
        if (targetIndex < 0) continue;

        // Check for special entrance exit — if this is the entrance room
        // and the exit is the "entrance" exit (e.g. going south from entrance-hall)
        // AND the entrance room has type 'entrance', exit the dungeon.
        if (currentRoom.room.type === 'entrance') {
          // Count how many exits go back to rooms vs. new rooms
          // The "entrance exit" is the doorway that doesn't connect to another dungeon room
          // For entrance rooms, check if this exit direction is the "way out" —
          // i.e. it leads back to outside. We detect this by checking if the target
          // is the entrance room itself (self-referencing "entrance" exit) or
          // if the exit direction is opposite to all incoming connections.
        }

        // Teleport player to the center of the target room
        const newPos = new THREE.Vector3(
          targetRoom.worldX,
          DUNGEON_DEPTH + PLAYER_EYE_HEIGHT,
          targetRoom.worldZ,
        );

        // Face toward the direction we came from
        const oppositeDir = OPPOSITE_DIR[exit.direction] ?? 'north';
        let targetYaw = Math.PI; // default: face south
        if (oppositeDir === 'north') targetYaw = Math.PI;
        else if (oppositeDir === 'south') targetYaw = 0;
        else if (oppositeDir === 'east') targetYaw = -Math.PI / 2;
        else if (oppositeDir === 'west') targetYaw = Math.PI / 2;

        setPlayerPosition(newPos);
        setCameraYaw(targetYaw);
        moveToRoom(targetIndex);
        lastTransitionRef.current = now;
        return;
      }
    }

    // Check if player is in the entrance room's "entrance" exit zone (exit dungeon)
    if (currentRoom.room.type === 'entrance') {
      // The entrance room can have an implicit "exit to overworld" on the south side
      // (the direction the player entered from). Check if player walks south enough
      // to exit the dungeon bounds.
      const exitThreshold = halfSize + 2;
      const dzFromCenter = _playerPos.z - (roomWorldZ + halfSize);
      const dxFromCenter = Math.abs(_playerPos.x - roomWorldX);

      if (
        dzFromCenter > 0 &&
        dzFromCenter < exitThreshold &&
        dxFromCenter < DOORWAY_WIDTH
      ) {
        exitDungeon();
        lastTransitionRef.current = now;
        return;
      }
    }
  });

  return null;
}

// ── Dungeon colliders ────────────────────────────────────────────────

/**
 * Creates Rapier colliders for the current room's floor and walls
 * so the physics-based PlayerController works inside the dungeon.
 */
function DungeonColliders() {
  const { activeDungeon } = useDungeonSession();
  if (!activeDungeon) return null;

  const currentRoom =
    activeDungeon.spatial.rooms[activeDungeon.currentRoomIndex];
  if (!currentRoom) return null;

  const { worldX, worldZ } = currentRoom;
  const roomY = DUNGEON_DEPTH;
  const halfSize = ROOM_SIZE / 2;

  // Gather exit directions for wall openings
  const exitDirs = new Set<CardinalDirection>();
  for (const exit of currentRoom.exits) {
    if (isCardinal(exit.direction)) {
      exitDirs.add(exit.direction);
    }
  }

  // Also include the implicit south exit for entrance rooms
  const isEntrance = currentRoom.room.type === 'entrance';

  return (
    <RigidBody
      type="fixed"
      colliders={false}
      key={`dungeon-colliders-${currentRoom.room.id}`}
    >
      {/* Floor */}
      <CuboidCollider
        args={[halfSize, 0.1, halfSize]}
        position={[worldX, roomY - 0.1, worldZ]}
      />

      {/* Walls — solid faces */}
      {!exitDirs.has('north') && (
        <CuboidCollider
          args={[halfSize, WALL_HEIGHT / 2, WALL_THICKNESS / 2]}
          position={[worldX, roomY + WALL_HEIGHT / 2, worldZ - halfSize]}
        />
      )}
      {!exitDirs.has('south') && !isEntrance && (
        <CuboidCollider
          args={[halfSize, WALL_HEIGHT / 2, WALL_THICKNESS / 2]}
          position={[worldX, roomY + WALL_HEIGHT / 2, worldZ + halfSize]}
        />
      )}
      {!exitDirs.has('east') && (
        <CuboidCollider
          args={[WALL_THICKNESS / 2, WALL_HEIGHT / 2, halfSize]}
          position={[worldX + halfSize, roomY + WALL_HEIGHT / 2, worldZ]}
        />
      )}
      {!exitDirs.has('west') && (
        <CuboidCollider
          args={[WALL_THICKNESS / 2, WALL_HEIGHT / 2, halfSize]}
          position={[worldX - halfSize, roomY + WALL_HEIGHT / 2, worldZ]}
        />
      )}

      {/* Walls with doorways — left and right pillars as colliders */}
      {exitDirs.has('north') && (
        <NorthSouthDoorwayColliders
          worldX={worldX}
          wallZ={worldZ - halfSize}
          roomY={roomY}
        />
      )}
      {(exitDirs.has('south') || isEntrance) && (
        <NorthSouthDoorwayColliders
          worldX={worldX}
          wallZ={worldZ + halfSize}
          roomY={roomY}
        />
      )}
      {exitDirs.has('east') && (
        <EastWestDoorwayColliders
          wallX={worldX + halfSize}
          worldZ={worldZ}
          roomY={roomY}
        />
      )}
      {exitDirs.has('west') && (
        <EastWestDoorwayColliders
          wallX={worldX - halfSize}
          worldZ={worldZ}
          roomY={roomY}
        />
      )}
    </RigidBody>
  );
}

function NorthSouthDoorwayColliders({
  worldX,
  wallZ,
  roomY,
}: {
  worldX: number;
  wallZ: number;
  roomY: number;
}) {
  const pillarWidth = (ROOM_SIZE - DOORWAY_WIDTH) / 2;
  const doorHalfW = DOORWAY_WIDTH / 2;
  return (
    <>
      <CuboidCollider
        args={[pillarWidth / 2, WALL_HEIGHT / 2, WALL_THICKNESS / 2]}
        position={[
          worldX - doorHalfW - pillarWidth / 2,
          roomY + WALL_HEIGHT / 2,
          wallZ,
        ]}
      />
      <CuboidCollider
        args={[pillarWidth / 2, WALL_HEIGHT / 2, WALL_THICKNESS / 2]}
        position={[
          worldX + doorHalfW + pillarWidth / 2,
          roomY + WALL_HEIGHT / 2,
          wallZ,
        ]}
      />
    </>
  );
}

function EastWestDoorwayColliders({
  wallX,
  worldZ,
  roomY,
}: {
  wallX: number;
  worldZ: number;
  roomY: number;
}) {
  const pillarWidth = (ROOM_SIZE - DOORWAY_WIDTH) / 2;
  const doorHalfW = DOORWAY_WIDTH / 2;
  return (
    <>
      <CuboidCollider
        args={[WALL_THICKNESS / 2, WALL_HEIGHT / 2, pillarWidth / 2]}
        position={[
          wallX,
          roomY + WALL_HEIGHT / 2,
          worldZ - doorHalfW - pillarWidth / 2,
        ]}
      />
      <CuboidCollider
        args={[WALL_THICKNESS / 2, WALL_HEIGHT / 2, pillarWidth / 2]}
        position={[
          wallX,
          roomY + WALL_HEIGHT / 2,
          worldZ + doorHalfW + pillarWidth / 2,
        ]}
      />
    </>
  );
}

// ── Main DungeonRenderer ─────────────────────────────────────────────

export function DungeonRenderer() {
  const { inDungeon } = useFlags();
  const { activeDungeon } = useDungeonSession();
  const { scene } = useThree();

  // Change scene background when entering/exiting dungeon
  useEffect(() => {
    if (inDungeon) {
      scene.background = new THREE.Color(0x0a0a0a);
    } else {
      scene.background = new THREE.Color(0x87ceeb);
    }
  }, [inDungeon, scene]);

  if (!inDungeon || !activeDungeon) return null;

  const currentRoomIndex = activeDungeon.currentRoomIndex;
  const rooms = activeDungeon.spatial.rooms;

  // Determine which rooms are adjacent to the current room
  const currentRoom = rooms[currentRoomIndex];
  const adjacentRoomIds = new Set<string>();
  if (currentRoom) {
    for (const exit of currentRoom.exits) {
      adjacentRoomIds.add(exit.targetRoomId);
    }
  }

  // Entrance room — add a south-facing doorway as exit to overworld
  const entranceRoom = activeDungeon.spatial.roomById.get(
    activeDungeon.spatial.layout.entranceRoomId,
  );

  return (
    <>
      {/* Dark ambient for dungeon atmosphere */}
      <ambientLight intensity={0.08} color={0x6688aa} />

      {/* Render rooms */}
      {rooms.map((placedRoom, index) => (
        <DungeonRoomMesh
          key={placedRoom.room.id}
          placedRoom={placedRoom}
          isCurrent={index === currentRoomIndex}
          isAdjacent={adjacentRoomIds.has(placedRoom.room.id)}
        />
      ))}

      {/* Entrance room south exit visual — archway leading to light */}
      {entranceRoom && <DungeonEntranceExit entranceRoom={entranceRoom} />}

      {/* Room navigation system */}
      <DungeonNavigator />

      {/* Physics colliders for the current room */}
      <DungeonColliders />
    </>
  );
}

// ── Entrance/exit visual ─────────────────────────────────────────────

function DungeonEntranceExit({ entranceRoom }: { entranceRoom: PlacedRoom }) {
  const halfSize = ROOM_SIZE / 2;

  return (
    <group
      position={[
        entranceRoom.worldX,
        DUNGEON_DEPTH,
        entranceRoom.worldZ + halfSize,
      ]}
    >
      {/* Bright glow to indicate the exit to overworld */}
      <pointLight
        color={0xffeedd}
        intensity={3}
        distance={12}
        decay={2}
        position={[0, 2, 2]}
      />
      {/* Authored mine support-beam as the exit-arch frame. */}
      <SupportBeam
        scale={[DOORWAY_WIDTH + 0.6, DOORWAY_HEIGHT + 0.4, 0.6]}
      />
      {/* Light plane behind to suggest daylight */}
      <mesh position={[0, DOORWAY_HEIGHT / 2, 1]}>
        <planeGeometry args={[DOORWAY_WIDTH, DOORWAY_HEIGHT]} />
        <meshBasicMaterial color={0xeeddcc} />
      </mesh>
    </group>
  );
}
