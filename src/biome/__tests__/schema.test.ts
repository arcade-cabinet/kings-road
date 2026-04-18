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
      weather: {
        defaultState: 's',
        states: [{ id: 's', probability: 1 }],
        transitionDuration: 10,
      },
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
      weather: {
        defaultState: 's',
        states: [{ id: 's', probability: 1 }],
        transitionDuration: 10,
      },
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
      weather: {
        defaultState: 's',
        states: [{ id: 's', probability: 1 }],
        transitionDuration: 10,
      },
      audio: { ambient: [] },
    };
    const result = BiomeConfigSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.monsterPool).toEqual([]);
    }
  });
});

describe('WeatherSchema cross-validation', () => {
  const baseLighting = {
    hdri: 'h',
    ambientColor: '#fff',
    ambientIntensity: 0.5,
    directionalColor: '#fff',
    directionalIntensity: 0.5,
    fogColor: '#fff',
    fogNear: 10,
    fogFar: 100,
  };
  const baseEnvelope = {
    id: 'x',
    name: 'X',
    lighting: baseLighting,
    terrain: { heightmap: 'h', materials: [] },
    foliage: { density: 0.5, species: [] },
    audio: { ambient: [] },
  };

  it('accepts weather when defaultState matches a states[].id', () => {
    const config = {
      ...baseEnvelope,
      weather: {
        defaultState: 'clear',
        states: [
          { id: 'clear', probability: 0.6 },
          { id: 'fog', probability: 0.4 },
        ],
        transitionDuration: 10,
      },
    };
    const result = BiomeConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('rejects weather when defaultState is not in states[]', () => {
    const config = {
      ...baseEnvelope,
      weather: {
        defaultState: 'thunderstorm',
        states: [{ id: 'clear', probability: 1 }],
        transitionDuration: 10,
      },
    };
    const result = BiomeConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.join('.').endsWith('defaultState'),
      );
      expect(issue?.message).toMatch(/not in states/);
    }
  });

  it('rejects weather with empty states[] and any defaultState', () => {
    const config = {
      ...baseEnvelope,
      weather: { defaultState: 'clear', states: [], transitionDuration: 10 },
    };
    const result = BiomeConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
