import { describe, expect, it } from 'vitest';
import {
  distanceToLeagues,
  generateSignpostText,
  getAllSignpostPlacements,
} from './signpost-text';

const ANCHORS = [
  { name: 'Ashford', distanceFromStart: 0 },
  { name: 'Millbrook', distanceFromStart: 6000 },
  { name: 'Thornfield Ruins', distanceFromStart: 12000 },
  { name: 'Ravensgate', distanceFromStart: 17000 },
  { name: "The Pilgrim's Rest", distanceFromStart: 21000 },
  { name: 'Grailsend', distanceFromStart: 28000 },
];

const ANCHOR_IDS = [
  'home',
  'anchor-01',
  'anchor-02',
  'anchor-03',
  'anchor-04',
  'anchor-05',
];

describe('distanceToLeagues', () => {
  it('returns "near" for very short distances', () => {
    expect(distanceToLeagues(50)).toBe('near');
  });

  it('formats whole leagues correctly', () => {
    expect(distanceToLeagues(6000)).toBe('6 leagues');
  });

  it('formats 1 league without plural', () => {
    expect(distanceToLeagues(1000)).toBe('1 league');
  });

  it('formats fractional leagues to one decimal', () => {
    expect(distanceToLeagues(1500)).toBe('1.5 leagues');
  });

  it('rounds large distances to whole leagues', () => {
    expect(distanceToLeagues(10000)).toBe('10 leagues');
  });

  it('formats 7 leagues correctly', () => {
    expect(distanceToLeagues(7000)).toBe('7 leagues');
  });
});

describe('generateSignpostText', () => {
  it('returns no left arm for the first anchor (road start)', () => {
    const labels = generateSignpostText(ANCHORS, 0);
    expect(labels.left).toBeNull();
  });

  it('returns a right arm pointing to Millbrook from Ashford', () => {
    const labels = generateSignpostText(ANCHORS, 0);
    expect(labels.right).toContain('Millbrook');
    expect(labels.right).toContain('->');
    expect(labels.right).toContain('6 leagues');
  });

  it('returns both arms for a mid-road anchor', () => {
    const labels = generateSignpostText(ANCHORS, 2); // Thornfield Ruins
    expect(labels.left).not.toBeNull();
    expect(labels.right).not.toBeNull();
  });

  it('left arm at Thornfield points back to Millbrook with correct distance', () => {
    const labels = generateSignpostText(ANCHORS, 2); // Thornfield at 12000
    expect(labels.left).toContain('Millbrook');
    expect(labels.left).toContain('<-');
    expect(labels.left).toContain('6 leagues');
  });

  it('right arm at Thornfield points forward to Ravensgate with correct distance', () => {
    const labels = generateSignpostText(ANCHORS, 2); // Thornfield at 12000, Ravensgate at 17000
    expect(labels.right).toContain('Ravensgate');
    expect(labels.right).toContain('->');
    expect(labels.right).toContain('5 leagues');
  });

  it('returns no right arm for the last anchor (road end)', () => {
    const labels = generateSignpostText(ANCHORS, ANCHORS.length - 1);
    expect(labels.right).toBeNull();
  });

  it('returns a left arm for the last anchor pointing to previous', () => {
    const labels = generateSignpostText(ANCHORS, ANCHORS.length - 1); // Grailsend
    expect(labels.left).toContain("Pilgrim's Rest");
    expect(labels.left).toContain('<-');
  });

  it('returns both null for an empty anchors array', () => {
    const labels = generateSignpostText([], 0);
    expect(labels.left).toBeNull();
    expect(labels.right).toBeNull();
  });

  it('returns both null for out-of-bounds index', () => {
    const labels = generateSignpostText(ANCHORS, 99);
    expect(labels.left).toBeNull();
    expect(labels.right).toBeNull();
  });

  it('returns both null for negative index', () => {
    const labels = generateSignpostText(ANCHORS, -1);
    expect(labels.left).toBeNull();
    expect(labels.right).toBeNull();
  });
});

describe('getAllSignpostPlacements', () => {
  it('returns one placement per anchor', () => {
    const placements = getAllSignpostPlacements(ANCHORS, ANCHOR_IDS);
    expect(placements).toHaveLength(ANCHORS.length);
  });

  it('each placement carries the correct anchorId and distanceFromStart', () => {
    const placements = getAllSignpostPlacements(ANCHORS, ANCHOR_IDS);
    for (let i = 0; i < ANCHORS.length; i++) {
      expect(placements[i].anchorId).toBe(ANCHOR_IDS[i]);
      expect(placements[i].distanceFromStart).toBe(
        ANCHORS[i].distanceFromStart,
      );
    }
  });

  it('Ashford placement has no left arm', () => {
    const placements = getAllSignpostPlacements(ANCHORS, ANCHOR_IDS);
    expect(placements[0].labels.left).toBeNull();
  });

  it('Grailsend placement has no right arm', () => {
    const placements = getAllSignpostPlacements(ANCHORS, ANCHOR_IDS);
    expect(placements[placements.length - 1].labels.right).toBeNull();
  });
});
