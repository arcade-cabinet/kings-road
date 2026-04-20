import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { setJoystick, setKey } from '@/ecs/actions/game';
import { BenchmarkCapture } from './capture';
import { exportBenchmarkJson } from './export';
import { buildMarkdownReport } from './report';
import { type BenchmarkRoute, getFrameAtTime, getRoute } from './routes';

/** Maps a `?benchmark=<biome>` alias to a canonical route id. */
const BIOME_TO_ROUTE: Record<string, string> = {
  thornfield: 'walk-thornfield-forward',
};

/** localStorage key that receives the final summary when the alias path runs. */
export const BENCHMARK_STORAGE_KEY = 'kr.benchmark.last';

/**
 * Parse the active benchmark route from the URL. Accepts either:
 *   - `?bench=<route-id>` — legacy explicit route selector
 *   - `?benchmark=<biome>` — task #22 biome-alias selector
 * Returns the resolved route id, or null when neither param is present.
 */
export function parseBenchParam(): string | null {
  const params = new URLSearchParams(window.location.search);
  const alias = params.get('benchmark');
  if (alias) {
    const resolved = BIOME_TO_ROUTE[alias.toLowerCase()];
    if (resolved) return resolved;
    // Unresolved alias — surface the raw value so the "unknown route" HUD
    // fires instead of silently no-op-ing.
    return alias;
  }
  return params.get('bench');
}

/** Whether the run was triggered via the `?benchmark=<biome>` alias. */
export function isBenchmarkAliasRoute(): boolean {
  return new URLSearchParams(window.location.search).has('benchmark');
}

type Phase = 'idle' | 'running' | 'done';

/**
 * Module-level phase store. The sampler lives INSIDE R3F's <Canvas>, the HUD
 * lives OUTSIDE it — they have no shared parent, so phase transitions
 * propagate through a plain pub/sub rather than a new React context.
 * Using context would force us to wrap <Canvas>, which re-parents the whole
 * R3F tree and breaks the scene module's "no new providers" convention.
 */
type PhaseState = { phase: Phase; routeId: string | null; report: string };

const phaseStore = createPhaseStore();

