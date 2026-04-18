/**
 * Download benchmark results as JSON via Blob URL.
 * On mobile: download → AirDrop to Mac.
 */

import type { BenchmarkResult } from './capture';

export function downloadBenchmarkJson(result: BenchmarkResult): void {
  const date = new Date().toISOString().slice(0, 10);
  const slug = result.device.toLowerCase().replace(/\s+/g, '-');
  const filename = `benchmark-${result.route}-${date}-${slug}.json`;
  const json = JSON.stringify(result, null, 2);

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
