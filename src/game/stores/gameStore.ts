import * as THREE from 'three';
import { create } from 'zustand';
import type {
  AABB,
  ActiveEncounter,
  ChunkData,
  ChunkDelta,
  ChunkType,
  InputState,
  Interactable,
} from '../types';
import { PLAYER_HEIGHT } from '../utils/worldGen';
import type { SpatialDungeon } from '../world/dungeon-generator';

/** Runtime weather state tracked per frame */
export interface WeatherState {
  /** Active weather condition */
  condition: 'clear' | 'overcast' | 'foggy' | 'rainy' | 'stormy';
  /** Current fog density (0-1), interpolated during transitions */
  fogDensity: number;
  /** Current rain intensity (0-1) */
  rainIntensity: number;
  /** Wind strength (0-1) */
  windStrength: number;
  /** Region id driving this weather (for transition detection) */
  regionId: string;
}

const DEFAULT_WEATHER: WeatherState = {
  condition: 'clear',
  fogDensity: 0,
  rainIntensity: 0,
  windStrength: 0.1,
  regionId: '',
};

/** Active dungeon state when the player is inside a dungeon */
export interface ActiveDungeon {
  id: string;
  name: string;
  spatial: SpatialDungeon;
  currentRoomIndex: number;
  /** Overworld position to return the player to on exit */
  overworldPosition: THREE.Vector3;
  /** Overworld camera yaw to restore on exit */
  overworldYaw: number;
}

// Re-export types for backward compatibility
export type { AABB, ChunkData, ChunkType, Interactable };

// Re-export random utilities for backward compatibility
export { cyrb128, mulberry32 } from '../utils/random';

interface GameState {
  // Game state
  gameActive: boolean;
  paused: boolean;
  inDialogue: boolean;
  seedPhrase: string;

  // Player state
  playerPosition: THREE.Vector3;
  playerVelocityY: number;
  velocity: number;
  // DEPRECATED: legacy input system
  angularVelocity: number;
  cameraYaw: number;
  cameraPitch: number;
  stamina: number;
  health: number;
  isDead: boolean;
  isSprinting: boolean;
  isGrounded: boolean;

  // World state
  currentChunkKey: string;
  currentChunkName: string;
  currentChunkType: ChunkType;
  activeChunks: Map<string, ChunkData>;
  globalAABBs: AABB[];
  globalInteractables: Interactable[];
  chunkDeltas: Record<string, ChunkDelta>;

  // Environment
  timeOfDay: number;
  gemsCollected: number;
  currentWeather: WeatherState;

  // Combat state
  inCombat: boolean;
  activeEncounter: ActiveEncounter | null;

  // Dungeon state
  inDungeon: boolean;
  activeDungeon: ActiveDungeon | null;

  // Current interaction
  currentInteractable: Interactable | null;
  dialogueName: string;
  dialogueText: string;
  dialogueType: string;

  // Input state
  // DEPRECATED: legacy input system — InteractionSystem still reads keys.action
  keys: InputState;
  // DEPRECATED: legacy input system
  joystickVector: { x: number; y: number };
  // DEPRECATED: legacy input system
  joystickDist: number;
  // DEPRECATED: legacy input system
  mouseDown: boolean;

  // Actions
  setGameActive: (active: boolean) => void;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;
  setSeedPhrase: (seed: string) => void;
  resetGame: () => void;
  startGame: (seed: string, position: THREE.Vector3, yaw: number) => void;

  setPlayerPosition: (pos: THREE.Vector3) => void;
  updatePlayerY: (y: number) => void;
  setPlayerVelocityY: (vel: number) => void;
  setVelocity: (vel: number) => void;
  // DEPRECATED: legacy input system
  setAngularVelocity: (vel: number) => void;
  setCameraYaw: (yaw: number) => void;
  setCameraPitch: (pitch: number) => void;
  setStamina: (stamina: number) => void;
  setHealth: (health: number) => void;
  die: () => void;
  respawn: () => void;
  setIsSprinting: (sprinting: boolean) => void;
  setIsGrounded: (grounded: boolean) => void;

