export const CHUNK_TYPES = [
  'ocean',
  'coast',
  'meadow',
  'farmland',
  'forest',
  'deep_forest',
  'hills',
  'highland',
  'mountain',
  'moor',
  'swamp',
  'town',
  'dungeon',
] as const;

export type ChunkType = (typeof CHUNK_TYPES)[number];

const CHUNK_TYPE_SET = new Set<string>(CHUNK_TYPES);

export function isChunkType(value: unknown): value is ChunkType {
  return typeof value === 'string' && CHUNK_TYPE_SET.has(value);
}

export function parseChunkType(value: unknown): ChunkType {
  if (!isChunkType(value)) {
    throw new TypeError(`Invalid ChunkType: ${JSON.stringify(value)}`);
  }
  return value;
}
