/**
 * Imperative actions over the session-game traits.
 *
 * All of the former zustand `useGameStore.getState().setX()` callsites
 * route through these functions. Each trait is lazy-attached on first
 * touch; `getEnsured(Trait)` guarantees the trait is present before read.
 */

import type { Entity, Trait } from 'koota';
import type * as THREE from 'three';
import {
  resetAutoSaveThrottle,
  scheduleAutoSave,
  scheduleAutoSaveThrottled,
} from '@/db/autosave';
import {
  type ActiveDungeon,
  CameraState,
  ChunkState,
  CombatSession,
  DEFAULT_WEATHER,
  DungeonSession,
  EnvironmentState,
  GameFlags,
  InputLegacy,
  InteractionState,
  PlayerState,
  PlayTime,
  SeedState,
  type WeatherState,
} from '@/ecs/traits/session-game';
import { getSessionEntity } from '@/ecs/world';
import type {
  AABB,
  ActiveEncounter,
  ChunkData,
  ChunkRoleTag,
  InputState,
  Interactable,
} from '@/types/game';
import { generateSeedPhrase } from '@/utils/seedPhrase';

// ── Session entity access helpers ─────────────────────────────────────────
//
// Koota's `entity.get(Trait)` returns `TraitRecord | undefined` because
// traits may not be attached. We guarantee attachment with `ensure()` then
// use non-null assertions — per the Koota README pattern (`entity.get(T)!`).

function entity(): Entity {
  return getSessionEntity();
}

function ensure<T extends Trait<() => object>>(t: T): Entity {
  const e = entity();
  if (!e.has(t)) e.add(t);
  return e;
}

function read<T extends Trait<() => object>>(
  t: T,
): ReturnType<T extends Trait<infer S> ? S : never> {
  const e = ensure(t);
  return e.get(t) as ReturnType<T extends Trait<infer S> ? S : never>;
}

// ── Flags ────────────────────────────────────────────────────────────────
export function getFlags() {
  return read(GameFlags);
}
export function setGameActive(active: boolean): void {
  const e = ensure(GameFlags);
  e.set(GameFlags, { ...e.get(GameFlags)!, gameActive: active });
}
export function setPaused(paused: boolean): void {
  const e = ensure(GameFlags);
  e.set(GameFlags, { ...e.get(GameFlags)!, paused });
}
export function togglePause(): void {
  const e = ensure(GameFlags);
  const cur = e.get(GameFlags)!;
  e.set(GameFlags, { ...cur, paused: !cur.paused });
}
export function setTabHidden(tabHidden: boolean): void {
  const e = ensure(GameFlags);
  e.set(GameFlags, { ...e.get(GameFlags)!, tabHidden });
}
export function setIsSprinting(sprinting: boolean): void {
  const e = ensure(GameFlags);
  e.set(GameFlags, { ...e.get(GameFlags)!, isSprinting: sprinting });
}
export function setIsGrounded(grounded: boolean): void {
  const e = ensure(GameFlags);
  e.set(GameFlags, { ...e.get(GameFlags)!, isGrounded: grounded });
}

// ── Player ────────────────────────────────────────────────────────────────
export function getPlayer() {
  return read(PlayerState);
}
export function setPlayerPosition(pos: THREE.Vector3): void {
  const e = ensure(PlayerState);
  e.set(PlayerState, { ...e.get(PlayerState)!, playerPosition: pos.clone() });
}
export function updatePlayerY(y: number): void {
  const e = ensure(PlayerState);
  const cur = e.get(PlayerState)!;
  const next = cur.playerPosition.clone();
  next.y = y;
  e.set(PlayerState, { ...cur, playerPosition: next });
}
export function setPlayerVelocityY(vel: number): void {
  const e = ensure(PlayerState);
  e.set(PlayerState, { ...e.get(PlayerState)!, playerVelocityY: vel });
}
export function setVelocity(vel: number): void {
  const e = ensure(PlayerState);
  e.set(PlayerState, { ...e.get(PlayerState)!, velocity: vel });
}
export function setStamina(stamina: number): void {
  const e = ensure(PlayerState);
  e.set(PlayerState, {
    ...e.get(PlayerState)!,
    stamina: Math.max(0, Math.min(100, stamina)),
  });
  // Throttled — stamina ticks every frame during sprint, so the
  // debounced scheduleAutoSave() would never fire. 10s window is a
  // reasonable trade-off between persistence and IDB write volume.
  scheduleAutoSaveThrottled('player.stamina', 10_000);
}
export function setHealth(health: number): void {
  const e = ensure(PlayerState);
  e.set(PlayerState, {
    ...e.get(PlayerState)!,
    health: Math.max(0, Math.min(100, health)),
  });
  // Throttled (see setStamina). Health changes are rarer than stamina
  // but still potentially rapid during combat, so use the same pattern.
  scheduleAutoSaveThrottled('player.health', 10_000);
}