  setCurrentChunk: (key: string, name: string, type: ChunkType) => void;
  addChunk: (chunk: ChunkData) => void;
  removeChunk: (key: string) => void;
  addGlobalAABBs: (aabbs: AABB[]) => void;
  removeGlobalAABBs: (aabbs: AABB[]) => void;
  addGlobalInteractables: (interactables: Interactable[]) => void;
  removeGlobalInteractables: (interactables: Interactable[]) => void;

  setTimeOfDay: (time: number) => void;
  setCurrentWeather: (weather: WeatherState) => void;
  collectGem: (chunkKey: string, gemId: number) => void;

  startCombat: (encounter: ActiveEncounter) => void;
  endCombat: () => void;

  enterDungeon: (dungeon: ActiveDungeon) => void;
  exitDungeon: () => void;
  moveToRoom: (roomIndex: number) => void;

  setCurrentInteractable: (interactable: Interactable | null) => void;
  openDialogue: (name: string, text: string, npcType?: string) => void;
  closeDialogue: () => void;

  // DEPRECATED: legacy input system — InteractionSystem still reads keys.action
  setKey: (key: keyof InputState, value: boolean) => void;
  // DEPRECATED: legacy input system
  setJoystick: (vector: { x: number; y: number }, dist: number) => void;
  // DEPRECATED: legacy input system
  setMouseDown: (down: boolean) => void;

  generateNewSeed: () => string;
}

const ADJECTIVES = [
  'Golden',
  'Verdant',
  'Gentle',
  'Sunlit',
  'Pastoral',
  'Quiet',
  'Rolling',
  'Blessed',
  'Winding',
  'Misty',
  'Silver',
  'Ancient',
  'Noble',
  'Fair',
  'Hallowed',
  'Tranquil',
  'Emerald',
  'Amber',
];
const NOUNS = [
  'Meadow',
  'Glen',
  'Shire',
  'Dale',
  'Hollow',
  'Brook',
  'Haven',
  'Crossing',
  'Fields',
  'Commons',
  'Glade',
  'Downs',
  'Heath',
  'Moor',
  'Vale',
  'March',
];

export const generateSeedPhrase = () => {
  const a1 = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  let a2 = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  while (a1 === a2)
    a2 = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  return `${a1} ${a2} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`;
};

