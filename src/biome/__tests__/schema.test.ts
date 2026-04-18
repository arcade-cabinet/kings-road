import { describe, expect, it } from 'vitest';
import meadowJson from '../data/meadow.json';
import thornfieldJson from '../data/thornfield.json';
import { BiomeConfigSchema } from '../schema';

describe('BiomeConfigSchema', () => {
  it('validates thornfield.json', () => {
    const result = BiomeConfigSchema.safeParse(thornfieldJson);
    expect(result.success).toBe(true);
  });

  it('validates meadow.json', () => {
    const result = BiomeConfigSchema.safeParse(meadowJson);
    expect(result.success).toBe(true);
  });

  it('rejects config missing required lighting fields', () => {
    const invalid = {
      id: 'test',
      name: 'Test',
      lighting: {},
      terrain: {},
      foliage: {},
      weather: {},
      audio: {},
    };
    const result = BiomeConfigSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts per-time-of-day hdri record', () => {
    const config = {
      id: 'x',
      name: 'X',
      lighting: {
        hdri: {
          dawn: 'h-dawn',
          noon: 'h-noon',
          dusk: 'h-dusk',
          night: 'h-night',
        },
        ambientColor: '#fff',
        ambientIntensity: 0.5,
        directionalColor: '#fff',
        directionalIntensity: 0.5,
        fogColor: '#fff',
        fogNear: 10,
        fogFar: 100,
      },
      terrain: { heightmap: 'h', materials: [] },
      foliage: { density: 0.5, species: [] },
      weather: { defaultState: 's', states: [], transitionDuration: 10 },
      audio: { ambient: [] },
    };
    const result = BiomeConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('rejects hdri record with unknown time bucket', () => {
    const config = {
      id: 'x',
      name: 'X',
      lighting: {
        hdri: { midnight: 'h' },
        ambientColor: '#fff',
        ambientIntensity: 0.5,
        directionalColor: '#fff',
        directionalIntensity: 0.5,
        fogColor: '#fff',
        fogNear: 10,
        fogFar: 100,
      },
      terrain: { heightmap: 'h', materials: [] },
      foliage: { density: 0.5, species: [] },
      weather: { defaultState: 's', states: [], transitionDuration: 10 },
      audio: { ambient: [] },
    };
    const result = BiomeConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('defaults monsterPool to empty array', () => {
    const minimal = {
      id: 'x',
      name: 'X',
      lighting: {
        hdri: 'h',
        ambientColor: '#fff',
        ambientIntensity: 0.5,
        directionalColor: '#fff',
        directionalIntensity: 0.5,
        fogColor: '#fff',
        fogNear: 10,
        fogFar: 100,
      },
      terrain: { heightmap: 'h', materials: [] },
      foliage: { density: 0.5, species: [] },
      weather: { defaultState: 's', states: [], transitionDuration: 10 },
      audio: { ambient: [] },
    };
    const result = BiomeConfigSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.monsterPool).toEqual([]);
    }
  });
});
