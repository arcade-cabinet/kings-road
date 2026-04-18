/**
 * Markdown report generator for benchmark results.
 *
 * Produces a human-readable summary table plus a mermaid xychart-beta
 * showing frame-time distribution across the run.
 */

import type { BenchmarkResult } from './capture';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Build a mermaid xychart showing fps over time (sampled at 1s intervals). */
function buildFpsChart(result: BenchmarkResult): string {
  // Bucket frames into 1-second bins, compute avg fps per bin
  const bins = new Map<number, number[]>();
  const t0 = result.frames[0]?.ts ?? 0;

  for (const f of result.frames) {
    const bin = Math.floor((f.ts - t0) / 1000);
    if (!bins.has(bin)) bins.set(bin, []);
    bins.get(bin)!.push(f.fps);
  }

  const maxBin = Math.max(...bins.keys(), 0);
  const labels: string[] = [];
  const values: number[] = [];

  for (let i = 0; i <= maxBin; i++) {
    const bucket = bins.get(i) ?? [];
    const fps =
      bucket.length > 0 ? bucket.reduce((a, b) => a + b, 0) / bucket.length : 0;
    labels.push(`"${i}s"`);
    values.push(round2(fps));
  }

  return [
    '```mermaid',
    'xychart-beta',
    `  title "FPS over time — ${result.route}"`,
    `  x-axis [${labels.join(', ')}]`,
    '  y-axis "fps" 0 --> 120',
    `  line [${values.join(', ')}]`,
    '```',
  ].join('\n');
}

/** Render benchmark result to a markdown string. */
export function renderMarkdownReport(result: BenchmarkResult): string {
  const s = result.summary;
  const lines: string[] = [
    `# Benchmark Report — ${result.route}`,
    '',
    `**Device:** ${result.device}  `,
    `**Started:** ${result.startedAt}  `,
    `**Duration:** ${round2(result.duration)}s  `,
    `**Total frames:** ${s.totalFrames}`,
    '',
    '## Performance Summary',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Avg FPS | ${round2(s.avgFps)} |`,
    `| P50 FPS | ${round2(s.p50Fps)} |`,
    `| P5 FPS (low lows) | ${round2(s.p5Fps)} |`,
    `| P1 FPS (worst) | ${round2(s.p1Fps)} |`,
    `| Avg frame time | ${round2(s.avgFrameTime)} ms |`,
    `| Peak frame time | ${round2(s.peakFrameTime)} ms |`,
    `| Avg draw calls | ${round2(s.avgDrawCalls)} |`,
    `| Avg triangles | ${Math.round(s.avgTriangles).toLocaleString()} |`,
    `| Peak heap | ${round2(s.peakHeapMb)} MB |`,
    '',
    '## FPS Over Time',
    '',
    result.frames.length > 0 ? buildFpsChart(result) : '_No frame data._',
    '',
  ];

  return lines.join('\n');
}
