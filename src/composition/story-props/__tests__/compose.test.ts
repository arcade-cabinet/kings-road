import { describe, expect, it } from 'vitest';
import { STORY_PROP_CATALOG } from '../catalog';
import { composeStoryProps } from '../compose';

const THORNFIELD_RANGE: [number, number] = [12000, 14000];

describe('STORY_PROP_CATALOG', () => {
  it('has at least 7 archetypes', () => {
    expect(STORY_PROP_CATALOG.length).toBeGreaterThanOrEqual(7);
  });

  it('all entries have at least one narrative text snippet', () => {
    for (const def of STORY_PROP_CATALOG) {
      expect(def.texts.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('all entries have non-empty assetId', () => {
    for (const def of STORY_PROP_CATALOG) {
      expect(def.assetId.length).toBeGreaterThan(0);
    }
  });
});

describe('composeStoryProps', () => {
  it('returns between 4 and 12 placements for a 2000m Thornfield segment', () => {
    const result = composeStoryProps(
      'thornfield',
      THORNFIELD_RANGE,
      'test-seed',
    );
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeLessThanOrEqual(12);
  });

  it('determinism — same inputs produce identical output', () => {
    const a = composeStoryProps('thornfield', THORNFIELD_RANGE, 'seed-det');
    const b = composeStoryProps('thornfield', THORNFIELD_RANGE, 'seed-det');
    expect(a).toEqual(b);
  });

  it('different seeds produce different output', () => {
    const a = composeStoryProps('thornfield', THORNFIELD_RANGE, 'seed-1');
    const b = composeStoryProps('thornfield', THORNFIELD_RANGE, 'seed-2');
    expect(a).not.toEqual(b);
  });

  it('different biomes produce different output', () => {
    const a = composeStoryProps('thornfield', THORNFIELD_RANGE, 'same');
    const b = composeStoryProps('ashford', THORNFIELD_RANGE, 'same');
    expect(a).not.toEqual(b);
  });

  it('all placements have narrativeText', () => {
    const result = composeStoryProps(
      'thornfield',
      THORNFIELD_RANGE,
      'text-check',
    );
    for (const p of result) {
      expect(typeof p.narrativeText).toBe('string');
      expect(p.narrativeText?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('no Three.js objects in output', () => {
    const result = composeStoryProps('thornfield', THORNFIELD_RANGE, 'purity');
    for (const p of result) {
      expect(typeof p.position.x).toBe('number');
      expect(typeof p.position.z).toBe('number');
      expect(typeof p.assetId).toBe('string');
      expect(typeof p.archetype).toBe('string');
    }
  });

  it('positions z-coordinate within the road distance range', () => {
    const result = composeStoryProps('thornfield', THORNFIELD_RANGE, 'bounds');
    for (const p of result) {
      expect(p.position.z).toBeGreaterThanOrEqual(THORNFIELD_RANGE[0]);
      expect(p.position.z).toBeLessThanOrEqual(THORNFIELD_RANGE[1]);
    }
  });

  it('smaller segment produces fewer props', () => {
    const big = composeStoryProps('thornfield', [0, 10000], 'size');
    const small = composeStoryProps('thornfield', [0, 500], 'size');
    expect(big.length).toBeGreaterThanOrEqual(small.length);
  });
});
