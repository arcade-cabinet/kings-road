import { describe, expect, it } from 'vitest';
import {
  clamp,
  createRng,
  cyrb128,
  hashString,
  inverseLerp,
  lerp,
  mulberry32,
  smoothstep,
} from '../math';

describe('rng', () => {
  it('cyrb128 is stable for same input', () => {
    expect(cyrb128('test')).toBe(cyrb128('test'));
  });

  it('mulberry32 produces values in [0,1)', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 50; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('createRng is reproducible', () => {
    const a = createRng('seed');
    const b = createRng('seed');
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  it('hashString returns same value for same input', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
  });

  it('hashString differs for different inputs', () => {
    expect(hashString('abc')).not.toBe(hashString('xyz'));
  });
});

describe('interpolation', () => {
  it('lerp at t=0 returns a', () => {
    expect(lerp(0, 10, 0)).toBe(0);
  });

  it('lerp at t=1 returns b', () => {
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('lerp at t=0.5 returns midpoint', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it('clamp enforces min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamp enforces max', () => {
    expect(clamp(20, 0, 10)).toBe(10);
  });

  it('smoothstep returns 0 at edge0', () => {
    expect(smoothstep(0, 1, 0)).toBe(0);
  });

  it('smoothstep returns 1 at edge1', () => {
    expect(smoothstep(0, 1, 1)).toBe(1);
  });

  it('inverseLerp inverts lerp', () => {
    expect(inverseLerp(0, 10, 5)).toBeCloseTo(0.5);
  });
});
