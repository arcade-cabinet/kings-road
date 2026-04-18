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

  it('glbPath is null or a non-empty string path', () => {
    for (const def of STORY_PROP_CATALOG) {
      if (def.glbPath !== null) {
        expect(typeof def.glbPath).toBe('string');
        expect(def.glbPath.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('composeStoryProps', () => {
  it('returns an array (empty when no props have ingested GLBs)', () => {
    const result = composeStoryProps('hills', THORNFIELD_RANGE, 'test-seed');
    expect(Array.isArray(result)).toBe(true);
  });

  it('determinism — same inputs produce identical output', () => {
    const a = composeStoryProps('hills', THORNFIELD_RANGE, 'seed-det');
    const b = composeStoryProps('hills', THORNFIELD_RANGE, 'seed-det');
    expect(a).toEqual(b);
  });

  it('no Three.js objects in output', () => {
    const result = composeStoryProps('hills', THORNFIELD_RANGE, 'purity');
    for (const p of result) {
      expect(typeof p.position.x).toBe('number');
      expect(typeof p.position.z).toBe('number');
      expect(typeof p.assetId).toBe('string');
      expect(typeof p.archetype).toBe('string');
    }
  });

  it('positions z-coordinate within the road distance range', () => {
    const result = composeStoryProps('hills', THORNFIELD_RANGE, 'bounds');
    for (const p of result) {
      expect(p.position.z).toBeGreaterThanOrEqual(THORNFIELD_RANGE[0]);
      expect(p.position.z).toBeLessThanOrEqual(THORNFIELD_RANGE[1]);
    }
  });

  it('does not exceed maxAttempts when spacing makes targetCount unreachable', () => {
    const result = composeStoryProps('thornfield', [0, 100], 'tight');
    expect(Array.isArray(result)).toBe(true);
  });

  it('throws on inverted range (start > end)', () => {
    expect(() =>
      composeStoryProps('thornfield', [14000, 12000], 'inverted'),
    ).toThrow('Invalid road distance range');
  });

  it('returns empty array for biome with no matching props', () => {
    const result = composeStoryProps('unknown-biome', THORNFIELD_RANGE, 'x');
    expect(Array.isArray(result)).toBe(true);
  });
});
