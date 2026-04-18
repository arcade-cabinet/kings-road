import forestData from './data/forest.json';
import meadowData from './data/meadow.json';
import moorData from './data/moor.json';
import thornfieldData from './data/thornfield.json';
import type { BiomeConfig } from './schema';

export const forestConfig = forestData as BiomeConfig;
export const meadowConfig = meadowData as BiomeConfig;
export const moorConfig = moorData as BiomeConfig;
export const thornfieldConfig = thornfieldData as BiomeConfig;

export const biomeConfigs: BiomeConfig[] = [
  forestConfig,
  meadowConfig,
  moorConfig,
  thornfieldConfig,
];

export type { BiomeConfig, HdriSpec, TimeOfDayBucket } from './schema';
export { BiomeConfigSchema, HdriSpecSchema } from './schema';
export { BiomeService } from './service';
export type { BiomeTransitionState } from './transition';
export { computeBiomeTransition } from './transition';