// ── Camera ───────────────────────────────────────────────────────────────
export function getCamera() {
  return read(CameraState);
}
export function setCameraYaw(yaw: number): void {
  const e = ensure(CameraState);
  e.set(CameraState, { ...e.get(CameraState)!, cameraYaw: yaw });
}
export function setCameraPitch(pitch: number): void {
  const e = ensure(CameraState);
  e.set(CameraState, { ...e.get(CameraState)!, cameraPitch: pitch });
}
export function setAngularVelocity(vel: number): void {
  const e = ensure(CameraState);
  e.set(CameraState, { ...e.get(CameraState)!, angularVelocity: vel });
}

// ── Seed ─────────────────────────────────────────────────────────────────
export function getSeedPhrase(): string {
  return read(SeedState).seedPhrase;
}
export function setSeedPhrase(seed: string): void {
  const e = ensure(SeedState);
  e.set(SeedState, { ...e.get(SeedState)!, seedPhrase: seed });
}
export function generateNewSeed(): string {
  const seed = generateSeedPhrase();
  setSeedPhrase(seed);
  return seed;
}

// ── Chunks ───────────────────────────────────────────────────────────────
export function getChunkState() {
  return read(ChunkState);
}
export function setCurrentChunk(
  key: string,
  name: string,
  type: ChunkRoleTag,
): void {
  const e = ensure(ChunkState);
  e.set(ChunkState, {
    ...e.get(ChunkState)!,
    currentChunkKey: key,
    currentChunkName: name,
    currentChunkType: type,
  });
}
export function addChunk(chunk: ChunkData): void {
  const e = ensure(ChunkState);
  const cur = e.get(ChunkState)!;
  const next = new Map(cur.activeChunks);
  next.set(chunk.key, chunk);
  e.set(ChunkState, { ...cur, activeChunks: next });
}
export function removeChunk(key: string): void {
  const e = ensure(ChunkState);
  const cur = e.get(ChunkState)!;
  const next = new Map(cur.activeChunks);
  next.delete(key);
  e.set(ChunkState, { ...cur, activeChunks: next });
}
export function addGlobalAABBs(aabbs: AABB[]): void {
  const e = ensure(ChunkState);
  const cur = e.get(ChunkState)!;
  e.set(ChunkState, {
    ...cur,
    globalAABBs: [...cur.globalAABBs, ...aabbs],
  });
}
export function removeGlobalAABBs(aabbs: AABB[]): void {
  const e = ensure(ChunkState);
  const cur = e.get(ChunkState)!;
  const set = new Set(aabbs);
  e.set(ChunkState, {
    ...cur,
    globalAABBs: cur.globalAABBs.filter((a) => !set.has(a)),
  });
}
export function addGlobalInteractables(list: Interactable[]): void {
  const e = ensure(ChunkState);
  const cur = e.get(ChunkState)!;
  e.set(ChunkState, {
    ...cur,
    globalInteractables: [...cur.globalInteractables, ...list],
  });
}
export function removeGlobalInteractables(list: Interactable[]): void {
  const e = ensure(ChunkState);
  const cur = e.get(ChunkState)!;
  const set = new Set(list);
  e.set(ChunkState, {
    ...cur,
    globalInteractables: cur.globalInteractables.filter((i) => !set.has(i)),
  });
}