function createPhaseStore() {
  let state: PhaseState = { phase: 'idle', routeId: null, report: '' };
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState: (patch: Partial<PhaseState>) => {
      state = { ...state, ...patch };
      for (const l of listeners) l();
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

function usePhaseState(): PhaseState {
  return useSyncExternalStore(
    phaseStore.subscribe,
    phaseStore.getState,
    phaseStore.getState,
  );
}

/**
 * Inner R3F component — must be mounted inside a Canvas. Drives scripted
 * input and samples renderer stats each frame. On end, writes results to
 * localStorage (alias mode) and publishes the final report to the phase
 * store so the HUD outside Canvas can display it.
 */
function BenchmarkFrameSampler({ route }: { route: BenchmarkRoute }) {
  const { gl } = useThree();
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const captureRef = useRef<BenchmarkCapture | null>(null);

  // One-shot 2s warm-up so shader compile + first chunk load don't pollute
  // the first samples. Must live here (inside Canvas) so we can hand the
  // capture to the same useFrame without a cross-component race.
  useEffect(() => {
    const t = setTimeout(() => {
      captureRef.current = new BenchmarkCapture(route.id);
      phaseStore.setState({ phase: 'running' });
    }, 2000);
    return () => clearTimeout(t);
  }, [route.id]);

  // priority=2: runs AFTER BiomePostProcessing's useFrame(cb, 1). R3F
  // processes lower priorities first. The composer does its work at
  // priority 1 via composer.render(delta), which is what actually feeds
  // gl.info.render. If we sampled at priority 0 (default), gl.info
  // would report the state BEFORE the composer drew anything — which is
  // why cb=149 reported avgDrawCalls=1, avgTriangles=1 despite the
  // scene clearly rendering dozens of instanced meshes + terrain + UI.
  useFrame(() => {
    if (doneRef.current) return;
    const capture = captureRef.current;
    if (!capture) return;

    const now = performance.now();
    if (startRef.current === null) startRef.current = now;
    const elapsed = (now - startRef.current) / 1000;

    // Feed scripted input into ECS
    const frame = getFrameAtTime(route, elapsed);
    setJoystick(
      { x: frame.moveX, y: -frame.moveZ },
      Math.sqrt(frame.moveX ** 2 + frame.moveZ ** 2),
    );
    // Map InputFrame booleans to the legacy InputState keys the game systems read.
    // 'action' covers both interact and attack in the current InputState schema.
    setKey('action', frame.attack || frame.interact);
    setKey('shift', frame.sprint);

    // Sample renderer metrics — runs AFTER composer.render(delta) because
    // this callback is priority 2 and the composer is priority 1.
    capture.sample(gl.info);

    if (elapsed >= route.durationSeconds) {
      doneRef.current = true;
      // Clear all input
      setJoystick({ x: 0, y: 0 }, 0);
      setKey('action', false);
      setKey('shift', false);
      finalizeRun(capture, route);
    }
  }, 2);

  return null;
}

function finalizeRun(capture: BenchmarkCapture, route: BenchmarkRoute) {
  const summary = capture.finish();
  const report = buildMarkdownReport(summary);
  const aliasMode = isBenchmarkAliasRoute();
  // Blob download only in the legacy `?bench=` flow — the alias flow
  // (task #22) ships data via localStorage for headless capture.
  if (!aliasMode) {
    exportBenchmarkJson(summary);
  }
  // Log slim summary to console for Playwright to capture — omit per-frame
  // data to keep log size sane.
  const { frames: _frames, ...slim } = summary;
  console.log('[benchmark:summary]', JSON.stringify(slim));

  if (aliasMode) {
    const line =
      `[BENCHMARK] p50=${summary.p50FrameTimeMs.toFixed(2)}ms ` +
      `p95=${summary.p95FrameTimeMs.toFixed(2)}ms ` +
      `p99=${summary.p99FrameTimeMs.toFixed(2)}ms ` +
      `avgDraws=${summary.avgDrawCalls.toFixed(0)} ` +
      `avgTris=${summary.avgTriangles.toFixed(0)}`;
    console.log(line);
    try {
      localStorage.setItem(BENCHMARK_STORAGE_KEY, JSON.stringify(summary));
    } catch (err) {
      // QuotaExceeded on devices with near-full storage — fall back to
      // a slim payload without per-frame rows.
      console.warn(
        '[benchmark] localStorage write failed, retrying slim:',
        err,
      );
      try {
        localStorage.setItem(BENCHMARK_STORAGE_KEY, JSON.stringify(slim));
      } catch (err2) {
        console.error('[benchmark] slim localStorage write also failed:', err2);
      }
    }
  }

  phaseStore.setState({ phase: 'done', routeId: route.id, report });
}

/**
 * BenchmarkRunner — the in-Canvas piece. Mount inside <Canvas> children.
 * Uses useFrame/useThree, so it MUST live in R3F context.
 *
 * Activates automatically when `?bench=<route-id>` or
 * `?benchmark=<biome>` is present. No-op otherwise.
 */
export function BenchmarkRunner() {
  const routeId = parseBenchParam();
  const route = routeId ? getRoute(routeId) : undefined;

  useEffect(() => {
    if (routeId) {
      phaseStore.setState({ phase: 'idle', routeId });
    }
  }, [routeId]);

  if (!route) return null;
  return <BenchmarkFrameSampler route={route} />;
}

/**
 * BenchmarkHUD — the out-of-Canvas overlay. Mount as a sibling of <Canvas>.
 * Renders the DOM overlay that Playwright targets via `data-testid`. Safe
 * to mount unconditionally; returns null when no benchmark is active.
 */
export function BenchmarkHUD() {
  const routeId = parseBenchParam();
  const route = routeId ? getRoute(routeId) : undefined;
  const { phase, report } = usePhaseState();

  if (!routeId) return null;

  if (!route) {
    return (
      <div
        data-testid="benchmark-hud"
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          background: 'rgba(0,0,0,0.8)',
          color: '#ff4444',
          padding: '8px 16px',
          fontFamily: 'monospace',
          fontSize: 14,
          borderRadius: 4,
          zIndex: 9999,
        }}
      >
        Unknown benchmark route: &quot;{routeId}&quot;
      </div>
    );
  }

  return (
    <div
      data-testid="benchmark-hud"
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        background: 'rgba(0,0,0,0.75)',
        color: '#00ff88',
        padding: '8px 16px',
        fontFamily: 'monospace',
        fontSize: 13,
        borderRadius: 4,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {phase === 'idle' && `BENCH: ${route.label} — loading…`}
      {phase === 'running' && `BENCH: ${route.label} — recording`}
      {phase === 'done' && (
        <>
          <div>BENCH COMPLETE: {route.label}</div>
          <div style={{ marginTop: 4, whiteSpace: 'pre', fontSize: 11 }}>
            {report.slice(0, 400)}
          </div>
        </>
      )}
    </div>
  );
}
