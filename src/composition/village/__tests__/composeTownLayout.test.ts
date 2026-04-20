import { describe, expect, it } from 'vitest';
import { createRng } from '@/core';
import { composeTownLayout } from '../composeTownLayout';
import type { VillageTownConfig } from '../types';

const BASIC: VillageTownConfig = {
  id: 'test-town',
  center: { x: 0, z: 0 },
  radius: 40,
  roles: ['house', 'house', 'tavern', 'landmark', 'house', 'barn', 'house'],
};

describe('composeTownLayout', () => {
  it('returns a non-empty array for a normal config', () => {
    const result = composeTownLayout(BASIC, createRng('town'));
    expect(result.length).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const a = composeTownLayout(BASIC, createRng('det'));
    const b = composeTownLayout(BASIC, createRng('det'));
    expect(a).toEqual(b);
  });

  it('never exceeds 20 buildings', () => {
    const big: VillageTownConfig = {
      ...BASIC,
      radius: 80,
      roles: Array.from({ length: 50 }, () => 'house'),
    };
    const result = composeTownLayout(big, createRng('big'));
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it('Poisson-disk spacing holds — no two buildings within minSpacing', () => {
    const result = composeTownLayout(BASIC, createRng('space'));
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];
        const dx = a.position.x - b.position.x;
        const dz = a.position.z - b.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const maxDimA = Math.max(a.footprint.width, a.footprint.depth);
        const maxDimB = Math.max(b.footprint.width, b.footprint.depth);
        const minSpacing = Math.max(maxDimA, maxDimB) + 2;
        expect(dist).toBeGreaterThanOrEqual(minSpacing - 0.001);
      }
    }
  });

  it('every slot faces the town center (rotationY = atan2 toward center)', () => {
    const result = composeTownLayout(BASIC, createRng('face'));
    for (const slot of result) {
      const expected = Math.atan2(
        BASIC.center.x - slot.position.x,
        BASIC.center.z - slot.position.z,
      );
      expect(slot.rotationY).toBeCloseTo(expected, 5);
    }
  });

  it('landmark role → 5×5 footprint', () => {
    const landmark: VillageTownConfig = {
      id: 'lm',
      center: { x: 0, z: 0 },
      radius: 60,
      roles: ['landmark'],
    };
    const result = composeTownLayout(landmark, createRng('lm'));
    expect(result[0].footprint).toEqual({ width: 5, depth: 5 });
  });

  it('non-landmark roles → 3×3 or 4×4 footprint only', () => {
    const houses: VillageTownConfig = {
      id: 'h',
      center: { x: 0, z: 0 },
      radius: 60,
      roles: Array.from({ length: 10 }, () => 'house'),
    };
    const result = composeTownLayout(houses, createRng('h'));
    for (const slot of result) {
      const valid =
        (slot.footprint.width === 3 && slot.footprint.depth === 3) ||
        (slot.footprint.width === 4 && slot.footprint.depth === 4);
      expect(valid).toBe(true);
    }
  });

  it('positions are plain Vec3 objects with y=0 ground level', () => {
    const result = composeTownLayout(BASIC, createRng('plain'));
    for (const slot of result) {
      expect(typeof slot.position.x).toBe('number');
      expect(slot.position.y).toBe(0);
      expect(typeof slot.position.z).toBe('number');
      expect(typeof slot.rotationY).toBe('number');
    }
  });
});
