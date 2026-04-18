import { describe, expect, it } from 'vitest';
import type { ChibiFaceInput } from './face-texture';
import { createChibiFaceTexture, generateFaceTexture } from './face-texture';

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

describe('createChibiFaceTexture', () => {
  const baseConfig: ChibiFaceInput = {
    skinTone: '#ffdbac',
    eyeColor: '#4488cc',
    hairColor: '#4a3020',
    hairStyle: 'short',
    facialHair: 'none',
    expression: 'neutral',
  };

  const expressions: ChibiFaceInput['expression'][] = [
    'neutral',
    'happy',
    'angry',
    'sad',
    'surprised',
    'sleeping',
    'speaking',
  ];

  const hairStyles: ChibiFaceInput['hairStyle'][] = [
    'bald',
    'short',
    'long',
    'ponytail',
    'topknot',
    'braided',
    'wild',
    'hooded',
  ];

  for (const expression of expressions) {
    it(`produces a texture for expression: ${expression}`, () => {
      const tex = createChibiFaceTexture({ ...baseConfig, expression });
      expect(tex).toBeDefined();
      expect(tex.image).toBeDefined();
    });
  }

  for (const hairStyle of hairStyles) {
    it(`produces a texture for hair style: ${hairStyle}`, () => {
      const tex = createChibiFaceTexture({ ...baseConfig, hairStyle });
      expect(tex).toBeDefined();
      expect(tex.image).toBeDefined();
    });
  }

  it('accepts the race parameter', () => {
    const tex = createChibiFaceTexture({
      ...baseConfig,
      race: 'elf',
    });
    expect(tex).toBeDefined();
    expect(tex.image).toBeDefined();
  });

  it('returns a THREE.CanvasTexture', () => {
    const tex = createChibiFaceTexture(baseConfig);
    expect(tex.constructor.name).toBe('CanvasTexture');
  });
});
