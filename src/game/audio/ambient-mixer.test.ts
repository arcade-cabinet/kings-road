import { describe, expect, it } from 'vitest';
import type { AudioZone } from './ambient-mixer';
import { computeAmbientMix } from './ambient-mixer';

describe('computeAmbientMix', () => {
  it('always has wind', () => {
    const mix = computeAmbientMix(0.5, [], 0, 0);
    expect(mix.wind).toBeGreaterThan(0);
  });

  it('has birds during daytime (noon)', () => {
    const mix = computeAmbientMix(0.5, [], 0, 0);
    expect(mix.birds).toBeGreaterThan(0);
  });

  it('has no birds at midnight', () => {
    const mix = computeAmbientMix(0, [], 0, 0);
    expect(mix.birds).toBe(0);
  });

  it('has crickets at night', () => {
    const mix = computeAmbientMix(0.85, [], 0, 0);
    expect(mix.crickets).toBeGreaterThan(0);
  });

  it('has no crickets at noon', () => {
    const mix = computeAmbientMix(0.5, [], 0, 0);
    expect(mix.crickets).toBe(0);
  });

  it('computes water volume from nearby zone', () => {
    const zones: AudioZone[] = [
      { type: 'water', x: 10, z: 10, radius: 20, volume: 0.8 },
    ];
    const mix = computeAmbientMix(0.5, zones, 10, 10);
    expect(mix.water).toBe(0.8); // at center
  });

  it('reduces water volume with distance', () => {
    const zones: AudioZone[] = [
      { type: 'water', x: 0, z: 0, radius: 20, volume: 1.0 },
    ];
    const mix = computeAmbientMix(0.5, zones, 10, 0);
    expect(mix.water).toBe(0.5); // half the radius away
  });

  it('has no water when out of range', () => {
    const zones: AudioZone[] = [
      { type: 'water', x: 0, z: 0, radius: 10, volume: 1.0 },
    ];
    const mix = computeAmbientMix(0.5, zones, 50, 50);
    expect(mix.water).toBe(0);
  });
});