// ── Environment ──────────────────────────────────────────────────────────
export function getEnvironment() {
  return read(EnvironmentState);
}
export function setTimeOfDay(time: number): void {
  const e = ensure(EnvironmentState);
  e.set(EnvironmentState, {
    ...e.get(EnvironmentState)!,
    timeOfDay: time % 1,
  });
}
export function setCurrentWeather(weather: WeatherState): void {
  const e = ensure(EnvironmentState);
  e.set(EnvironmentState, {
    ...e.get(EnvironmentState)!,
    currentWeather: weather,
  });
}
export function collectGem(chunkKey: string, gemId: number): void {
  const cs = ensure(ChunkState);
  const es = ensure(EnvironmentState);
  const chunk = cs.get(ChunkState)!;
  const env = es.get(EnvironmentState)!;
  // Idempotency guard. The Relic component's useFrame proximity check
  // can fire before React has flushed `setIsCollected(true)`, so the
  // same (chunkKey, gemId) may arrive here twice in back-to-back
  // frames. Without this guard we'd double-increment gemsCollected
  // and schedule a redundant autosave — and since `gems` tracks
  // collected ids as a set-like array, the second write is a no-op
  // that still bumps the counter.
  const existing = chunk.chunkDeltas[chunkKey]?.gems ?? [];
  if (existing.includes(gemId)) return;

  const deltas = { ...chunk.chunkDeltas };
  deltas[chunkKey] = { gems: [...existing, gemId] };
  cs.set(ChunkState, { ...chunk, chunkDeltas: deltas });
  es.set(EnvironmentState, { ...env, gemsCollected: env.gemsCollected + 1 });
  // Durable mutation — without scheduling an autosave, picking up a
  // relic (aka a `gem` in the chunkDeltas schema) and then refreshing
  // the tab resurrects it. Same pattern as quest progress in
  // src/ecs/actions/quest.ts (#154).
  scheduleAutoSave();
}

// ── Combat ───────────────────────────────────────────────────────────────
export function getCombatSession() {
  return read(CombatSession);
}
export function startCombat(encounter: ActiveEncounter): void {
  const f = ensure(GameFlags);
  f.set(GameFlags, { ...f.get(GameFlags)!, inCombat: true });
  const c = ensure(CombatSession);
  c.set(CombatSession, { activeEncounter: encounter });
}
export function endCombat(): void {
  const f = ensure(GameFlags);
  f.set(GameFlags, { ...f.get(GameFlags)!, inCombat: false });
  const c = ensure(CombatSession);
  c.set(CombatSession, { activeEncounter: null });
}

// ── Dungeon ──────────────────────────────────────────────────────────────
export function getDungeonSession() {
  return read(DungeonSession);
}
export function enterDungeon(dungeon: ActiveDungeon): void {
  const f = ensure(GameFlags);
  f.set(GameFlags, { ...f.get(GameFlags)!, inDungeon: true });
  const d = ensure(DungeonSession);
  d.set(DungeonSession, { activeDungeon: dungeon });
  const roomName =
    dungeon.spatial.rooms[dungeon.currentRoomIndex]?.room.name ?? 'Unknown';
  const cs = ensure(ChunkState);
  cs.set(ChunkState, {
    ...cs.get(ChunkState)!,
    currentChunkName: `${dungeon.name}: ${roomName}`,
    currentChunkType: 'DUNGEON' as ChunkRoleTag,
  });
  // The save schema's `dungeon` field persists the active dungeon.
  // Without this, entering a dungeon and crashing before any other
  // durable write drops the player back in the overworld on reload.
  scheduleAutoSave();
}
export function exitDungeon(): void {
  const d = ensure(DungeonSession);
  const cur = d.get(DungeonSession)!;
  const f = ensure(GameFlags);
  if (!cur.activeDungeon) {
    f.set(GameFlags, { ...f.get(GameFlags)!, inDungeon: false });
    return;
  }
  const p = ensure(PlayerState);
  p.set(PlayerState, {
    ...p.get(PlayerState)!,
    playerPosition: cur.activeDungeon.overworldPosition.clone(),
  });
  const c = ensure(CameraState);
  c.set(CameraState, {
    ...c.get(CameraState)!,
    cameraYaw: cur.activeDungeon.overworldYaw,
  });
  const cs = ensure(ChunkState);
  cs.set(ChunkState, {
    ...cs.get(ChunkState)!,
    currentChunkName: 'The Realm',
    currentChunkType: 'WILD' as ChunkRoleTag,
  });
  f.set(GameFlags, { ...f.get(GameFlags)!, inDungeon: false });
  d.set(DungeonSession, { activeDungeon: null });
  // Overworld position + dungeon=null are both durable. Persist so a
  // reload after exit lands on the overworld, not back inside.
  scheduleAutoSave();
}
export function moveToRoom(roomIndex: number): void {
  const d = ensure(DungeonSession);
  const cur = d.get(DungeonSession)!;
  if (!cur.activeDungeon) return;
  const room = cur.activeDungeon.spatial.rooms[roomIndex];
  if (!room) return;
  d.set(DungeonSession, {
    activeDungeon: {
      ...cur.activeDungeon,
      currentRoomIndex: roomIndex,
    },
  });
  const cs = ensure(ChunkState);
  cs.set(ChunkState, {
    ...cs.get(ChunkState)!,
    currentChunkName: `${cur.activeDungeon.name}: ${room.room.name}`,
  });
  // currentRoomIndex is persisted by snapshotGameState; without an
  // autosave, room progress is lost if the player closes the tab
  // between rooms.
  scheduleAutoSave();
}

