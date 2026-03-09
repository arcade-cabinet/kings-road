import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type {
  AABB,
  ChunkData,
  ChunkDelta,
  ChunkType,
  InputState,
  Interactable,
  NPCType,
} from './types';

describe('type definitions', () => {
  describe('AABB', () => {
    it('can create valid AABB objects', () => {
      const aabb: AABB = {
        minX: 0,
        maxX: 10,
        minZ: 0,
        maxZ: 10,
      };
      expect(aabb.minX).toBe(0);
      expect(aabb.maxX).toBe(10);
      expect(aabb.minZ).toBe(0);
      expect(aabb.maxZ).toBe(10);
    });

    it('supports negative coordinates', () => {
      const aabb: AABB = {
        minX: -50,
        maxX: -10,
        minZ: -30,
        maxZ: -5,
      };
      expect(aabb.minX).toBeLessThan(aabb.maxX);
    });
  });

  describe('NPCType', () => {
    it('allows valid NPC types', () => {
      const types: NPCType[] = [
        'blacksmith',
        'innkeeper',
        'wanderer',
        'merchant',
      ];
      expect(types).toHaveLength(4);
    });
  });

  describe('Interactable', () => {
    it('can create valid Interactable objects', () => {
      const interactable: Interactable = {
        id: 'npc-1',
        position: new THREE.Vector3(10, 0, 10),
        radius: 2,
        type: 'blacksmith',
        name: 'Bjorn Iron-Arm',
        dialogueText: 'Welcome to my forge!',
        actionVerb: 'Talk to',
      };

      expect(interactable.id).toBe('npc-1');
      expect(interactable.type).toBe('blacksmith');
      expect(interactable.radius).toBe(2);
    });
  });

  describe('ChunkType', () => {
    it('allows all valid chunk types', () => {
      const types: ChunkType[] = ['WILD', 'TOWN', 'DUNGEON', 'ROAD'];
      expect(types).toHaveLength(4);
    });
  });

  describe('ChunkData', () => {
    it('can create valid ChunkData objects', () => {
      const chunk: ChunkData = {
        cx: 0,
        cz: 0,
        key: '0,0',
        type: 'TOWN',
        name: 'Oakford',
        collidables: [{ minX: 0, maxX: 5, minZ: 0, maxZ: 5 }],
        interactables: [],
        collectedGems: new Set([1, 2, 3]),
      };

      expect(chunk.cx).toBe(0);
      expect(chunk.cz).toBe(0);
      expect(chunk.key).toBe('0,0');
      expect(chunk.collectedGems.has(2)).toBe(true);
    });
  });

  describe('InputState', () => {
    it('can create valid InputState objects', () => {
      const input: InputState = {
        w: false,
        a: false,
        s: false,
        d: false,
        q: false,
        e: false,
        space: false,
        shift: false,
        action: false,
      };

      expect(input.w).toBe(false);
      expect(input.space).toBe(false);
    });

    it('supports toggling keys', () => {
      const input: InputState = {
        w: true,
        a: false,
        s: false,
        d: true,
        q: false,
        e: true,
        space: true,
        shift: false,
        action: true,
      };

      expect(input.w && input.d).toBe(true);
      expect(input.action).toBe(true);
    });
  });

  describe('ChunkDelta', () => {
    it('can create valid ChunkDelta objects', () => {
      const delta: ChunkDelta = {
        gems: [1, 5, 10],
      };

      expect(delta.gems).toHaveLength(3);
      expect(delta.gems).toContain(5);
    });

    it('supports empty gems array', () => {
      const delta: ChunkDelta = {
        gems: [],
      };

      expect(delta.gems).toHaveLength(0);
    });
  });
});
