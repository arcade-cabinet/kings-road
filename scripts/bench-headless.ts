#!/usr/bin/env tsx
/**
 * Headless Thornfield benchmark runner — task #22.
 *
 * Launches Chromium via the Playwright browser automation API (already a
 * devDependency — no new packages), navigates to `?benchmark=thornfield`,
 * waits for the 60s capture to finish, reads the full summary from
 * `localStorage['kr.benchmark.last']`, and prints it to stdout as JSON.
 *
 * Usage:
 *   pnpm exec tsx scripts/bench-headless.ts > bench.json
 *
 * Env:
 *   BENCH_URL   — override the base URL. Defaults to http://localhost:8081.
 *   BENCH_WAIT  — seconds to wait after navigation before giving up on
 *                 the [BENCHMARK] console line. Defaults to 90s (60s run
 *                 + 2s warm-up + 28s slack for scene boot + shader compile).
 *   BENCH_HEAD  — set to "1" to launch a headed browser for debugging.
 */
import { chromium } from '@playwright/test';

const DEFAULT_BASE = process.env.BENCH_URL ?? 'http://localhost:8081';
const WAIT_SECONDS = Number(process.env.BENCH_WAIT ?? '90');
const HEADED = process.env.BENCH_HEAD === '1';

const STORAGE_KEY = 'kr.benchmark.last';
const BENCH_LINE_PREFIX = '[BENCHMARK]';

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: !HEADED });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      // WebGL needs hardware-accelerated context; chromium headless default
      // includes swiftshader which is plenty for a benchmark *contract*
      // test. If a caller wants GPU-real numbers they can set BENCH_HEAD=1
      // and a GPU-enabled Chrome channel separately.
    });
    const page = await context.newPage();

    // Mirror browser logs to stderr for diagnosis — stdout stays pure JSON.
    page.on('console', (msg) => {
      const text = msg.text();
      process.stderr.write(`[page:${msg.type()}] ${text}\n`);
    });
    page.on('pageerror', (err) => {
      process.stderr.write(`[page:error] ${err.message}\n`);
    });

    const url = `${DEFAULT_BASE}/?benchmark=thornfield`;
    process.stderr.write(`[bench-headless] navigating: ${url}\n`);
    await page.goto(url, { waitUntil: 'load' });

    // Wait for the single-line [BENCHMARK] console log. Using a promise race
    // over page events because Playwright's waitForEvent chains awkwardly
    // with timeouts we want to be explicit about.
    const benchLine = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(
            `Timed out waiting ${WAIT_SECONDS}s for [BENCHMARK] console line`,
          ),
        );
      }, WAIT_SECONDS * 1000);
      page.on('console', (msg) => {
        const text = msg.text();
        if (text.startsWith(BENCH_LINE_PREFIX)) {
          clearTimeout(timer);
          resolve(text);
        }
      });
    });
    process.stderr.write(`[bench-headless] ${benchLine}\n`);

    // Read the full summary from localStorage.
    const json = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      STORAGE_KEY,
    );
    if (!json) {
      throw new Error(
        `localStorage[${STORAGE_KEY}] was empty after [BENCHMARK] line`,
      );
    }

    // Validate it parses — emit the original string so downstream tooling
    // gets identical bytes to what was written. Pretty-print so `> bench.json`
    // is human-readable.
    const parsed = JSON.parse(json);
    process.stdout.write(`${JSON.stringify(parsed, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  process.stderr.write(`[bench-headless] ERROR: ${err?.stack ?? err}\n`);
  process.exit(1);
});
