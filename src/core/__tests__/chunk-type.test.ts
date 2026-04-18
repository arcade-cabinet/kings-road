import { describe, expect, it } from 'vitest';
import { CHUNK_TYPES, isChunkType } from '../types';

describe('ChunkType', () => {
  it('isChunkType accepts all defined types', () => {
    for (const t of CHUNK_TYPES) {
      expect(isChunkType(t)).toBe(true);
    }
  });

  it('isChunkType rejects unknown string', () => {
    expect(isChunkType('TOWN')).toBe(false);
    expect(isChunkType('WILD')).toBe(false);
    expect(isChunkType('')).toBe(false);
  });

  it('isChunkType rejects non-string values', () => {
    expect(isChunkType(42)).toBe(false);
    expect(isChunkType(null)).toBe(false);
  });

  it('CHUNK_TYPES includes expected terrain types', () => {
    expect(CHUNK_TYPES).toContain('ocean');
    expect(CHUNK_TYPES).toContain('town');
    expect(CHUNK_TYPES).toContain('dungeon');
    expect(CHUNK_TYPES).toContain('forest');
  });
});
