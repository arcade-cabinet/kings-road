/**
 * Performance regression tests.
 *
 * These are regular Vitest tests (not bench) so they run in CI alongside
 * unit tests. Each test asserts that a critical path completes within a
 * generous time budget. Budgets are set at ~10x the observed p99 to avoid
 * flaky failures on slow CI runners while still catching large regressions.
 *
 * NPC / chibi / face-texture benchmarks were removed when those
 * procedural-appearance factories were deleted — NPC appearance is now
 * driven by authored GLBs (see app/scene/NPC.tsx + content/npcs/).
 */
import { describe, expect, it } from 'vitest';
import { generateBuildingGeometry } from '@/factories/building-factory';
import {
  DEFAULT_PACING_CONFIG,
  generatePlacements,
  generateRoadPacing,
} from '@/world/pacing-engine';
import { clearRoadSpineCache, loadRoadSpine } from '@/world/road-spine';
import { getTownConfig, resolveBuildingArchetype } from '@/world/town-configs';
import { generateBoundary, layoutTown } from '@/world/town-layout';

function timeMs(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

describe('performance regression: building factory', () => {
  it('generates geometry for all 14 archetypes in <10ms', () => {
    const archetypeIds = [
      'tavern',
      'cottage',
      'chapel',
      'smithy',
      'market_stall',
      'house_large',
      'guard_post',
      'stable',
      'manor',
      'temple',
      'barracks',
      'library',
      'watchtower',
      'prison',
    ];
    const elapsed = timeMs(() => {
      for (const id of archetypeIds) {
        const arch = resolveBuildingArchetype(id);
        if (arch) generateBuildingGeometry(arch);
      }
    });
    expect(elapsed).toBeLessThan(10);
  });
});

describe('performance regression: town layout', () => {
  it('layouts all 6 towns in <5ms', () => {
    const towns = [
      { cx: 0, cz: 0 },
      { cx: 0, cz: 50 },
      { cx: 0, cz: 100 },
      { cx: 0, cz: 141 },
      { cx: 0, cz: 175 },
      { cx: 0, cz: 233 },
    ];
    const elapsed = timeMs(() => {
      for (const t of towns) {
        const config = getTownConfig(t.cx, t.cz);
        if (!config) continue;
        layoutTown(config, t.cx * 120, t.cz * 120);
      }
    });
    expect(elapsed).toBeLessThan(5);
  });

  it('full town pipeline (layout + boundary) for all 6 in <5ms', () => {
    const towns = [
      { cx: 0, cz: 0 },
      { cx: 0, cz: 50 },
      { cx: 0, cz: 100 },
      { cx: 0, cz: 141 },
      { cx: 0, cz: 175 },
      { cx: 0, cz: 233 },
    ];
    const elapsed = timeMs(() => {
      for (const t of towns) {
        const config = getTownConfig(t.cx, t.cz);
        if (!config) continue;
        layoutTown(config, t.cx * 120, t.cz * 120);
        generateBoundary(config, t.cx * 120, t.cz * 120);
      }
    });
    expect(elapsed).toBeLessThan(5);
  });
});

describe('performance regression: road spine + pacing', () => {
  it('loads and caches the road spine in <50ms (first load)', () => {
    clearRoadSpineCache();
    const elapsed = timeMs(() => {
      loadRoadSpine();
    });
    expect(elapsed).toBeLessThan(50);
  });

  it('generates full road pacing in <30ms', () => {
    const elapsed = timeMs(() => {
      generateRoadPacing(28000, DEFAULT_PACING_CONFIG, 'regression-seed');
    });
    expect(elapsed).toBeLessThan(30);
  });

  it('generates placements across the road in <30ms', () => {
    const elapsed = timeMs(() => {
      generatePlacements(28000, DEFAULT_PACING_CONFIG, 'regression-seed');
    });
    expect(elapsed).toBeLessThan(30);
  });
});
