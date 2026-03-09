import { describe, expect, it } from 'vitest';
import {
  SeasonConfigSchema,
  WeatherPatternSchema,
  WeatherSystemSchema,
} from './weather.schema';

describe('WeatherPatternSchema', () => {
  it('accepts a valid weather pattern', () => {
    const pattern = {
      id: 'gentle-rain',
      type: 'rain',
      name: 'Gentle Rain',
      durationRange: [2, 6],
      effects: {
        lightMultiplier: 0.7,
        fogDensity: 0.2,
        particleEffect: 'rain_light',
        speedModifier: 0.9,
        ambientSound: 'rain_soft',
      },
    };
    expect(() => WeatherPatternSchema.parse(pattern)).not.toThrow();
  });

  it('rejects an invalid weather type', () => {
    const pattern = {
      id: 'hail',
      type: 'hailstorm',
      name: 'Hailstorm',
      durationRange: [1, 3],
      effects: {},
    };
    expect(() => WeatherPatternSchema.parse(pattern)).toThrow();
  });
});

describe('SeasonConfigSchema', () => {
  it('accepts a valid season config', () => {
    const season = {
      season: 'autumn',
      durationMinutes: 15,
      weatherWeights: {
        clear: 0.2,
        overcast: 0.2,
        rain: 0.2,
        heavy_rain: 0.1,
        thunderstorm: 0.05,
        fog: 0.1,
        snow: 0.0,
        blizzard: 0.0,
        wind: 0.15,
      },
      temperature: 12,
      terrainTint: '#c4a35a',
      foliageColor: '#b5651d',
    };
    expect(() => SeasonConfigSchema.parse(season)).not.toThrow();
  });

  it('rejects temperature below -30', () => {
    const season = {
      season: 'winter',
      weatherWeights: {
        clear: 0.0,
        overcast: 0.2,
        rain: 0.0,
        heavy_rain: 0.0,
        thunderstorm: 0.0,
        fog: 0.0,
        snow: 0.5,
        blizzard: 0.3,
        wind: 0.0,
      },
      temperature: -50,
    };
    expect(() => SeasonConfigSchema.parse(season)).toThrow();
  });
});

describe('WeatherSystemSchema', () => {
  const makeSeason = (season: string, temp: number) => ({
    season,
    durationMinutes: 15,
    weatherWeights: {
      clear: 0.3,
      overcast: 0.2,
      rain: 0.1,
      heavy_rain: 0.05,
      thunderstorm: 0.05,
      fog: 0.1,
      snow: 0.05,
      blizzard: 0.05,
      wind: 0.1,
    },
    temperature: temp,
  });

  const makePattern = (id: string, type: string) => ({
    id,
    type,
    name: id,
    durationRange: [2, 8],
    effects: {},
  });

  it('accepts a valid weather system with 4 seasons', () => {
    const system = {
      id: 'kings-road-weather',
      seasons: [
        makeSeason('spring', 14),
        makeSeason('summer', 24),
        makeSeason('autumn', 10),
        makeSeason('winter', -2),
      ],
      patterns: [makePattern('clear-sky', 'clear')],
      checkInterval: 10,
    };
    expect(() => WeatherSystemSchema.parse(system)).not.toThrow();
  });

  it('rejects a weather system with fewer than 4 seasons', () => {
    const system = {
      id: 'broken-weather',
      seasons: [makeSeason('spring', 14), makeSeason('summer', 24)],
      patterns: [makePattern('clear-sky', 'clear')],
    };
    expect(() => WeatherSystemSchema.parse(system)).toThrow();
  });

  it('rejects a weather system with no patterns', () => {
    const system = {
      id: 'patternless',
      seasons: [
        makeSeason('spring', 14),
        makeSeason('summer', 24),
        makeSeason('autumn', 10),
        makeSeason('winter', -2),
      ],
      patterns: [],
    };
    expect(() => WeatherSystemSchema.parse(system)).toThrow();
  });
});
