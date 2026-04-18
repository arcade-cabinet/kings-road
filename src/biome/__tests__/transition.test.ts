import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import forestJson from '../data/forest.json';
import meadowJson from '../data/meadow.json';
import thornfieldJson from '../data/thornfield.json';
import { BiomeConfigSchema } from '../schema';
import { BiomeService } from '../service';
import { computeBiomeTransition } from '../transition';

const meadow = BiomeConfigSchema.parse(meadowJson);
const forest = BiomeConfigSchema.parse(forestJson);
const thornfield = BiomeConfigSchema.parse(thornfieldJson);

const TEST_SPINE = {
  totalDistance: 30000,
  anchors: [
    { id: 'home', distanceFromStart: 0 },
    { id: 'anchor-01', distanceFromStart: 6000 },
    { id: 'anchor-02', distanceFromStart: 12000 },
    { id: 'anchor-03', distanceFromStart: 17000 },
  ],
  regions: [
    { biome: 'MEADOW', anchorRange: ['home', 'anchor-01'] as [string, string] },
    {
      biome: 'FOREST',
      anchorRange: ['anchor-01', 'anchor-02'] as [string, string],
    },
    {
      biome: 'THORNFIELD',
      anchorRange: ['anchor-02', 'anchor-03'] as [string, string],
    },
  ],
};

const BOUNDARY = 6000; // meadow → forest
const TRANSITION = 200;

beforeEach(() => {
  BiomeService.init([meadow, forest, thornfield], TEST_SPINE);
});

afterEach(() => {
  BiomeService.init([], {
    totalDistance: 30000,
    anchors: [{ id: 'x', distanceFromStart: 0 }],
  });
});

describe('computeBiomeTransition', () => {
  it('returns null deep inside a region', () => {
    const state = computeBiomeTransition(3000, TRANSITION);
    expect(state).toBeNull();
  });

  it('returns t=0 at boundary - transitionMeters (fully in current)', () => {
    const state = computeBiomeTransition(BOUNDARY - TRANSITION, TRANSITION);
    expect(state).not.toBeNull();
    expect(state?.from.id).toBe('meadow');
    expect(state?.to.id).toBe('forest');
    expect(state?.t).toBeCloseTo(0, 5);
  });

  it('returns t=0.5 at the boundary itself', () => {
    const state = computeBiomeTransition(BOUNDARY, TRANSITION);
    expect(state).not.toBeNull();
    expect(state?.from.id).toBe('meadow');
    expect(state?.to.id).toBe('forest');
    expect(state?.t).toBeCloseTo(0.5, 5);
  });

  it('returns t=1 at boundary + transitionMeters (fully in next)', () => {
    const state = computeBiomeTransition(BOUNDARY + TRANSITION, TRANSITION);
    expect(state).not.toBeNull();
    expect(state?.from.id).toBe('meadow');
    expect(state?.to.id).toBe('forest');
    expect(state?.t).toBeCloseTo(1, 5);
  });

  it('ramps monotonically across the boundary window', () => {
    const samples = [-150, -50, 0, 50, 150].map((offset) =>
      computeBiomeTransition(BOUNDARY + offset, TRANSITION),
    );
    const ts = samples.map((s) => s?.t ?? -1);
    for (let i = 1; i < ts.length; i++) {
      expect(ts[i]).toBeGreaterThan(ts[i - 1]);
    }
  });

  it('blends forest → thornfield at second boundary', () => {
    const state = computeBiomeTransition(12000, TRANSITION);
    expect(state).not.toBeNull();
    expect(state?.from.id).toBe('forest');
    expect(state?.to.id).toBe('thornfield');
    expect(state?.t).toBeCloseTo(0.5, 5);
  });

  it('returns null at a boundary between two regions sharing a biome id', () => {
    // A spine where the same biome (meadow) occupies two adjacent regions —
    // cross-fading a biome with itself is identity, so transition math
    // should short-circuit and return null instead of a from===to blend state.
    BiomeService.init([meadow, forest, thornfield], {
      totalDistance: 30000,
      anchors: [
        { id: 'a0', distanceFromStart: 0 },
        { id: 'a1', distanceFromStart: 6000 },
        { id: 'a2', distanceFromStart: 12000 },
      ],
      regions: [
        { biome: 'MEADOW', anchorRange: ['a0', 'a1'] as [string, string] },
        { biome: 'MEADOW', anchorRange: ['a1', 'a2'] as [string, string] },
      ],
    });
    // Leading edge of first meadow region — neighbor is meadow.
    expect(computeBiomeTransition(5900, TRANSITION)).toBeNull();
    // Boundary itself — falls into second region, trailing edge is meadow.
    expect(computeBiomeTransition(6000, TRANSITION)).toBeNull();
    // Trailing edge of second meadow region — previous neighbor is meadow.
    expect(computeBiomeTransition(6100, TRANSITION)).toBeNull();
  });
});
