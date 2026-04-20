/** Metric aggregator for one benchmark frame. */
export interface FrameSample {
  t: number;
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  jsHeapMb: number;
}

/** Aggregated summary produced at route end. */
export interface BenchmarkSummary {
  route: string;
  device: string;
  userAgent: string;
  startedAt: string;
  durationMs: number;
  frameCount: number;
  avgFps: number;
  p1Fps: number;
  p5Fps: number;
  peakFrameTimeMs: number;
  avgFrameTimeMs: number;
  /** 50th percentile frame time (median), in milliseconds. */
  p50FrameTimeMs: number;
  /** 95th percentile frame time, in milliseconds. */
  p95FrameTimeMs: number;
  /** 99th percentile frame time (worst hitches), in milliseconds. */
  p99FrameTimeMs: number;
  peakDrawCalls: number;
  /** Mean draw calls per frame across the capture. */
  avgDrawCalls: number;
  peakTriangles: number;
  /** Mean triangles rendered per frame across the capture. */
  avgTriangles: number;
  /** Mean textures bound per frame across the capture. */
  avgTextures: number;
  peakJsHeapMb: number;
  frames: FrameSample[];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Immutable capture session — call sample() each frame, finish() at end. */
export class BenchmarkCapture {
  private readonly route: string;
  private readonly startedAt: string;
  private readonly frames: FrameSample[] = [];
  // Sentinel 0 = baseline not yet established. First sample() call sets the
  // baseline and returns without pushing a sample, so mount/shader-compile
  // latency doesn't pollute p1Fps with a spurious spike or near-zero reading.
  private lastFrameTime = 0;

  constructor(route: string) {
    this.route = route;
    this.startedAt = new Date().toISOString();
  }

  /**
   * Call once per frame with the Three.js WebGLRenderer.info object.
   * rendererInfo shape: { render: { calls, triangles }, memory: { geometries, textures } }
   */
  sample(rendererInfo: {
    render: { calls: number; triangles: number };
    memory: { geometries: number; textures: number };
  }): void {
    const now = performance.now();
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = now;
      return;
    }
    const frameTimeMs = now - this.lastFrameTime;
    this.lastFrameTime = now;

    const fps = frameTimeMs > 0 ? 1000 / frameTimeMs : 0;

    const jsHeapMb =
      typeof (performance as any).memory !== 'undefined'
        ? (performance as any).memory.usedJSHeapSize / (1024 * 1024)
        : 0;

    this.frames.push({
      t: now,
      fps,
      frameTimeMs,
      drawCalls: rendererInfo.render.calls,
      triangles: rendererInfo.render.triangles,
      geometries: rendererInfo.memory.geometries,
      textures: rendererInfo.memory.textures,
      jsHeapMb,
    });
  }

  /** Build and return the final summary. */
  finish(): BenchmarkSummary {
    const fps = this.frames.map((f) => f.fps);
    const fts = this.frames.map((f) => f.frameTimeMs);
    const draws = this.frames.map((f) => f.drawCalls);
    const tris = this.frames.map((f) => f.triangles);
    const textures = this.frames.map((f) => f.textures);
    const sortedFps = [...fps].sort((a, b) => a - b);
    const sortedFts = [...fts].sort((a, b) => a - b);

    return {
      route: this.route,
      device: navigator.userAgent.split('(')[1]?.split(')')[0] ?? 'unknown',
      userAgent: navigator.userAgent,
      startedAt: this.startedAt,
      durationMs:
        this.frames.length > 0
          ? this.frames[this.frames.length - 1].t - this.frames[0].t
          : 0,
      frameCount: this.frames.length,
      avgFps: mean(fps),
      p1Fps: percentile(sortedFps, 1),
      p5Fps: percentile(sortedFps, 5),
      peakFrameTimeMs: fts.length > 0 ? Math.max(...fts) : 0,
      avgFrameTimeMs: mean(fts),
      p50FrameTimeMs: percentile(sortedFts, 50),
      p95FrameTimeMs: percentile(sortedFts, 95),
      p99FrameTimeMs: percentile(sortedFts, 99),
      peakDrawCalls: draws.length > 0 ? Math.max(...draws) : 0,
      avgDrawCalls: mean(draws),
      peakTriangles: tris.length > 0 ? Math.max(...tris) : 0,
      avgTriangles: mean(tris),
      avgTextures: mean(textures),
      peakJsHeapMb:
        this.frames.length > 0
          ? Math.max(...this.frames.map((f) => f.jsHeapMb))
          : 0,
      frames: this.frames,
    };
  }
}
