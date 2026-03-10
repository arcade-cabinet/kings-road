import { bench, describe } from 'vitest';
import { getTownConfig } from '../world/town-configs';
import {
  generateApproach,
  generateBoundary,
  layoutTown,
} from '../world/town-layout';

const TOWN_CHUNKS = [
  { cx: 0, cz: 0, name: 'Ashford' },
  { cx: 0, cz: 50, name: 'Millbrook' },
  { cx: 0, cz: 100, name: 'Thornfield' },
  { cx: 0, cz: 141, name: 'Ravensgate' },
  { cx: 0, cz: 175, name: "Pilgrim's Rest" },
  { cx: 0, cz: 233, name: 'Grailsend' },
] as const;

describe('Town Layout', () => {
  for (const town of TOWN_CHUNKS) {
    const config = getTownConfig(town.cx, town.cz)!;
    const originX = town.cx * 120;
    const originZ = town.cz * 120;

    bench(
      `layoutTown: ${town.name}`,
      () => {
        layoutTown(config, originX, originZ);
      },
      { time: 1000, warmupTime: 200, throws: false },
    );
  }

  bench(
    'layoutTown: all 6 towns',
    () => {
      for (const town of TOWN_CHUNKS) {
        const config = getTownConfig(town.cx, town.cz)!;
        layoutTown(config, town.cx * 120, town.cz * 120);
      }
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'generateBoundary: all 6 towns',
    () => {
      for (const town of TOWN_CHUNKS) {
        const config = getTownConfig(town.cx, town.cz)!;
        generateBoundary(config, town.cx * 120, town.cz * 120);
      }
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'generateApproach: all 6 towns',
    () => {
      for (const town of TOWN_CHUNKS) {
        const config = getTownConfig(town.cx, town.cz)!;
        generateApproach(config, town.cx * 120, town.cz * 120);
      }
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'full town pipeline: config + layout + boundary + approach (all towns)',
    () => {
      for (const town of TOWN_CHUNKS) {
        const config = getTownConfig(town.cx, town.cz)!;
        const originX = town.cx * 120;
        const originZ = town.cz * 120;
        layoutTown(config, originX, originZ);
        generateBoundary(config, originX, originZ);
        generateApproach(config, originX, originZ);
      }
    },
    { time: 1000, warmupTime: 200, throws: false },
  );
});
