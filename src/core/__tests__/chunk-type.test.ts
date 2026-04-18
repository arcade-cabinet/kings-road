import { describe, expect, it } from 'vitest';
import { CHUNK_TYPES, ChunkTypeSchema } from '../types';

describe('ChunkType', () => {
  it('ChunkTypeSchema accepts all defined types', () => {
    for (const t of CHUNK_TYPES) {
      expect(() => ChunkTypeSchema.parse(t)).not.toThrow();
    }
  });

  it('ChunkTypeSchema rejects unknown string', () => {
    expect(() => ChunkTypeSchema.parse('TOWN')).toThrow();
    expect(() => ChunkTypeSchema.parse('WILD')).toThrow();
    expect(() => ChunkTypeSchema.parse('')).toThrow();
  });

  it('CHUNK_TYPES includes expected terrain types', () => {
    expect(CHUNK_TYPES).toContain('ocean');
    expect(CHUNK_TYPES).toContain('town');
    expect(CHUNK_TYPES).toContain('dungeon');
    expect(CHUNK_TYPES).toContain('forest');
  });
});
