import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { generateSeedPhrase, useGameStore } from './gameStore';

describe('generateSeedPhrase', () => {
  it('generates a string with three words', () => {
    const seed = generateSeedPhrase();
    const words = seed.split(' ');
    expect(words.length).toBe(3);
  });

  it('generates different seeds on subsequent calls', () => {
    const seeds = new Set<string>();
    for (let i = 0; i < 20; i++) {
      seeds.add(generateSeedPhrase());
    }
    // Should generate mostly unique seeds
    expect(seeds.size).toBeGreaterThan(10);
  });

  it('seed phrase uses different adjectives', () => {
    const seed = generateSeedPhrase();
    const words = seed.split(' ');
    // First two words are adjectives, should be different
    expect(words[0]).not.toBe(words[1]);
  });

  it('always ensures first two words are different (covers while loop)', () => {
    // Generate many seeds to statistically cover the while loop branch
    for (let i = 0; i < 100; i++) {
      const seed = generateSeedPhrase();
      const words = seed.split(' ');
      expect(words[0]).not.toBe(words[1]);
    }
  });
});

describe('useGameStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useGameStore.setState({
      gameActive: false,
      inDialogue: false,
      seedPhrase: '',
      playerPosition: new THREE.Vector3(60, 1.6, 60),
      playerVelocityY: 0,
      velocity: 0,
      angularVelocity: 0,
      cameraYaw: Math.PI,
      cameraPitch: 0,
      stamina: 100,
      health: 100,
      isSprinting: false,
      isGrounded: true,
      currentChunkKey: '',
      currentChunkName: 'The Realm',
      currentChunkType: 'WILD',
      activeChunks: new Map(),
      globalAABBs: [],
      globalInteractables: [],
      chunkDeltas: {},
      timeOfDay: 8 / 24,
      gemsCollected: 0,
      currentInteractable: null,
      dialogueName: '',
      dialogueText: '',
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
    });
  });

  describe('initial state', () => {
    it('starts with gameActive false', () => {
      expect(useGameStore.getState().gameActive).toBe(false);
    });

    it('starts with stamina at 100', () => {
      expect(useGameStore.getState().stamina).toBe(100);
    });

    it('starts with health at 100', () => {
      expect(useGameStore.getState().health).toBe(100);
    });

    it('starts with gemsCollected at 0', () => {
      expect(useGameStore.getState().gemsCollected).toBe(0);
    });

    it('has correct initial player position', () => {
      const pos = useGameStore.getState().playerPosition;
      expect(pos.x).toBe(60);
      expect(pos.y).toBe(1.6);
      expect(pos.z).toBe(60);
    });
  });

  describe('setGameActive', () => {
    it('sets gameActive to true', () => {
      useGameStore.getState().setGameActive(true);
      expect(useGameStore.getState().gameActive).toBe(true);
    });

    it('sets gameActive to false', () => {
      useGameStore.getState().setGameActive(true);
      useGameStore.getState().setGameActive(false);
      expect(useGameStore.getState().gameActive).toBe(false);
    });
  });

  describe('setSeedPhrase', () => {
    it('sets the seed phrase', () => {
      useGameStore.getState().setSeedPhrase('Test Seed');
      expect(useGameStore.getState().seedPhrase).toBe('Test Seed');
    });
  });

  describe('startGame', () => {
    it('sets all game state atomically', () => {
      const pos = new THREE.Vector3(100, 2, 100);
      useGameStore.getState().startGame('My Seed', pos, 0);

      const state = useGameStore.getState();
      expect(state.gameActive).toBe(true);
      expect(state.seedPhrase).toBe('My Seed');
      expect(state.playerPosition.x).toBe(100);
      expect(state.playerPosition.y).toBe(2);
      expect(state.playerPosition.z).toBe(100);
      expect(state.cameraYaw).toBe(0);
    });

    it('resets world state on start', () => {
      // Set some state first
      useGameStore.getState().setHealth(50);
      useGameStore.getState().setStamina(50);

      const pos = new THREE.Vector3(100, 2, 100);
      useGameStore.getState().startGame('My Seed', pos, 0);

      expect(useGameStore.getState().health).toBe(100);
      expect(useGameStore.getState().stamina).toBe(100);
    });
  });

  describe('resetGame', () => {
    it('resets world state but not gameActive', () => {
      useGameStore.getState().setGameActive(true);
      useGameStore.getState().setHealth(50);
      useGameStore.getState().resetGame();

      expect(useGameStore.getState().health).toBe(100);
      expect(useGameStore.getState().gemsCollected).toBe(0);
      // gameActive should not be affected by resetGame
    });

    it('clears dialogue state', () => {
      useGameStore.getState().openDialogue('NPC', 'Hello');
      useGameStore.getState().resetGame();

      expect(useGameStore.getState().inDialogue).toBe(false);
      expect(useGameStore.getState().dialogueName).toBe('');
    });
  });

  describe('player position', () => {
    it('setPlayerPosition clones the vector', () => {
      const original = new THREE.Vector3(10, 20, 30);
      useGameStore.getState().setPlayerPosition(original);

      const stored = useGameStore.getState().playerPosition;
      expect(stored.x).toBe(10);
      expect(stored.y).toBe(20);
      expect(stored.z).toBe(30);

      // Modifying original should not affect stored
      original.set(100, 100, 100);
      expect(useGameStore.getState().playerPosition.x).toBe(10);
    });

    it('updatePlayerY only updates Y coordinate', () => {
      useGameStore.getState().setPlayerPosition(new THREE.Vector3(10, 20, 30));
      useGameStore.getState().updatePlayerY(50);

      const pos = useGameStore.getState().playerPosition;
      expect(pos.x).toBe(10);
      expect(pos.y).toBe(50);
      expect(pos.z).toBe(30);
    });
  });

  describe('velocity and camera', () => {
    it('setPlayerVelocityY sets vertical velocity', () => {
      useGameStore.getState().setPlayerVelocityY(5);
      expect(useGameStore.getState().playerVelocityY).toBe(5);
    });

    it('setVelocity sets movement velocity', () => {
      useGameStore.getState().setVelocity(3);
      expect(useGameStore.getState().velocity).toBe(3);
    });

    it('setAngularVelocity sets angular velocity', () => {
      useGameStore.getState().setAngularVelocity(1.5);
      expect(useGameStore.getState().angularVelocity).toBe(1.5);
    });

    it('setCameraYaw sets camera yaw', () => {
      useGameStore.getState().setCameraYaw(Math.PI / 2);
      expect(useGameStore.getState().cameraYaw).toBe(Math.PI / 2);
    });

    it('setCameraPitch sets camera pitch', () => {
      useGameStore.getState().setCameraPitch(0.5);
      expect(useGameStore.getState().cameraPitch).toBe(0.5);
    });
  });

  describe('stamina and health', () => {
    it('setStamina clamps to 0-100 range', () => {
      useGameStore.getState().setStamina(150);
      expect(useGameStore.getState().stamina).toBe(100);

      useGameStore.getState().setStamina(-50);
      expect(useGameStore.getState().stamina).toBe(0);

      useGameStore.getState().setStamina(50);
      expect(useGameStore.getState().stamina).toBe(50);
    });

    it('setHealth clamps to 0-100 range', () => {
      useGameStore.getState().setHealth(150);
      expect(useGameStore.getState().health).toBe(100);

      useGameStore.getState().setHealth(-50);
      expect(useGameStore.getState().health).toBe(0);

      useGameStore.getState().setHealth(75);
      expect(useGameStore.getState().health).toBe(75);
    });

    it('setIsSprinting toggles sprinting', () => {
      useGameStore.getState().setIsSprinting(true);
      expect(useGameStore.getState().isSprinting).toBe(true);

      useGameStore.getState().setIsSprinting(false);
      expect(useGameStore.getState().isSprinting).toBe(false);
    });

    it('setIsGrounded toggles grounded state', () => {
      useGameStore.getState().setIsGrounded(false);
      expect(useGameStore.getState().isGrounded).toBe(false);

      useGameStore.getState().setIsGrounded(true);
      expect(useGameStore.getState().isGrounded).toBe(true);
    });
  });

  describe('chunk management', () => {
    it('setCurrentChunk updates chunk info', () => {
      useGameStore.getState().setCurrentChunk('0,0', 'TestTown', 'TOWN');

      expect(useGameStore.getState().currentChunkKey).toBe('0,0');
      expect(useGameStore.getState().currentChunkName).toBe('TestTown');
      expect(useGameStore.getState().currentChunkType).toBe('TOWN');
    });

    it('addChunk adds to activeChunks', () => {
      const chunk = {
        cx: 0,
        cz: 0,
        key: '0,0',
        type: 'TOWN' as const,
        name: 'Test',
        collidables: [],
        interactables: [],
        collectedGems: new Set<number>(),
      };

      useGameStore.getState().addChunk(chunk);
      expect(useGameStore.getState().activeChunks.has('0,0')).toBe(true);
    });

    it('removeChunk removes from activeChunks', () => {
      const chunk = {
        cx: 0,
        cz: 0,
        key: '0,0',
        type: 'TOWN' as const,
        name: 'Test',
        collidables: [],
        interactables: [],
        collectedGems: new Set<number>(),
      };

      useGameStore.getState().addChunk(chunk);
      useGameStore.getState().removeChunk('0,0');
      expect(useGameStore.getState().activeChunks.has('0,0')).toBe(false);
    });
  });

  describe('AABBs and interactables', () => {
    it('addGlobalAABBs adds AABBs', () => {
      const aabbs = [{ minX: 0, maxX: 10, minZ: 0, maxZ: 10 }];
      useGameStore.getState().addGlobalAABBs(aabbs);
      expect(useGameStore.getState().globalAABBs).toHaveLength(1);
    });

    it('removeGlobalAABBs removes AABBs', () => {
      const aabb = { minX: 0, maxX: 10, minZ: 0, maxZ: 10 };
      useGameStore.getState().addGlobalAABBs([aabb]);
      useGameStore.getState().removeGlobalAABBs([aabb]);
      expect(useGameStore.getState().globalAABBs).toHaveLength(0);
    });

    it('addGlobalInteractables adds interactables', () => {
      const interactable = {
        id: 'test',
        position: new THREE.Vector3(),
        radius: 2,
        type: 'wanderer' as const,
        name: 'Test NPC',
        dialogueText: 'Hello',
        actionVerb: 'Talk to',
      };
      useGameStore.getState().addGlobalInteractables([interactable]);
      expect(useGameStore.getState().globalInteractables).toHaveLength(1);
    });

    it('removeGlobalInteractables removes interactables', () => {
      const interactable = {
        id: 'test',
        position: new THREE.Vector3(),
        radius: 2,
        type: 'wanderer' as const,
        name: 'Test NPC',
        dialogueText: 'Hello',
        actionVerb: 'Talk to',
      };
      useGameStore.getState().addGlobalInteractables([interactable]);
      useGameStore.getState().removeGlobalInteractables([interactable]);
      expect(useGameStore.getState().globalInteractables).toHaveLength(0);
    });

    it('handles null/undefined in AABB operations', () => {
      // Should not throw
      useGameStore.getState().addGlobalAABBs([]);
      useGameStore.getState().removeGlobalAABBs([]);
    });

    it('handles edge case with undefined arrays passed to add/remove', () => {
      // Test defensive coding for undefined inputs
      useGameStore.getState().addGlobalAABBs(undefined as any);
      useGameStore.getState().removeGlobalAABBs(undefined as any);
      useGameStore.getState().addGlobalInteractables(undefined as any);
      useGameStore.getState().removeGlobalInteractables(undefined as any);

      // Should not have crashed
      expect(useGameStore.getState().globalAABBs).toBeDefined();
      expect(useGameStore.getState().globalInteractables).toBeDefined();
    });

    it('removeGlobalAABBs leaves non-matching AABBs', () => {
      const aabb1 = { minX: 0, maxX: 10, minZ: 0, maxZ: 10 };
      const aabb2 = { minX: 20, maxX: 30, minZ: 20, maxZ: 30 };
      useGameStore.getState().addGlobalAABBs([aabb1, aabb2]);
      useGameStore.getState().removeGlobalAABBs([aabb1]);
      expect(useGameStore.getState().globalAABBs).toHaveLength(1);
      expect(useGameStore.getState().globalAABBs[0]).toBe(aabb2);
    });

    it('removeGlobalInteractables leaves non-matching interactables', () => {
      const interactable1 = {
        id: 'test1',
        position: new THREE.Vector3(),
        radius: 2,
        type: 'wanderer' as const,
        name: 'Test NPC 1',
        dialogueText: 'Hello 1',
        actionVerb: 'Talk to',
      };
      const interactable2 = {
        id: 'test2',
        position: new THREE.Vector3(),
        radius: 2,
        type: 'merchant' as const,
        name: 'Test NPC 2',
        dialogueText: 'Hello 2',
        actionVerb: 'Trade with',
      };
      useGameStore
        .getState()
        .addGlobalInteractables([interactable1, interactable2]);
      useGameStore.getState().removeGlobalInteractables([interactable1]);
      expect(useGameStore.getState().globalInteractables).toHaveLength(1);
      expect(useGameStore.getState().globalInteractables[0]).toBe(
        interactable2,
      );
    });
  });

  describe('time and gems', () => {
    it('setTimeOfDay wraps around at 1', () => {
      useGameStore.getState().setTimeOfDay(0.5);
      expect(useGameStore.getState().timeOfDay).toBe(0.5);

      useGameStore.getState().setTimeOfDay(1.2);
      expect(useGameStore.getState().timeOfDay).toBeCloseTo(0.2);
    });

    it('collectGem increments counter and tracks in deltas', () => {
      useGameStore.getState().collectGem('0,0', 1);
      expect(useGameStore.getState().gemsCollected).toBe(1);
      expect(useGameStore.getState().chunkDeltas['0,0'].gems).toContain(1);
    });

    it('collectGem does not duplicate gem IDs', () => {
      useGameStore.getState().collectGem('0,0', 1);
      useGameStore.getState().collectGem('0,0', 1);
      // Should still only count once in deltas
      expect(
        useGameStore.getState().chunkDeltas['0,0'].gems.filter((g) => g === 1),
      ).toHaveLength(1);
    });
  });

  describe('dialogue', () => {
    it('openDialogue sets dialogue state', () => {
      useGameStore.getState().openDialogue('TestNPC', 'Hello there!');

      expect(useGameStore.getState().inDialogue).toBe(true);
      expect(useGameStore.getState().dialogueName).toBe('TestNPC');
      expect(useGameStore.getState().dialogueText).toBe('Hello there!');
    });

    it('closeDialogue closes dialogue', () => {
      useGameStore.getState().openDialogue('TestNPC', 'Hello');
      useGameStore.getState().closeDialogue();

      expect(useGameStore.getState().inDialogue).toBe(false);
    });

    it('setCurrentInteractable sets interactable', () => {
      const interactable = {
        id: 'test',
        position: new THREE.Vector3(),
        radius: 2,
        type: 'wanderer' as const,
        name: 'Test NPC',
        dialogueText: 'Hello',
        actionVerb: 'Talk to',
      };

      useGameStore.getState().setCurrentInteractable(interactable);
      expect(useGameStore.getState().currentInteractable).toBe(interactable);

      useGameStore.getState().setCurrentInteractable(null);
      expect(useGameStore.getState().currentInteractable).toBeNull();
    });
  });

  describe('input', () => {
    it('setKey sets individual keys', () => {
      useGameStore.getState().setKey('w', true);
      expect(useGameStore.getState().keys.w).toBe(true);

      useGameStore.getState().setKey('w', false);
      expect(useGameStore.getState().keys.w).toBe(false);
    });

    it('setJoystick sets joystick state', () => {
      useGameStore.getState().setJoystick({ x: 0.5, y: -0.3 }, 0.7);

      expect(useGameStore.getState().joystickVector.x).toBe(0.5);
      expect(useGameStore.getState().joystickVector.y).toBe(-0.3);
      expect(useGameStore.getState().joystickDist).toBe(0.7);
    });

    it('setMouseDown sets mouse state', () => {
      useGameStore.getState().setMouseDown(true);
      expect(useGameStore.getState().mouseDown).toBe(true);

      useGameStore.getState().setMouseDown(false);
      expect(useGameStore.getState().mouseDown).toBe(false);
    });
  });

  describe('generateNewSeed', () => {
    it('generates and sets a new seed', () => {
      const seed = useGameStore.getState().generateNewSeed();
      expect(typeof seed).toBe('string');
      expect(seed.length).toBeGreaterThan(0);
      expect(useGameStore.getState().seedPhrase).toBe(seed);
    });
  });
});
