import { z } from 'zod';
import { CHUNK_TYPES } from '@/core';

export const ChunkTypeSchema = z.enum(CHUNK_TYPES);
