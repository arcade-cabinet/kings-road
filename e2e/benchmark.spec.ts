/**
 * Playwright benchmark smoke tests.
 *
 * For each of the 4 scripted routes, navigates to the bench URL, waits for
 * the JSON download to complete, then asserts that key metrics haven't
 * regressed beyond 20% from `docs/benchmarks/baseline.json`.
 *
 * On first run (no baseline): asserts only that a JSON file was downloaded
 * and that avgFps > 0. The developer then copies the downloaded JSON to
 * docs/benchmarks/baseline.json to anchor future runs.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, test } from '@playwright/test';
import type {
  BenchmarkResult,
  BenchmarkSummary,
} from '../src/benchmark/capture';
import { BENCHMARK_ROUTES } from '../src/benchmark/routes';

const BASELINE_PATH = path.resolve(
  __dirname,
  '../docs/benchmarks/baseline.json',
);
const REGRESSION_THRESHOLD = 0.8; // allow up to 20% regression

function loadBaseline(): Record<string, BenchmarkSummary> | null {
  try {
    const raw = fs.readFileSync(BASELINE_PATH, 'utf8');
    return JSON.parse(raw) as Record<string, BenchmarkSummary>;
  } catch {
    return null;
  }
}

for (const route of BENCHMARK_ROUTES) {
  test(`benchmark: ${route.id}`, async ({ page, context }) => {
    const baseline = loadBaseline();

    // Collect the download triggered by the benchmark runner
    let downloadedResult: BenchmarkResult | null = null;
    const downloadPromise = context.waitForEvent('page').catch(() => null);

    // Intercept the Blob URL download by capturing the JSON from console output
    // (BenchmarkRunner logs renderMarkdownReport to console on completion)
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().startsWith('[benchmark]')) {
        consoleMessages.push(msg.text());
      }
    });

    // Capture the download event
    const downloadEventPromise = page.waitForEvent('download', {
      timeout: (route.totalDuration + 30) * 1000,
    });

    await page.goto(`/?spawn=${route.spawnBiome}&bench=${route.id}`);

    // Wait for the download (JSON auto-downloaded on completion)
    const download = await downloadEventPromise;
    const jsonPath = await download.path();

    if (jsonPath) {
      const raw = fs.readFileSync(jsonPath, 'utf8');
      downloadedResult = JSON.parse(raw) as BenchmarkResult;
    }

    void downloadPromise; // unused but avoids unhandled rejection

    expect(downloadedResult).not.toBeNull();
    expect(downloadedResult!.route).toBe(route.id);

    const summary = downloadedResult!.summary;

    // Always assert basic sanity
    expect(summary.avgFps).toBeGreaterThan(0);
    expect(summary.totalFrames).toBeGreaterThan(10);

    // Regression check against baseline (if it exists)
    if (baseline?.[route.id]) {
      const base = baseline[route.id];
      expect(summary.avgFps).toBeGreaterThanOrEqual(
        base.avgFps * REGRESSION_THRESHOLD,
      );
      expect(summary.p1Fps).toBeGreaterThanOrEqual(
        base.p1Fps * REGRESSION_THRESHOLD,
      );
      expect(summary.p5Fps).toBeGreaterThanOrEqual(
        base.p5Fps * REGRESSION_THRESHOLD,
      );
    }
  });
}
