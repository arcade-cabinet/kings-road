import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadRoadSpine,
  clearRoadSpineCache,
  getAnchorAtDistance,
  getNextAnchor,
  getAnchorById,
} from './road-spine';

describe('road-spine loader', () => {
  beforeEach(() => {
    clearRoadSpineCache();
  });

  describe('loadRoadSpine', () => {
    it('loads and validates the road spine JSON', () => {
      const spine = loadRoadSpine();
      expect(spine.totalDistance).toBe(30000);
      expect(spine.anchors.length).toBeGreaterThanOrEqual(2);
    });

    it('returns the same cached instance on subsequent calls', () => {
      const first = loadRoadSpine();
      const second = loadRoadSpine();
      expect(first).toBe(second);
    });

    it('first anchor is at distance 0 (home town)', () => {
      const spine = loadRoadSpine();
      expect(spine.anchors[0].distanceFromStart).toBe(0);
      expect(spine.anchors[0].id).toBe('home');
    });

    it('anchors are in ascending distance order', () => {
      const spine = loadRoadSpine();
      for (let i = 1; i < spine.anchors.length; i++) {
        expect(spine.anchors[i].distanceFromStart).toBeGreaterThan(
          spine.anchors[i - 1].distanceFromStart,
        );
      }
    });

    it('all anchors have required fields', () => {
      const spine = loadRoadSpine();
      for (const anchor of spine.anchors) {
        expect(anchor.id).toBeTruthy();
        expect(anchor.name).toBeTruthy();
        expect(anchor.type).toBeTruthy();
        expect(typeof anchor.distanceFromStart).toBe('number');
        expect(anchor.mainQuestChapter).toBeTruthy();
        expect(anchor.description.length).toBeGreaterThanOrEqual(10);
        expect(anchor.features.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('getAnchorAtDistance', () => {
    it('returns the home anchor at distance 0', () => {
      const anchor = getAnchorAtDistance(0);
      expect(anchor).not.toBeNull();
      expect(anchor!.id).toBe('home');
    });

    it('returns an anchor within default threshold (500)', () => {
      const anchor = getAnchorAtDistance(5800);
      expect(anchor).not.toBeNull();
      expect(anchor!.id).toBe('anchor-01');
    });

    it('returns null when no anchor is within threshold', () => {
      const anchor = getAnchorAtDistance(3000);
      expect(anchor).toBeNull();
    });

    it('returns the closest anchor when multiple are within threshold', () => {
      // Distance 5900 is 100 away from anchor-01 (6000)
      const anchor = getAnchorAtDistance(5900);
      expect(anchor).not.toBeNull();
      expect(anchor!.id).toBe('anchor-01');
    });

    it('supports a custom threshold', () => {
      // Distance 3000 is far from any anchor with default threshold
      const noAnchor = getAnchorAtDistance(3000, 500);
      expect(noAnchor).toBeNull();

      // With a large threshold, it should find the closest
      const anchor = getAnchorAtDistance(3000, 3500);
      expect(anchor).not.toBeNull();
    });

    it('returns the last anchor near the end', () => {
      const anchor = getAnchorAtDistance(28000);
      expect(anchor).not.toBeNull();
      expect(anchor!.id).toBe('anchor-05');
    });
  });

  describe('getNextAnchor', () => {
    it('returns the first anchor after distance 0', () => {
      // Distance 0 is exactly at home, so next is anchor-01
      const anchor = getNextAnchor(0);
      expect(anchor).not.toBeNull();
      expect(anchor!.id).toBe('anchor-01');
    });

    it('returns Millbrook when standing before it', () => {
      const anchor = getNextAnchor(4000);
      expect(anchor).not.toBeNull();
      expect(anchor!.id).toBe('anchor-01');
    });

    it('returns Thornfield Ruins when past Millbrook', () => {
      const anchor = getNextAnchor(6000);
      expect(anchor).not.toBeNull();
      expect(anchor!.id).toBe('anchor-02');
    });

    it('returns null when past the last anchor', () => {
      const anchor = getNextAnchor(28000);
      expect(anchor).toBeNull();
    });

    it('returns null when past totalDistance', () => {
      const anchor = getNextAnchor(35000);
      expect(anchor).toBeNull();
    });
  });

  describe('getAnchorById', () => {
    it('returns the home anchor by id', () => {
      const anchor = getAnchorById('home');
      expect(anchor).not.toBeNull();
      expect(anchor!.name).toBe('Ashford');
      expect(anchor!.distanceFromStart).toBe(0);
    });

    it('returns anchor-03 by id', () => {
      const anchor = getAnchorById('anchor-03');
      expect(anchor).not.toBeNull();
      expect(anchor!.name).toBe('Ravensgate');
    });

    it('returns null for nonexistent id', () => {
      const anchor = getAnchorById('nonexistent');
      expect(anchor).toBeNull();
    });

    it('finds every anchor by its id', () => {
      const spine = loadRoadSpine();
      for (const expected of spine.anchors) {
        const found = getAnchorById(expected.id);
        expect(found).not.toBeNull();
        expect(found!.name).toBe(expected.name);
      }
    });
  });
});
