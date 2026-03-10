import { bench, describe } from 'vitest';
import { clearRoadSpineCache, loadRoadSpine } from '../world/road-spine';

describe('World Generation', () => {
  bench(
    'loadRoadSpine (cached)',
    () => {
      loadRoadSpine();
    },
    { time: 1000, warmupTime: 200, throws: false },
  );

  bench(
    'loadRoadSpine (uncached, with Zod parse)',
    () => {
      clearRoadSpineCache();
      loadRoadSpine();
    },
    { time: 1000, warmupTime: 200, throws: false },
  );
});
