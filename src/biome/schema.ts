import { z } from 'zod';

const TIME_OF_DAY_BUCKETS = ['dawn', 'noon', 'dusk', 'night'] as const;

export const HdriSpecSchema = z.union([
  z.string(),
  z.record(z.enum(TIME_OF_DAY_BUCKETS), z.string()),
]);

export type HdriSpec = z.infer<typeof HdriSpecSchema>;
export type TimeOfDayBucket = (typeof TIME_OF_DAY_BUCKETS)[number];

const LightingSchema = z.object({
  hdri: HdriSpecSchema,
  ambientColor: z.string(),
  ambientIntensity: z.number(),
  directionalColor: z.string(),
  directionalIntensity: z.number(),
  fogColor: z.string(),
  fogNear: z.number(),
  fogFar: z.number(),
  fogDensity: z.number().optional(),
  skyTint: z.string().optional(),
});

const TerrainSchema = z.object({
  heightmap: z.string(),
  scale: z.number().default(1),
  materials: z.array(z.string()),
  splatWeights: z.record(z.string(), z.number()).optional(),
  displacementScale: z.number().default(0),
});

const FoliageSpeciesSchema = z.object({
  assetId: z.string(),
  density: z.number().min(0).max(1),
  scaleRange: z.tuple([z.number(), z.number()]).optional(),
  clusterRadius: z.number().optional(),
});

const FoliageSchema = z.object({
  density: z.number().min(0).max(1),
  species: z.array(FoliageSpeciesSchema),
  groundCover: z.array(z.string()).optional(),
});

const WeatherStateSchema = z.object({
  id: z.string(),
  probability: z.number().min(0).max(1),
  fogMultiplier: z.number().default(1),
  windStrength: z.number().default(0),
  precipitationType: z.enum(['none', 'rain', 'snow', 'hail']).default('none'),
  precipitationDensity: z.number().default(0),
});

const WeatherSchema = z.object({
  defaultState: z.string(),
  states: z.array(WeatherStateSchema),
  transitionDuration: z.number().default(10),
});

const SparklesConfigSchema = z.object({
  count: z.number().int().min(0),
  size: z.tuple([z.number(), z.number()]),
  speed: z.number(),
  opacity: z.number().min(0).max(1),
  color: z.string(),
  noise: z.number().optional(),
  scale: z.number().optional(),
});

const AudioSchema = z.object({
  ambient: z.array(z.string()),
  music: z.string().optional(),
  footstepMaterial: z.string().default('grass'),
});

const PlayerModifiersSchema = z.object({
  staminaDrainMultiplier: z.number().default(1),
  speedMultiplier: z.number().default(1),
  visibilityRadius: z.number().optional(),
});

export const BiomeConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  lighting: LightingSchema,
  terrain: TerrainSchema,
  foliage: FoliageSchema,
  weather: WeatherSchema,
  particles: z.record(z.string(), SparklesConfigSchema).optional(),
  audio: AudioSchema,
  playerModifiers: PlayerModifiersSchema.optional(),
  monsterPool: z.array(z.string()).default([]),
  npcWardrobe: z.record(z.string(), z.string()).optional(),
});

export type BiomeConfig = z.infer<typeof BiomeConfigSchema>;
