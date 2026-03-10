import { z } from 'zod';

// --- Biomes ---

/** Extended biome types for the 2D kingdom map */
export const KingdomBiome = z.enum([
  'meadow',
  'forest',
  'deep_forest',
  'hills',
  'farmland',
  'moor',
  'riverside',
  'coast',
  'mountain',
  'swamp',
  'highland',
  'ocean',
]);
export type KingdomBiome = z.infer<typeof KingdomBiome>;

// --- Map Tiles ---

/** A single tile in the kingdom grid */
export const MapTileSchema = z.object({
  /** Grid x coordinate */
  x: z.number().int(),
  /** Grid y coordinate */
  y: z.number().int(),
  /** Elevation (0 = sea level, 1 = mountain peak) */
  elevation: z.number().min(0).max(1),
  /** Moisture level (0 = arid, 1 = wet) */
  moisture: z.number().min(0).max(1),
  /** Resolved biome for this tile */
  biome: KingdomBiome,
  /** Whether this tile is land (above sea level) */
  isLand: z.boolean(),
  /** Whether this tile is on the coastline */
  isCoast: z.boolean(),
  /** Whether a river runs through this tile */
  hasRiver: z.boolean().default(false),
  /** Whether a road runs through this tile */
  hasRoad: z.boolean().default(false),
  /** Road type if hasRoad is true */
  roadType: z.enum(['highway', 'secondary', 'path', 'trail']).optional(),
});
export type MapTile = z.infer<typeof MapTileSchema>;

// --- Roads ---

/** Road types ranked by importance */
export const RoadType = z.enum(['highway', 'secondary', 'path', 'trail']);
export type RoadType = z.infer<typeof RoadType>;

/** A road segment connecting two points */
export const RoadSegmentSchema = z.object({
  id: z.string().min(1),
  /** Road type determines visual width and travel speed */
  type: RoadType,
  /** Starting point [x, y] in grid coordinates */
  from: z.tuple([z.number().int(), z.number().int()]),
  /** Ending point [x, y] in grid coordinates */
  to: z.tuple([z.number().int(), z.number().int()]),
  /** Intermediate waypoints for curved roads */
  waypoints: z.array(z.tuple([z.number().int(), z.number().int()])).default([]),
  /** Which settlements this road connects (by id) */
  connectsSettlements: z.tuple([z.string(), z.string()]).optional(),
});
export type RoadSegment = z.infer<typeof RoadSegmentSchema>;

// --- Settlements ---

/** Settlement type determines size, services, and visual style */
export const SettlementType = z.enum([
  'city',
  'town',
  'village',
  'hamlet',
  'outpost',
  'monastery',
  'ruin',
  'port',
]);
export type SettlementType = z.infer<typeof SettlementType>;

/** A settlement placed on the kingdom map */
export const SettlementSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60),
  type: SettlementType,
  /** Grid position [x, y] */
  position: z.tuple([z.number().int(), z.number().int()]),
  /** Road connections (settlement IDs) */
  connectedTo: z.array(z.string()).default([]),
  /** Main quest chapter tied to this settlement (if any) */
  mainQuestChapter: z.string().optional(),
  /** Description for UI/lore */
  description: z.string().max(500).optional(),
  /** Available services/features */
  features: z.array(z.string()).default([]),
  /** Population hint for generation */
  population: z.enum(['tiny', 'small', 'medium', 'large']).default('small'),
});
export type Settlement = z.infer<typeof SettlementSchema>;

// --- Weather ---

/** Weather profile for a region */
export const WeatherProfileSchema = z.object({
  /** Base weather (clear, overcast, etc.) */
  defaultWeather: z
    .enum(['clear', 'overcast', 'foggy', 'rainy', 'stormy'])
    .default('clear'),
  /** Chance of rain (0-1) */
  rainChance: z.number().min(0).max(1).default(0.2),
  /** Chance of fog (0-1) */
  fogChance: z.number().min(0).max(1).default(0.1),
  /** Fog density when present (0-1) */
  fogDensity: z.number().min(0).max(1).default(0.3),
  /** Wind strength (0-1) */
  windStrength: z.number().min(0).max(1).default(0.2),
});
export type WeatherProfile = z.infer<typeof WeatherProfileSchema>;

// --- Regions ---

/** A named region of the kingdom with lore and biome identity */
export const KingdomRegionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60),
  /** Primary biome of this region */
  biome: KingdomBiome,
  /** Bounding rectangle in grid coords: [minX, minY, maxX, maxY] */
  bounds: z.tuple([
    z.number().int(),
    z.number().int(),
    z.number().int(),
    z.number().int(),
  ]),
  /** Settlements within this region (by id) */
  settlements: z.array(z.string()).default([]),
  /** Terrain flavor for procedural decoration */
  terrainFeatures: z.array(z.string()).default([]),
  /** Lore description */
  description: z.string().max(500).optional(),
  /** Danger tier override for this region (0-4) */
  dangerTier: z.number().int().min(0).max(4).optional(),
  /** Weather profile for this region */
  weather: WeatherProfileSchema.optional(),
});
export type KingdomRegion = z.infer<typeof KingdomRegionSchema>;

// --- Rivers ---

/** A river flowing from highlands to coast */
export const RiverSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60),
  /** Ordered list of grid tiles the river passes through */
  path: z.array(z.tuple([z.number().int(), z.number().int()])).min(2),
  /** Width class affects visual rendering */
  width: z.enum(['stream', 'river', 'wide']).default('river'),
});
export type River = z.infer<typeof RiverSchema>;