// ── Interaction / dialogue ──────────────────────────────────────────────
export function getInteraction() {
  return read(InteractionState);
}
export function setCurrentInteractable(
  interactable: Interactable | null,
): void {
  const e = ensure(InteractionState);
  e.set(InteractionState, {
    ...e.get(InteractionState)!,
    currentInteractable: interactable,
  });
}
export function openDialogue(
  name: string,
  text: string,
  npcType?: string,
): void {
  const f = ensure(GameFlags);
  f.set(GameFlags, { ...f.get(GameFlags)!, inDialogue: true });
  const i = ensure(InteractionState);
  i.set(InteractionState, {
    ...i.get(InteractionState)!,
    dialogueName: name,
    dialogueText: text,
    dialogueType: npcType ?? 'wanderer',
  });
}
export function closeDialogue(): void {
  const f = ensure(GameFlags);
  f.set(GameFlags, { ...f.get(GameFlags)!, inDialogue: false });
}

// ── Life cycle ──────────────────────────────────────────────────────────
export function die(): void {
  const f = ensure(GameFlags);
  f.set(GameFlags, { ...f.get(GameFlags)!, isDead: true, inCombat: false });
  const c = ensure(CombatSession);
  c.set(CombatSession, { activeEncounter: null });
  const p = ensure(PlayerState);
  p.set(PlayerState, {
    ...p.get(PlayerState)!,
    velocity: 0,
    playerVelocityY: 0,
  });
}
export function respawn(): void {
  const f = ensure(GameFlags);
  f.set(GameFlags, { ...f.get(GameFlags)!, isDead: false, inCombat: false });
  const p = ensure(PlayerState);
  p.set(PlayerState, { ...p.get(PlayerState)!, health: 100, stamina: 100 });
  const c = ensure(CombatSession);
  c.set(CombatSession, { activeEncounter: null });
}

// Full-world reset without touching gameActive (used by restart-to-menu)
export function resetGame(): void {
  const f = ensure(GameFlags);
  f.set(GameFlags, {
    ...f.get(GameFlags)!,
    paused: false,
    inDialogue: false,
    inCombat: false,
    inDungeon: false,
    isDead: false,
    isSprinting: false,
    isGrounded: true,
  });
  const p = ensure(PlayerState);
  p.set(PlayerState, {
    ...p.get(PlayerState)!,
    playerVelocityY: 0,
    velocity: 0,
    stamina: 100,
    health: 100,
  });
  const c = ensure(CameraState);
  c.set(CameraState, {
    ...c.get(CameraState)!,
    cameraPitch: 0,
    angularVelocity: 0,
  });
  const cs = ensure(ChunkState);
  cs.set(ChunkState, {
    currentChunkKey: '',
    currentChunkName: 'The Realm',
    currentChunkType: 'WILD' as ChunkRoleTag,
    activeChunks: new Map(),
    globalAABBs: [],
    globalInteractables: [],
    chunkDeltas: {},
  });
  const es = ensure(EnvironmentState);
  es.set(EnvironmentState, {
    timeOfDay: 8 / 24,
    gemsCollected: 0,
    currentWeather: { ...DEFAULT_WEATHER },
  });
  const cm = ensure(CombatSession);
  cm.set(CombatSession, { activeEncounter: null });
  const d = ensure(DungeonSession);
  d.set(DungeonSession, { activeDungeon: null });
  const i = ensure(InteractionState);
  i.set(InteractionState, {
    ...i.get(InteractionState)!,
    currentInteractable: null,
    dialogueName: '',
    dialogueText: '',
  });
  const pt = ensure(PlayTime);
  pt.set(PlayTime, { playTimeSeconds: 0 });
  // Clear any stale throttle windows so the new session's first
  // health/stamina/time-of-day tick isn't suppressed by a leftover
  // timestamp from the previous session.
  resetAutoSaveThrottle();
}