export const useGameStore = create<GameState>((set, _get) => ({
  // Initial state
  gameActive: false,
  paused: false,
  inDialogue: false,
  seedPhrase: '',

  // Safe default position — overridden by startGame() with actual Ashford coords
  playerPosition: new THREE.Vector3(0, PLAYER_HEIGHT, 0),
  playerVelocityY: 0,
  velocity: 0,
  angularVelocity: 0,
  cameraYaw: Math.PI,
  cameraPitch: 0,
  stamina: 100,
  health: 100,
  isDead: false,
  isSprinting: false,
  isGrounded: true,

  currentChunkKey: '',
  currentChunkName: 'The Realm',
  currentChunkType: 'WILD',
  activeChunks: new Map(),
  globalAABBs: [],
  globalInteractables: [],
  chunkDeltas: {},

  timeOfDay: 8 / 24, // Start at 8 AM
  gemsCollected: 0,
  currentWeather: DEFAULT_WEATHER,

  inCombat: false,
  activeEncounter: null,

  inDungeon: false,
  activeDungeon: null,

  currentInteractable: null,
  dialogueName: '',
  dialogueText: '',
  dialogueType: 'wanderer',

  keys: {
    w: false,
    a: false,
    s: false,
    d: false,
    q: false,
    e: false,
    space: false,
    shift: false,
    action: false,
  },
  joystickVector: { x: 0, y: 0 },
  joystickDist: 0,
  mouseDown: false,

  // Actions
  setGameActive: (active) => set({ gameActive: active }),
  setPaused: (paused) => set({ paused }),
  togglePause: () => set((state) => ({ paused: !state.paused })),
  setSeedPhrase: (seed) => set({ seedPhrase: seed }),

  // Reset world state without affecting gameActive - for starting new games
  resetGame: () =>
    set((_state) => ({
      paused: false,
      inDialogue: false,
      playerVelocityY: 0,
      velocity: 0,
      angularVelocity: 0,
      cameraPitch: 0,
      stamina: 100,
      health: 100,
      isDead: false,
      isSprinting: false,
      isGrounded: true,
      currentChunkKey: '',
      currentChunkName: 'The Realm',
      currentChunkType: 'WILD' as ChunkType,
      activeChunks: new Map(),
      globalAABBs: [],
      globalInteractables: [],
      timeOfDay: 8 / 24,
      gemsCollected: 0,
      currentWeather: DEFAULT_WEATHER,
      inCombat: false,
      activeEncounter: null,
      inDungeon: false,
      activeDungeon: null,
      currentInteractable: null,
      dialogueName: '',
      dialogueText: '',
      chunkDeltas: {},
    })),

  // Start game with all state set atomically
  startGame: (seed, position, yaw) =>
    set({
      // Reset world state
      paused: false,
      inDialogue: false,
      playerVelocityY: 0,
      velocity: 0,
      angularVelocity: 0,
      cameraPitch: 0,
      stamina: 100,
      health: 100,
      isDead: false,
      isSprinting: false,
      isGrounded: true,
      currentChunkKey: '',
      currentChunkName: 'The Realm',
      currentChunkType: 'WILD' as ChunkType,
      activeChunks: new Map(),
      globalAABBs: [],
      globalInteractables: [],
      timeOfDay: 8 / 24,
      gemsCollected: 0,
      currentWeather: DEFAULT_WEATHER,
      inCombat: false,
      activeEncounter: null,
      inDungeon: false,
      activeDungeon: null,
      currentInteractable: null,
      dialogueName: '',
      dialogueText: '',
      chunkDeltas: {},
      // Set game params
      seedPhrase: seed,
      playerPosition: position.clone(),
      cameraYaw: yaw,
      // Activate game
      gameActive: true,
    }),

  setPlayerPosition: (pos) => set({ playerPosition: pos.clone() }),
  updatePlayerY: (y) =>
    set((state) => {
      const newPos = state.playerPosition.clone();
      newPos.y = y;
      return { playerPosition: newPos };
    }),
  setPlayerVelocityY: (vel) => set({ playerVelocityY: vel }),
  setVelocity: (vel) => set({ velocity: vel }),
  setAngularVelocity: (vel) => set({ angularVelocity: vel }),
  setCameraYaw: (yaw) => set({ cameraYaw: yaw }),
  setCameraPitch: (pitch) => set({ cameraPitch: pitch }),
  setStamina: (stamina) =>
    set({ stamina: Math.max(0, Math.min(100, stamina)) }),
  setHealth: (health) => {
    const clamped = Math.max(0, Math.min(100, health));
    set({ health: clamped });
  },

  // Player dies — freeze in place, end combat
  die: () =>
    set({
      isDead: true,
      inCombat: false,
      activeEncounter: null,
      velocity: 0,
      playerVelocityY: 0,
    }),

  // Respawn at current position with restored health
  respawn: () =>
    set({
      isDead: false,
      health: 100,
      stamina: 100,
      inCombat: false,
      activeEncounter: null,
    }),

  setIsSprinting: (sprinting) => set({ isSprinting: sprinting }),
  setIsGrounded: (grounded) => set({ isGrounded: grounded }),

  setCurrentChunk: (key, name, type) =>
    set({
      currentChunkKey: key,
      currentChunkName: name,
      currentChunkType: type,
    }),

  addChunk: (chunk) =>
    set((state) => {
      const newChunks = new Map(state.activeChunks);
      newChunks.set(chunk.key, chunk);
      return { activeChunks: newChunks };
    }),

  removeChunk: (key) =>
    set((state) => {
      const newChunks = new Map(state.activeChunks);
      newChunks.delete(key);
      return { activeChunks: newChunks };
    }),

  addGlobalAABBs: (aabbs) =>
    set((state) => ({
      globalAABBs: [...(state.globalAABBs || []), ...(aabbs || [])],
    })),

  removeGlobalAABBs: (aabbs) =>
    set((state) => ({
      globalAABBs: (state.globalAABBs || []).filter(
        (a) => !(aabbs || []).includes(a),
      ),
    })),

  addGlobalInteractables: (interactables) =>
    set((state) => ({
      globalInteractables: [
        ...(state.globalInteractables || []),
        ...(interactables || []),
      ],
    })),

  removeGlobalInteractables: (interactables) =>
    set((state) => ({
      globalInteractables: (state.globalInteractables || []).filter(
        (i) => !(interactables || []).includes(i),
      ),
    })),

  setTimeOfDay: (time) => set({ timeOfDay: time % 1 }),
  setCurrentWeather: (weather) => set({ currentWeather: weather }),

  collectGem: (chunkKey, gemId) =>
    set((state) => {
      const deltas = { ...state.chunkDeltas };
      if (!deltas[chunkKey]) deltas[chunkKey] = { gems: [] };
      if (!deltas[chunkKey].gems.includes(gemId)) {
        deltas[chunkKey].gems.push(gemId);
      }
      return {
        chunkDeltas: deltas,
        gemsCollected: state.gemsCollected + 1,
      };
    }),

  startCombat: (encounter) =>
    set({ inCombat: true, activeEncounter: encounter }),
  endCombat: () => set({ inCombat: false, activeEncounter: null }),

  enterDungeon: (dungeon) =>
    set({
      inDungeon: true,
      activeDungeon: dungeon,
      currentChunkName: `${dungeon.name}: ${dungeon.spatial.rooms[dungeon.currentRoomIndex]?.room.name ?? 'Unknown'}`,
      currentChunkType: 'DUNGEON' as ChunkType,
    }),

  exitDungeon: () =>
    set((state) => {
      const dungeon = state.activeDungeon;
      if (!dungeon) return { inDungeon: false, activeDungeon: null };
      return {
        inDungeon: false,
        activeDungeon: null,
        playerPosition: dungeon.overworldPosition.clone(),
        cameraYaw: dungeon.overworldYaw,
        currentChunkName: 'The Realm',
        currentChunkType: 'WILD' as ChunkType,
      };
    }),

  moveToRoom: (roomIndex) =>
    set((state) => {
      if (!state.activeDungeon) return {};
      const room = state.activeDungeon.spatial.rooms[roomIndex];
      if (!room) return {};
      return {
        activeDungeon: {
          ...state.activeDungeon,
          currentRoomIndex: roomIndex,
        },
        currentChunkName: `${state.activeDungeon.name}: ${room.room.name}`,
      };
    }),

  setCurrentInteractable: (interactable) =>
    set({ currentInteractable: interactable }),

  openDialogue: (name, text, npcType) =>
    set({
      inDialogue: true,
      dialogueName: name,
      dialogueText: text,
      dialogueType: npcType ?? 'wanderer',
    }),

  closeDialogue: () => set({ inDialogue: false }),

  setKey: (key, value) =>
    set((state) => ({
      keys: { ...state.keys, [key]: value },
    })),

  setJoystick: (vector, dist) =>
    set({ joystickVector: vector, joystickDist: dist }),
  setMouseDown: (down) => set({ mouseDown: down }),

  generateNewSeed: () => {
    const seed = generateSeedPhrase();
    set({ seedPhrase: seed });
    return seed;
  },
}));

// Debug: expose store for DevTools testing (tree-shaken in production)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__gameStore = useGameStore;
}
