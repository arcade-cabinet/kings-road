import { describe, expect, it } from 'vitest';
import { BenchmarkCapture } from '../capture';

const fakeInfo = {
  render: { calls: 10, triangles: 1000 },
  memory: { geometries: 5, textures: 8 },
};

describe('BenchmarkCapture', () => {
  it('skips the first frame and counts only subsequent samples', () => {
    const cap = new BenchmarkCapture('test-route');
    cap.sample(fakeInfo); // first call — establishes baseline, no sample pushed
    cap.sample(fakeInfo); // second call — first real sample
    const summary = cap.finish();
    expect(summary.frameCount).toBe(1);
  });

  it('records zero frames if only one sample() call is made', () => {
    const cap = new BenchmarkCapture('test-route');
    cap.sample(fakeInfo);
    const summary = cap.finish();
    expect(summary.frameCount).toBe(0);
    expect(summary.avgFps).toBe(0);
    expect(summary.p1Fps).toBe(0);
  });

  it('does not push a spuriously high or zero fps on the first frame', () => {
    const cap = new BenchmarkCapture('test-route');
    cap.sample(fakeInfo);
    cap.sample(fakeInfo);
    cap.sample(fakeInfo);
    const summary = cap.finish();
    // Two real samples pushed. fps values must all be finite positive numbers.
    expect(summary.frameCount).toBe(2);
    for (const frame of summary.frames) {
      expect(frame.fps).toBeGreaterThan(0);
      expect(Number.isFinite(frame.fps)).toBe(true);
    }
  });

  it('accumulates renderer metrics from real frames only', () => {
    const cap = new BenchmarkCapture('test-route');
    cap.sample(fakeInfo);
    const richInfo = {
      render: { calls: 42, triangles: 9999 },
      memory: { geometries: 3, textures: 12 },
    };
    cap.sample(richInfo);
    const summary = cap.finish();
    expect(summary.peakDrawCalls).toBe(42);
    expect(summary.peakTriangles).toBe(9999);
  });
});
