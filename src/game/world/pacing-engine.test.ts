import { describe, it, expect } from 'vitest';
import {
  generatePlacements,
  generateRoadPacing,
  DEFAULT_PACING_CONFIG,
  type FeaturePlacement,
} from './pacing-engine';

describe('pacing-engine', () => {
  const seed = 'test-seed-alpha';
  const totalDistance = 30000;

  describe('generatePlacements', () => {
    it('produces a non-empty array of placements', () => {
      const placements = generatePlacements(totalDistance, DEFAULT_PACING_CONFIG, seed);
      expect(placements.length).toBeGreaterThan(0);
    });

    it('placements are sorted by distance', () => {
      const placements = generatePlacements(totalDistance, DEFAULT_PACING_CONFIG, seed);
      for (let i = 1; i < placements.length; i++) {
        expect(placements[i].distance).toBeGreaterThanOrEqual(placements[i - 1].distance);
      }
    });

    it('all placements are within [0, totalDistance)', () => {
      const placements = generatePlacements(totalDistance, DEFAULT_PACING_CONFIG, seed);
      for (const p of placements) {
        expect(p.distance).toBeGreaterThanOrEqual(0);
        expect(p.distance).toBeLessThan(totalDistance);
      }
    });

    it('includes all three tiers', () => {
      const placements = generatePlacements(totalDistance, DEFAULT_PACING_CONFIG, seed);
      const tiers = new Set(placements.map((p) => p.tier));
      expect(tiers.has('ambient')).toBe(true);
      expect(tiers.has('minor')).toBe(true);
      expect(tiers.has('major')).toBe(true);
    });

    it('ambient placements are more frequent than minor', () => {
      const placements = generatePlacements(totalDistance, DEFAULT_PACING_CONFIG, seed);
      const ambientCount = placements.filter((p) => p.tier === 'ambient').length;
      const minorCount = placements.filter((p) => p.tier === 'minor').length;
      expect(ambientCount).toBeGreaterThan(minorCount);
    });

    it('minor placements are more frequent than major', () => {
      const placements = generatePlacements(totalDistance, DEFAULT_PACING_CONFIG, seed);
      const minorCount = placements.filter((p) => p.tier === 'minor').length;
      const majorCount = placements.filter((p) => p.tier === 'major').length;
      expect(minorCount).toBeGreaterThan(majorCount);
    });

    it('each placement has a featureId', () => {
      const placements = generatePlacements(totalDistance, DEFAULT_PACING_CONFIG, seed);
      for (const p of placements) {
        expect(p.featureId).toBeTruthy();
        expect(p.featureId).toContain(p.tier);
      }
    });

    it('distances are rounded integers', () => {
      const placements = generatePlacements(totalDistance, DEFAULT_PACING_CONFIG, seed);
      for (const p of placements) {
        expect(Number.isInteger(p.distance)).toBe(true);
      }
    });
  });

  describe('determinism', () => {
    it('same seed produces identical placements', () => {
      const a = generatePlacements(totalDistance, DEFAULT_PACING_CONFIG, seed);
      const b = generatePlacements(totalDistance, DEFAULT_PACING_CONFIG, seed);
      expect(a).toEqual(b);
    });

    it('different seeds produce different placements', () => {
      const a = generatePlacements(totalDistance, DEFAULT_PACING_CONFIG, 'seed-one');
      const b = generatePlacements(totalDistance, DEFAULT_PACING_CONFIG, 'seed-two');
      // Extremely unlikely to be identical
      expect(a).not.toEqual(b);
    });

    it('determinism holds across multiple runs', () => {
      const results: FeaturePlacement[][] = [];
      for (let i = 0; i < 5; i++) {
        results.push(generatePlacements(totalDistance, DEFAULT_PACING_CONFIG, 'stable'));
      }
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });
  });

  describe('interval behavior', () => {
    it('ambient features have roughly expected density', () => {
      const placements = generatePlacements(totalDistance, DEFAULT_PACING_CONFIG, seed);
      const ambientPlacements = placements.filter((p) => p.tier === 'ambient');
      // Average interval is 300 (midpoint of [200, 400])
      // Expected count ~= 30000 / 300 = 100, but with jitter
      expect(ambientPlacements.length).toBeGreaterThan(50);
      expect(ambientPlacements.length).toBeLessThan(200);
    });

    it('major features have roughly expected density', () => {
      const placements = generatePlacements(totalDistance, DEFAULT_PACING_CONFIG, seed);
      const majorPlacements = placements.filter((p) => p.tier === 'major');
      // Average interval is 1200 (midpoint of [1000, 1400])
      // Expected count ~= 30000 / 1200 = 25, but with jitter
      expect(majorPlacements.length).toBeGreaterThan(10);
      expect(majorPlacements.length).toBeLessThan(50);
    });

    it('respects custom pacing config intervals', () => {
      const tightConfig = {
        ...DEFAULT_PACING_CONFIG,
        ambientInterval: [100, 100] as [number, number],
        minorInterval: [500, 500] as [number, number],
        majorInterval: [1000, 1000] as [number, number],
      };
      const placements = generatePlacements(10000, tightConfig, seed);
      const ambientCount = placements.filter((p) => p.tier === 'ambient').length;
      const minorCount = placements.filter((p) => p.tier === 'minor').length;
      const majorCount = placements.filter((p) => p.tier === 'major').length;

      // With zero jitter (min==max), counts should be close to exact
      // 10000/100 = 100 ambient, 10000/500 = 20 minor, 10000/1000 = 10 major
      // First placement is at offset, so count is ~(totalDistance/interval - 1)
      expect(ambientCount).toBeGreaterThanOrEqual(90);
      expect(ambientCount).toBeLessThanOrEqual(100);
      expect(minorCount).toBeGreaterThanOrEqual(15);
      expect(minorCount).toBeLessThanOrEqual(20);
      expect(majorCount).toBeGreaterThanOrEqual(8);
      expect(majorCount).toBeLessThanOrEqual(10);
    });
  });

  describe('edge cases', () => {
    it('short road produces few placements', () => {
      const placements = generatePlacements(500, DEFAULT_PACING_CONFIG, seed);
      // With a 500-unit road, major features (interval 1000-1400) won't appear
      const majorCount = placements.filter((p) => p.tier === 'major').length;
      expect(majorCount).toBe(0);
    });

    it('empty road produces no placements', () => {
      const placements = generatePlacements(0, DEFAULT_PACING_CONFIG, seed);
      expect(placements).toEqual([]);
    });
  });

  describe('generateRoadPacing', () => {
    it('validates config and produces placements', () => {
      const placements = generateRoadPacing(totalDistance, DEFAULT_PACING_CONFIG, seed);
      expect(placements.length).toBeGreaterThan(0);
      expect(placements[0].tier).toBeDefined();
    });

    it('throws on invalid config', () => {
      const badConfig = {
        ...DEFAULT_PACING_CONFIG,
        ambientInterval: [500, 100], // min > max, invalid
      };
      expect(() =>
        generateRoadPacing(totalDistance, badConfig as any, seed),
      ).toThrow();
    });
  });
});
