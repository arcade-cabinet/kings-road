import { describe, expect, it } from 'vitest';
import type { TownConfig } from '../../schemas/town.schema';
import { layoutTown, generateBoundary, generateApproach } from './town-layout';

const ashfordConfig: TownConfig = {
  id: 'ashford',
  name: 'Ashford',
  layout: 'organic',
  boundary: 'palisade',
  approach: 'meadow_stream',
  center: [0, 0],
  buildings: [
    { archetype: 'cottage', label: 'Your Home', position: [0, 3], rotation: 10 },
    { archetype: 'tavern', label: 'The Golden Meadow', position: [-4, -1], rotation: 0 },
    { archetype: 'smithy', label: "Aldric's Forge", position: [3, -2], rotation: -15 },
  ],
  npcs: [],
};

describe('layoutTown', () => {
  it('places all buildings from config', () => {
    const placed = layoutTown(ashfordConfig, 0, 0);
    expect(placed.length).toBe(3);
  });

  it('assigns correct labels', () => {
    const placed = layoutTown(ashfordConfig, 0, 0);
    expect(placed[0].label).toBe('Your Home');
    expect(placed[1].label).toBe('The Golden Meadow');
    expect(placed[2].label).toBe("Aldric's Forge");
  });

  it('converts tile positions to world coordinates', () => {
    const placed = layoutTown(ashfordConfig, 100, 200);
    // Center is [0,0] so buildings are offset from chunk origin
    // Cottage at [0, 3] tiles -> roughly 100 + 0*4, 200 + 3*4 = (100, 212) +/- jitter
    expect(placed[0].worldX).toBeCloseTo(100, -1);
    expect(placed[0].worldZ).toBeCloseTo(212, -1);
  });

  it('preserves building overrides', () => {
    const config: TownConfig = {
      ...ashfordConfig,
      buildings: [
        { archetype: 'tavern', label: 'Inn', position: [0, 0], rotation: 0, overrides: { stories: 2 } },
      ],
    };
    const placed = layoutTown(config, 0, 0);
    expect(placed[0].overrides).toEqual({ stories: 2 });
  });
});

describe('generateBoundary', () => {
  it('generates palisade segments for palisade boundary', () => {
    const segments = generateBoundary(ashfordConfig, 0, 0);
    expect(segments.length).toBeGreaterThan(10);
    expect(segments[0].height).toBe(3.0);
  });

  it('returns empty for no boundary', () => {
    const config: TownConfig = { ...ashfordConfig, boundary: 'none' };
    const segments = generateBoundary(config, 0, 0);
    expect(segments.length).toBe(0);
  });

  it('has a gap for the gate', () => {
    const segments = generateBoundary(ashfordConfig, 0, 0);
    // Gate is at angle PI/2 -- check that no segments are near that angle
    const gateAngle = Math.PI / 2;
    const nearGate = segments.filter(s => {
      const angle = Math.atan2(s.z, s.x);
      return Math.abs(angle - gateAngle) < 0.2;
    });
    // Should have fewer segments near the gate
    expect(nearGate.length).toBeLessThan(segments.length / 4);
  });
});

describe('generateApproach', () => {
  it('returns approach data extending south from town', () => {
    const approach = generateApproach(ashfordConfig, 0, 0);
    expect(approach.type).toBe('meadow_stream');
    expect(approach.startZ).toBeLessThan(approach.endZ);
    expect(approach.width).toBeGreaterThan(0);
  });
});
