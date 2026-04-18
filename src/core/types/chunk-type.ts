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

/** Zero-dep runtime guard — use ChunkTypeSchema (src/schemas) for Zod validation. */
export function isChunkType(value: unknown): value is ChunkType {
  return (
    typeof value === 'string' &&
    (CHUNK_TYPES as readonly string[]).includes(value)
  );
}
