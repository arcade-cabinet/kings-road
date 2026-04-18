/**
 * BenchmarkRunner — React component that orchestrates a scripted benchmark run.
 *
 * Activated by the URL param `?bench=<route-id>` (combined with `?spawn=<biome>`
 * from the debug package so the world is loaded at the right anchor).
 *
 * On completion, auto-downloads the JSON result and prints the markdown report
 * to the browser console.
 *
 * Mounts as an overlay inside the running game — no separate route needed.
 */

import { useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { inputManager } from '@/input/InputManager';
import type { IInputProvider, InputFrame } from '@/input/types';
import { MetricCapture } from './capture';
import { downloadBenchmarkJson } from './export';
import { renderMarkdownReport } from './report';
import type { BenchmarkRoute } from './routes';
import { evaluateRoute, getRoute } from './routes';

// ── Scripted input provider ───────────────────────────────────────────────

class ScriptedInputProvider implements IInputProvider {
  readonly type = 'benchmark-scripted';
  enabled = true;

  private route: BenchmarkRoute;
  private elapsed = 0;

  constructor(route: BenchmarkRoute) {
    this.route = route;
  }

  tick(dt: number): void {
    this.elapsed += dt;
  }

  poll(_dt: number): Partial<InputFrame> {
    return evaluateRoute(this.route, this.elapsed);
  }

  postFrame(): void {
    /* no accumulators to reset */
  }

  isAvailable(): boolean {
    return true;
  }

  dispose(): void {
    this.enabled = false;
  }
}

// ── React component ───────────────────────────────────────────────────────

/** Parse ?bench= from URL. Returns null if absent. */
export function parseBenchParam(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('bench');
}

interface BenchmarkRunnerProps {
  /** Device label stamped into the output JSON (e.g. "iPhone 15 Pro"). */
  device?: string;
}

type RunState = 'idle' | 'running' | 'done';

/** R3F sub-component that samples renderer.info every frame. */
function FrameSampler({
  capture,
  route,
  onDone,
}: {
  capture: MetricCapture;
  route: BenchmarkRoute;
  onDone: () => void;
}) {
  const { gl } = useThree();
  const elapsedRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    let rafId: number;
    let lastTs = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      elapsedRef.current += dt;

      capture.sample(gl.info);

      if (!doneRef.current && elapsedRef.current >= route.totalDuration) {
        doneRef.current = true;
        onDone();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [capture, gl.info, route.totalDuration, onDone]);

  return null;
}

/** Mount this at the top of the R3F Canvas tree when ?bench= is present. */
export function BenchmarkRunner({
  device = navigator.userAgent,
}: BenchmarkRunnerProps) {
  const routeId = parseBenchParam();
  const route = routeId ? getRoute(routeId) : undefined;

  const [runState, setRunState] = useState<RunState>('idle');
  const captureRef = useRef<MetricCapture | null>(null);
  const scriptedProviderRef = useRef<ScriptedInputProvider | null>(null);

  useEffect(() => {
    if (!route || runState !== 'idle') return;

    const capture = new MetricCapture(route.id, device);
    captureRef.current = capture;

    const provider = new ScriptedInputProvider(route);
    scriptedProviderRef.current = provider;
    inputManager.register(provider);

    capture.begin();
    setRunState('running');

    return () => {
      provider.dispose();
      inputManager.unregister(provider);
    };
  }, [route, device, runState]);

  const handleDone = () => {
    const capture = captureRef.current;
    const provider = scriptedProviderRef.current;

    if (provider) {
      provider.dispose();
      inputManager.unregister(provider);
    }

    if (capture) {
      const result = capture.finish();
      downloadBenchmarkJson(result);
      console.info(`[benchmark] run complete\n${renderMarkdownReport(result)}`);
    }

    setRunState('done');
  };

  if (!route) return null;

  return (
    <>
      {runState === 'running' && captureRef.current && (
        <FrameSampler
          capture={captureRef.current}
          route={route}
          onDone={handleDone}
        />
      )}
    </>
  );
}
