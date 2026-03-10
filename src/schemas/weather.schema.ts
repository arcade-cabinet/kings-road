import { z } from 'zod';

/**
 * Weather and seasons schema — from Grok Phases 9-10.
 * Defines weather patterns, seasonal transitions, and gameplay effects.
 */

/** Weather condition types */
export const WeatherType = z.enum([
  'clear',
  'overcast',
  'rain',
  'heavy_rain',
  'thunderstorm',
  'fog',
  'snow',
  'blizzard',
  'wind',
]);
export type WeatherType = z.infer<typeof WeatherType>;

/** Season definitions */
export const Season = z.enum(['spring', 'summer', 'autumn', 'winter']);
export type Season = z.infer<typeof Season>;

/** Visual and gameplay effects of a weather condition */
export const WeatherEffectSchema = z.object({
  /** Ambient light multiplier (1.0 = normal) */
  lightMultiplier: z.number().min(0.1).max(2.0).default(1.0),
  /** Fog density (0 = none, 1 = maximum) */
  fogDensity: z.number().min(0).max(1).default(0),
  /** Fog color override */
  fogColor: z.string().optional(),
  /** Wind speed affecting particles and player movement */
  windSpeed: z.number().min(0).max(20).default(0),
  /** Wind direction in degrees (0 = north) */
  windDirection: z.number().min(0).max(360).default(0),
  /** Particle system key (rain drops, snow flakes, leaves, etc.) */
  particleEffect: z.string().optional(),
  /** Player speed modifier (0.7 = 30% slower in blizzard) */
  speedModifier: z.number().min(0.3).max(1.5).default(1.0),
  /** Ambient sound key */
  ambientSound: z.string().optional(),
});

/** A weather pattern definition */
export const WeatherPatternSchema = z.object({
  id: z.string().min(1),
  type: WeatherType,
  /** Display name */
  name: z.string().min(2).max(40),
  /** Duration range in game-hours */
  durationRange: z.tuple([z.number(), z.number()]),
  /** Visual and gameplay effects */
  effects: WeatherEffectSchema,
  /** Chance of lightning strikes per game-minute (thunderstorm only) */
  lightningChance: z.number().min(0).max(1).optional(),
});
export type WeatherPattern = z.infer<typeof WeatherPatternSchema>;

/** Season configuration */
export const SeasonConfigSchema = z.object({
  season: Season,
  /** Duration in real-time minutes */
  durationMinutes: z.number().min(1).max(60).default(15),
  /** Weather weights for this season — higher = more likely */
  weatherWeights: z.record(WeatherType, z.number().min(0).max(1)),
  /** Base temperature (affects NPC behavior and some items) */
  temperature: z.number().min(-30).max(50),
  /** Terrain color tint */
  terrainTint: z.string().optional(),
  /** Day length multiplier (1.0 = default, 0.7 = short winter days) */
  dayLengthMultiplier: z.number().min(0.5).max(1.5).default(1.0),
  /** Foliage color override (autumn leaves, etc.) */
  foliageColor: z.string().optional(),
});
export type SeasonConfig = z.infer<typeof SeasonConfigSchema>;

/** Complete weather system configuration */
export const WeatherSystemSchema = z.object({
  id: z.string().min(1),
  /** Season cycle configuration */
  seasons: z.array(SeasonConfigSchema).length(4),
  /** Available weather patterns */
  patterns: z.array(WeatherPatternSchema).min(1),
  /** Weather check interval in game-minutes */
  checkInterval: z.number().int().min(1).max(60).default(10),
});
export type WeatherSystem = z.infer<typeof WeatherSystemSchema>;
