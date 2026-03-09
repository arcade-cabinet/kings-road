import { describe, expect, it } from 'vitest';
import { generateFaceTexture } from './face-texture';

describe('generateFaceTexture', () => {
  it('returns a texture for valid face config', () => {
    const face = {
      skinTone: 2,
      eyeColor: 'brown' as const,
      hairStyle: 'short' as const,
      hairColor: '#4a3020',
      facialHair: 'none' as const,
    };
    const texture = generateFaceTexture(face);
    expect(texture).toBeDefined();
  });

  it('handles bald hair style', () => {
    const face = {
      skinTone: 0,
      eyeColor: 'blue' as const,
      hairStyle: 'bald' as const,
      hairColor: '#1a1a1a',
      facialHair: 'full_beard' as const,
    };
    const texture = generateFaceTexture(face);
    expect(texture).toBeDefined();
  });

  it('handles long hair style', () => {
    const face = {
      skinTone: 4,
      eyeColor: 'green' as const,
      hairStyle: 'long' as const,
      hairColor: '#8a7060',
      facialHair: 'mustache' as const,
    };
    const texture = generateFaceTexture(face);
    expect(texture).toBeDefined();
  });

  it('handles stubble facial hair', () => {
    const face = {
      skinTone: 1,
      eyeColor: 'gray' as const,
      hairStyle: 'hooded' as const,
      hairColor: '#333333',
      facialHair: 'stubble' as const,
    };
    const texture = generateFaceTexture(face);
    expect(texture).toBeDefined();
  });
});
