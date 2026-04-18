import type { BenchmarkSummary } from './capture';

/**
 * Download a BenchmarkSummary as a JSON file via a Blob URL.
 * On mobile: download lands in Downloads → AirDrop / share to Mac.
 */
export function exportBenchmarkJson(summary: BenchmarkSummary): void {
  const json = JSON.stringify(summary, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = summary.startedAt.slice(0, 10);
  const routeSlug = summary.route.replace(/[^a-z0-9-]/g, '-');
  const filename = `benchmark-${routeSlug}-${date}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
