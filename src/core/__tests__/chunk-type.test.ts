import { describe, expect, it } from 'vitest';
import { CHUNK_TYPES, isChunkType, parseChunkType } from '../types';

describe('ChunkType', () => {
  it('parseChunkType accepts all defined types', () => {
    for (const t of CHUNK_TYPES) {
      expect(() => parseChunkType(t)).not.toThrow();
    }
  });

  it('parseChunkType rejects unknown string', () => {
    expect(() => parseChunkType('TOWN')).toThrow(TypeError);
    expect(() => parseChunkType('WILD')).toThrow(TypeError);
    expect(() => parseChunkType('')).toThrow(TypeError);
  });

  it('isChunkType is a type guard', () => {
    expect(isChunkType('meadow')).toBe(true);
    expect(isChunkType('TOWN')).toBe(false);
    expect(isChunkType(42)).toBe(false);
  });

  it('CHUNK_TYPES includes expected terrain types', () => {
    expect(CHUNK_TYPES).toContain('ocean');
    expect(CHUNK_TYPES).toContain('town');
    expect(CHUNK_TYPES).toContain('dungeon');
    expect(CHUNK_TYPES).toContain('forest');
  });
});