// --- Authored Region (content input) ---

/** A content-authored region definition — narrative spaces designed by hand */
export const AuthoredRegionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60),
  /** Primary biome — the generator uses this to paint terrain within the region */
  biome: KingdomBiome,
  /** Where along the north-south axis this region sits (0=south, 1=north) */
  latitudeRange: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  /** Where along the east-west axis (0=west, 1=east). Null = spans full width */
  longitudeRange: z
    .tuple([z.number().min(0).max(1), z.number().min(0).max(1)])
    .optional(),
  /** Terrain feature keywords for procedural decoration */
  terrainFeatures: z.array(z.string()).default([]),
  /** Lore description shown when entering the region */
  description: z.string().max(500).optional(),
  /** Danger tier (0=safe, 4=deadly). Increases as player progresses along the road */
  dangerTier: z.number().int().min(0).max(4).default(0),
  /** Weather for this region */
  weather: WeatherProfileSchema.optional(),
  /** Settlements that should be placed in this region (by id) */
  settlements: z.array(z.string()).default([]),
  /** How many random off-road features to scatter in this region */
  featureDensity: z.enum(['sparse', 'normal', 'dense']).default('normal'),
});
export type AuthoredRegion = z.infer<typeof AuthoredRegionSchema>;

// --- Off-road Settlement (content input) ---

/** A settlement NOT on the King's Road — placed by the generator in a region */
export const OffRoadSettlementSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60),
  type: SettlementType,
  /** Which authored region this belongs to */
  region: z.string(),
  /** Description for UI/lore */
  description: z.string().max(500).optional(),
  /** Available services/features */
  features: z.array(z.string()).default([]),
  /** Population hint for generation */
  population: z.enum(['tiny', 'small', 'medium', 'large']).default('small'),
  /** How it connects to the road network */
  roadConnection: z
    .enum(['secondary', 'path', 'trail', 'none'])
    .default('path'),
});
export type OffRoadSettlement = z.infer<typeof OffRoadSettlementSchema>;

// --- Kingdom Config ---

/** High-level kingdom generation parameters (content-driven) */
export const KingdomConfigSchema = z.object({
  /** Kingdom name */
  name: z.string().min(2).max(60),
  /** Grid dimensions */
  width: z.number().int().min(32).max(512),
  height: z.number().int().min(32).max(512),
  /** Sea level threshold (tiles below this elevation are ocean) */
  seaLevel: z.number().min(0).max(1).default(0.35),
  /** Mountain threshold (tiles above this are mountains) */
  mountainLevel: z.number().min(0).max(1).default(0.75),
  /** Anchor settlements on the King's Road (required for quest progression) */
  anchorSettlements: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(2).max(60),
      type: SettlementType,
      mainQuestChapter: z.string().optional(),
      description: z.string().max(500).optional(),
      features: z.array(z.string()).default([]),
      /** Preferred region placement (hint for generator) */
      preferredRegion: z.string().optional(),
      /** Approximate position along the road spine (0-1, start to end) */
      roadSpineProgress: z.number().min(0).max(1),
    }),
  ),
  /** Content-authored regions — the narrative geography of the kingdom */
  regions: z.array(AuthoredRegionSchema).default([]),
  /** Off-road settlements — hamlets, outposts, ports not on the King's Road */
  offRoadSettlements: z.array(OffRoadSettlementSchema).default([]),
  /** Seed modifiers for terrain variation */
  terrainModifiers: z
    .object({
      /** Elongation factor (>1 = taller, <1 = wider) */
      elongation: z.number().min(0.5).max(3).default(1.5),
      /** Roughness of coastline */
      coastlineNoise: z.number().min(0).max(1).default(0.5),
      /** How prominent mountain ridges are */
      ridgeStrength: z.number().min(0).max(1).default(0.6),
    })
    .default({ elongation: 1.5, coastlineNoise: 0.5, ridgeStrength: 0.6 }),
});
export type KingdomConfig = z.infer<typeof KingdomConfigSchema>;

// --- Map Features (generated output) ---

/** A feature placed on the kingdom map during generation */
export const MapFeatureSchema = z.object({
  /** Unique ID for this placement */
  id: z.string().min(1),
  /** Content feature definition ID (e.g. "standing_stone") */
  featureId: z.string().min(1),
  /** Feature tier */
  tier: z.enum(['ambient', 'minor', 'major']),
  /** Grid position [x, y] */
  position: z.tuple([z.number().int(), z.number().int()]),
  /** Region this feature belongs to */
  regionId: z.string().min(1),
});
export type MapFeature = z.infer<typeof MapFeatureSchema>;

// --- Kingdom Map (generated output) ---

/** The complete generated kingdom map */
export const KingdomMapSchema = z.object({
  /** Seed used to generate this map */
  seed: z.string().min(1),
  /** Grid dimensions */
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Flat array of tiles (row-major: tiles[y * width + x]) */
  tiles: z.array(MapTileSchema),
  /** All settlements on the map */
  settlements: z.array(SettlementSchema),
  /** Road network */
  roads: z.array(RoadSegmentSchema),
  /** River system */
  rivers: z.array(RiverSchema),
  /** Named regions */
  regions: z.array(KingdomRegionSchema),
  /** Deterministic feature placements */
  features: z.array(MapFeatureSchema).default([]),
});
export type KingdomMap = z.infer<typeof KingdomMapSchema>;
