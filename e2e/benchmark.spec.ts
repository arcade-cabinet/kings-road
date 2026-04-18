import { expect, test } from '@playwright/test';
import type { BenchmarkSummary } from '../src/benchmark/capture';

type SlimSummary = Omit<BenchmarkSummary, 'frames'>;
import baseline from '../docs/benchmarks/baseline.json';

const ROUTES = [
  'walk-village-perimeter',
  'enter-dungeon-first-skeleton',
  'sprint-through-fog-in-rain',
  'combat-3-enemies-hero-shot',
] as const;

const REGRESSION_THRESHOLD = 0.2;

test.describe('Benchmark harness', () => {
  for (const routeId of ROUTES) {
    test(`route: ${routeId}`, async ({ page }) => {
      const summaries: SlimSummary[] = [];

      // Capture the console summary log emitted by BenchmarkRunner
      page.on('console', (msg) => {
        const text = msg.text();
        if (text.startsWith('[benchmark:summary]')) {
          const json = text.slice('[benchmark:summary] '.length);
          try {
            summaries.push(JSON.parse(json) as SlimSummary);
          } catch {
            // not valid JSON — ignore
          }
        }
      });

      // Load with both debug spawn and bench route params
      await page.goto(`/?spawn=thornfield&bench=${routeId}`);

      // Wait for the HUD to appear
      await expect(page.locator('[data-testid="benchmark-hud"]')).toBeVisible({
        timeout: 10000,
      });

      // Timeout = route duration + 2s delayed start + 8s load/variance buffer
      const routeDurations: Record<string, number> = {
        'walk-village-perimeter': 70000,
        'enter-dungeon-first-skeleton': 100000,
        'sprint-through-fog-in-rain': 55000,
        'combat-3-enemies-hero-shot': 70000,
      };
      const timeout = routeDurations[routeId] ?? 120000;

      await expect(page.locator('[data-testid="benchmark-hud"]')).toContainText(
        'BENCH COMPLETE',
        { timeout },
      );

      expect(summaries.length).toBeGreaterThan(0);
      const summary = summaries[0];

      // Regression check against committed baseline (skip if no baseline for route)
      const base = (baseline as Record<string, { avgFps: number; p1Fps: number } | null>)[routeId];
      if (base && base.avgFps > 0 && base.p1Fps > 0) {
        const avgDrop = (base.avgFps - summary.avgFps) / base.avgFps;
        const p1Drop = (base.p1Fps - summary.p1Fps) / base.p1Fps;

        // Only assert regression (drop > threshold); improvements are fine
        if (avgDrop > 0) {
          expect(
            avgDrop,
            `avgFps regressed by ${(avgDrop * 100).toFixed(1)}% (baseline ${base.avgFps.toFixed(1)}, got ${summary.avgFps.toFixed(1)})`,
          ).toBeLessThan(REGRESSION_THRESHOLD);
        }

        if (p1Drop > 0) {
          expect(
            p1Drop,
            `p1Fps regressed by ${(p1Drop * 100).toFixed(1)}% (baseline ${base.p1Fps.toFixed(1)}, got ${summary.p1Fps.toFixed(1)})`,
          ).toBeLessThan(REGRESSION_THRESHOLD);
        }
      }

      // Always assert a live floor — must not be completely broken
      expect(summary.avgFps).toBeGreaterThan(0);
      expect(summary.frameCount).toBeGreaterThan(30);
    });
  }
});
