import { describe, expect, it } from 'vitest';
import { createRng, cyrb128, mulberry32 } from './random';

describe('cyrb128', () => {
  it('returns a number for any string', () => {
    const result = cyrb128('test-seed');
    expect(typeof result).toBe('number');
    expect(Number.isFinite(result)).toBe(true);
  });

  it('returns same hash for same input', () => {
    const a = cyrb128('my-seed');
    const b = cyrb128('my-seed');
    expect(a).toBe(b);
  });

  it('returns different hashes for different inputs', () => {
    const a = cyrb128('seed-1');
    const b = cyrb128('seed-2');
    expect(a).not.toBe(b);
  });

  it('handles empty string', () => {
    const result = cyrb128('');
    expect(typeof result).toBe('number');
  });

  it('handles long strings', () => {
    const result = cyrb128('a'.repeat(1000));
    expect(typeof result).toBe('number');
    expect(Number.isFinite(result)).toBe(true);
  });

  it('handles special characters', () => {
    const result = cyrb128('!@#$%^&*()_+-=[]{}|;:\'",./<>?');
    expect(typeof result).toBe('number');
  });

  it('handles unicode characters', () => {
    const result = cyrb128('Hello World');
    expect(typeof result).toBe('number');
  });
});

describe('mulberry32', () => {
  it('returns a function', () => {
    const rng = mulberry32(12345);
    expect(typeof rng).toBe('function');
  });

  it('generates numbers between 0 and 1', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('generates reproducible sequence for same seed', () => {
    const rng1 = mulberry32(12345);
    const rng2 = mulberry32(12345);

    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('generates different sequences for different seeds', () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);

    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());

    expect(seq1).not.toEqual(seq2);
  });

  it('handles edge case seeds', () => {
    const seeds = [0, 1, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
    for (const seed of seeds) {
      const rng = mulberry32(seed);
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('createRng', () => {
  it('creates an RNG from a string seed', () => {
    const rng = createRng('my-seed');
    expect(typeof rng).toBe('function');
  });

  it('generates numbers between 0 and 1', () => {
    const rng = createRng('test');
    for (let i = 0; i < 50; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('is reproducible with same string seed', () => {
    const rng1 = createRng('consistent-seed');
    const rng2 = createRng('consistent-seed');

    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('handles chunk coordinate style seeds', () => {
    const rng = createRng('my-seed1,2');
    expect(typeof rng()).toBe('number');
  });
});
