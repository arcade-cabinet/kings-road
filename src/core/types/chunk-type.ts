import { z } from 'zod';

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

export const ChunkTypeSchema = z.enum(CHUNK_TYPES);