export function startGame(
  seed: string,
  position: THREE.Vector3,
  yaw: number,
): void {
  resetGame();
  setSeedPhrase(seed);
  setPlayerPosition(position);
  const c = ensure(CameraState);
  c.set(CameraState, { ...c.get(CameraState)!, cameraYaw: yaw });
  const f = ensure(GameFlags);
  f.set(GameFlags, { ...f.get(GameFlags)!, gameActive: true });
}

// ── Legacy input ────────────────────────────────────────────────────────
export function getInputLegacy() {
  return read(InputLegacy);
}
export function setKey(key: keyof InputState, value: boolean): void {
  const e = ensure(InputLegacy);
  const cur = e.get(InputLegacy)!;
  e.set(InputLegacy, {
    ...cur,
    keys: { ...cur.keys, [key]: value },
  });
}
export function setJoystick(
  vector: { x: number; y: number },
  dist: number,
): void {
  const e = ensure(InputLegacy);
  e.set(InputLegacy, {
    ...e.get(InputLegacy)!,
    joystickVector: vector,
    joystickDist: dist,
  });
}
export function setMouseDown(down: boolean): void {
  const e = ensure(InputLegacy);
  e.set(InputLegacy, { ...e.get(InputLegacy)!, mouseDown: down });
}

// ── Play time ────────────────────────────────────────────────────────────
export function getPlayTimeSeconds(): number {
  return read(PlayTime).playTimeSeconds;
}

/**
 * Advance the play-time counter. Call once per frame from a useFrame hook
 * while gameActive && !paused && !isDead. delta is seconds.
 */
export function tickPlayTime(delta: number): void {
  const e = ensure(PlayTime);
  const cur = e.get(PlayTime)!;
  e.set(PlayTime, { playTimeSeconds: cur.playTimeSeconds + delta });
}

export function setPlayTimeSeconds(seconds: number): void {
  const e = ensure(PlayTime);
  e.set(PlayTime, { playTimeSeconds: seconds });
}

// ── Snapshot for save service ───────────────────────────────────────────
// Same shape the old GameStoreSnapshot expected (see src/db/save-service.ts)
export function getGameSnapshot() {
  const player = read(PlayerState);
  const camera = read(CameraState);
  const chunks = read(ChunkState);
  const env = read(EnvironmentState);
  const flags = read(GameFlags);
  const dungeon = read(DungeonSession);
  const seed = read(SeedState);
  return {
    seedPhrase: seed.seedPhrase,
    playerPosition: player.playerPosition,
    cameraYaw: camera.cameraYaw,
    health: player.health,
    stamina: player.stamina,
    timeOfDay: env.timeOfDay,
    gemsCollected: env.gemsCollected,
    chunkDeltas: chunks.chunkDeltas,
    inDungeon: flags.inDungeon,
    activeDungeon: dungeon.activeDungeon
      ? {
          id: dungeon.activeDungeon.id,
          currentRoomIndex: dungeon.activeDungeon.currentRoomIndex,
          overworldPosition: dungeon.activeDungeon.overworldPosition,
          overworldYaw: dungeon.activeDungeon.overworldYaw,
        }
      : null,
  };
}

// Merge-style setState used by the restore path — assigns only provided keys.
export function mergeGameState(partial: {
  health?: number;
  stamina?: number;
  timeOfDay?: number;
  gemsCollected?: number;
  chunkDeltas?: Record<string, import('@/types/game').ChunkDelta>;
}): void {
  if (partial.health !== undefined || partial.stamina !== undefined) {
    const p = ensure(PlayerState);
    const cur = p.get(PlayerState)!;
    p.set(PlayerState, {
      ...cur,
      ...(partial.health !== undefined && { health: partial.health }),
      ...(partial.stamina !== undefined && { stamina: partial.stamina }),
    });
  }
  if (partial.timeOfDay !== undefined || partial.gemsCollected !== undefined) {
    const e = ensure(EnvironmentState);
    const cur = e.get(EnvironmentState)!;
    e.set(EnvironmentState, {
      ...cur,
      ...(partial.timeOfDay !== undefined && { timeOfDay: partial.timeOfDay }),
      ...(partial.gemsCollected !== undefined && {
        gemsCollected: partial.gemsCollected,
      }),
    });
  }
  if (partial.chunkDeltas !== undefined) {
    const c = ensure(ChunkState);
    c.set(ChunkState, {
      ...c.get(ChunkState)!,
      chunkDeltas: partial.chunkDeltas,
    });
  }
}
