/**
 * Metric aggregator for benchmark runs.
 *
 * Collects per-frame samples then builds a structured JSON report on
 * completion, including per-percentile fps breakdowns.
 */

export interface FrameSample {
  /** Wall-clock timestamp (ms, from performance.now()). */
  ts: number;
  /** Frame duration in ms. */
  frameTime: number;
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  /** JS heap in bytes (may be 0 on platforms without performance.memory). */
  heapUsed: number;
}

export interface BenchmarkSummary {
  avgFps: number;
  p1Fps: number;
  p5Fps: number;
  p50Fps: number;
  peakFrameTime: number;
  avgFrameTime: number;
  totalFrames: number;
  avgDrawCalls: number;
  avgTriangles: number;
  peakHeapMb: number;
}

export interface BenchmarkResult {
  route: string;
  device: string;
  startedAt: string;
  duration: number;
  frames: FrameSample[];
  summary: BenchmarkSummary;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export class MetricCapture {
  private frames: FrameSample[] = [];
  private readonly route: string;
  private readonly device: string;
  private readonly startedAt: string;
  private startTs = 0;

  constructor(route: string, device: string) {
    this.route = route;
    this.device = device;
    this.startedAt = new Date().toISOString();
  }

  begin(): void {
    this.startTs = performance.now();
    this.frames = [];
  }

  /** Record a single frame. `rendererInfo` mirrors three.js renderer.info. */
  sample(rendererInfo: {
    render: { calls: number; triangles: number };
    memory: { geometries: number; textures: number };
  }): void {
    const now = performance.now();
    const frameTime =
      this.frames.length > 0 ? now - this.frames[this.frames.length - 1].ts : 0;

    const heapUsed =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (performance as any).memory !== 'undefined'
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (performance as any).memory.usedJSHeapSize
        : 0;

    this.frames.push({
      ts: now,
      frameTime,
      fps: frameTime > 0 ? 1000 / frameTime : 0,
      drawCalls: rendererInfo.render.calls,
      triangles: rendererInfo.render.triangles,
      geometries: rendererInfo.memory.geometries,
      textures: rendererInfo.memory.textures,
      heapUsed,
    });
  }

  finish(): BenchmarkResult {
    const duration = (performance.now() - this.startTs) / 1000;
    const fpsList = this.frames.map((f) => f.fps).sort((a, b) => a - b);
    const ftList = this.frames.map((f) => f.frameTime);

    const summary: BenchmarkSummary = {
      avgFps: avg(fpsList),
      p1Fps: percentile(fpsList, 1),
      p5Fps: percentile(fpsList, 5),
      p50Fps: percentile(fpsList, 50),
      peakFrameTime: Math.max(0, ...ftList),
      avgFrameTime: avg(ftList),
      totalFrames: this.frames.length,
      avgDrawCalls: avg(this.frames.map((f) => f.drawCalls)),
      avgTriangles: avg(this.frames.map((f) => f.triangles)),
      peakHeapMb:
        Math.max(0, ...this.frames.map((f) => f.heapUsed)) / 1_048_576,
    };

    return {
      route: this.route,
      device: this.device,
      startedAt: this.startedAt,
      duration,
      frames: this.frames,
      summary,
    };
  }
}
