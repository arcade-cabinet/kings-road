import { bench, describe } from 'vitest';
import {
  DEFAULT_PACING_CONFIG,
  generatePlacements,
  generateRoadPacing,
} from '@/world/pacing-engine';

describe('Pacing Engine', () => {
  bench(
    'generatePlacements: full road (28000 units)',
    () => {
      generatePlacements(28000, DEFAULT_PACING_CONFIG, 'benchmark-seed');
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'generatePlacements: short road (5000 units)',
    () => {
      generatePlacements(5000, DEFAULT_PACING_CONFIG, 'benchmark-seed');
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'generateRoadPacing: full road with Zod validation',
    () => {
      generateRoadPacing(28000, DEFAULT_PACING_CONFIG, 'benchmark-seed');
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'generatePlacements: 10 different seeds (determinism stress)',
    () => {
      for (let i = 0; i < 10; i++) {
        generatePlacements(28000, DEFAULT_PACING_CONFIG, `seed-${i}`);
      }
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'generatePlacements: tight intervals (high density)',
    () => {
      const denseConfig = {
        ...DEFAULT_PACING_CONFIG,
        ambientInterval: [50, 100] as [number, number],
        minorInterval: [100, 200] as [number, number],
        majorInterval: [200, 400] as [number, number],
      };
      generatePlacements(28000, denseConfig, 'dense-bench');
    },
    { time: 1000, warmupTime: 200, throws: false },
  );
});
