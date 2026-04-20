import { describe, expect, it } from 'vitest';
import { computeMileMarkerPositions } from './mile-markers';

describe('computeMileMarkerPositions', () => {
  const TOTAL = 30000;
  const INTERVAL = 2000;

  describe('correct count', () => {
    it("emits 14 markers for the default King's Road (30000m, 2000m interval)", () => {
      const markers = computeMileMarkerPositions(TOTAL, INTERVAL);
      // 2km, 4km, … 28km → 14 markers (0 and 30 are boundary settlements)
      expect(markers).toHaveLength(14);
    });

    it('emits zero markers when totalDistance is 0', () => {
      expect(computeMileMarkerPositions(0, INTERVAL)).toHaveLength(0);
    });

    it('emits zero markers when intervalMeters is 0', () => {
      expect(computeMileMarkerPositions(TOTAL, 0)).toHaveLength(0);
    });

    it('emits zero markers when intervalMeters is negative', () => {
      expect(computeMileMarkerPositions(TOTAL, -500)).toHaveLength(0);
    });
  });

  describe('positions are every interval', () => {
    it('first marker is exactly one interval from start', () => {
      const markers = computeMileMarkerPositions(TOTAL, INTERVAL);
      expect(markers[0].distance).toBe(INTERVAL);
    });

    it('markers are spaced exactly intervalMeters apart', () => {
      const markers = computeMileMarkerPositions(TOTAL, INTERVAL);
      for (let i = 1; i < markers.length; i++) {
        expect(markers[i].distance - markers[i - 1].distance).toBe(INTERVAL);
      }
    });

    it('markers are sorted ascending', () => {
      const markers = computeMileMarkerPositions(TOTAL, INTERVAL);
      for (let i = 1; i < markers.length; i++) {
        expect(markers[i].distance).toBeGreaterThan(markers[i - 1].distance);
      }
    });

    it('no marker lands at distance 0', () => {
      const markers = computeMileMarkerPositions(TOTAL, INTERVAL);
      expect(markers.find((m) => m.distance === 0)).toBeUndefined();
    });

    it('no marker lands at totalDistance', () => {
      const markers = computeMileMarkerPositions(TOTAL, INTERVAL);
      expect(markers.find((m) => m.distance === TOTAL)).toBeUndefined();
    });
  });

  describe('boundary skip works', () => {
    it('skips markers within skipBoundary of 0', () => {
      // With interval=2000 and skipBoundary=2500, distance 2000 is skipped
      const markers = computeMileMarkerPositions(TOTAL, INTERVAL, 2500);
      expect(markers[0].distance).toBeGreaterThanOrEqual(2500);
    });

    it('skips markers within skipBoundary of totalDistance', () => {
      // With interval=2000 and skipBoundary=2500, distance 28000 is 2000 from
      // end — which is within skipBoundary=2500 of 30000, so it's skipped
      const markers = computeMileMarkerPositions(TOTAL, INTERVAL, 2500);
      const last = markers[markers.length - 1];
      expect(last.distance).toBeLessThanOrEqual(TOTAL - 2500);
    });

    it('default skipBoundary=1 only excludes exact boundary hits', () => {
      // interval=10000: distances 10000, 20000 — no exact hit on 0 or 30000
      const markers = computeMileMarkerPositions(TOTAL, 10000);
      expect(markers).toHaveLength(2);
      expect(markers[0].distance).toBe(10000);
      expect(markers[1].distance).toBe(20000);
    });
  });

  describe('labels are integer km', () => {
    it('every labelKm is an integer', () => {
      const markers = computeMileMarkerPositions(TOTAL, INTERVAL);
      for (const m of markers) {
        expect(Number.isInteger(m.labelKm)).toBe(true);
      }
    });

    it('labelKm equals distance divided by 1000', () => {
      const markers = computeMileMarkerPositions(TOTAL, INTERVAL);
      for (const m of markers) {
        expect(m.labelKm).toBe(m.distance / 1000);
      }
    });

    it('first marker has labelKm 2', () => {
      const markers = computeMileMarkerPositions(TOTAL, INTERVAL);
      expect(markers[0].labelKm).toBe(2);
    });

    it('last marker has labelKm 28', () => {
      const markers = computeMileMarkerPositions(TOTAL, INTERVAL);
      expect(markers[markers.length - 1].labelKm).toBe(28);
    });

    it('labelKm rounds correctly for non-exact intervals', () => {
      // 1500m interval → first marker at 1500 → labelKm = round(1500/1000) = 2
      const markers = computeMileMarkerPositions(10000, 1500);
      expect(markers[0].labelKm).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('custom small road produces correct count', () => {
      // 6000m, 2000m interval → distances 2000, 4000 → 2 markers (6000 excluded)
      const markers = computeMileMarkerPositions(6000, 2000);
      expect(markers).toHaveLength(2);
    });

    it('interval exactly equal to totalDistance gives zero markers', () => {
      // First would-be marker IS at totalDistance — excluded as boundary
      const markers = computeMileMarkerPositions(2000, 2000);
      expect(markers).toHaveLength(0);
    });
  });
});
