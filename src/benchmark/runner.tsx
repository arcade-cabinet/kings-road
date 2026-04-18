import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { setJoystick, setKey } from '@/ecs/actions/game';
import { BenchmarkCapture } from './capture';
import { exportBenchmarkJson } from './export';
import { buildMarkdownReport } from './report';
import { getRoute, getFrameAtTime, type BenchmarkRoute } from './routes';

/** Parse ?bench=<route-id> from the current URL. Returns null when absent. */
export function parseBenchParam(): string | null {
  return new URLSearchParams(window.location.search).get('bench');
}

type Phase = 'idle' | 'running' | 'done';

/**
 * Inner R3F component — must be mounted inside a Canvas.
 * Drives scripted input and samples renderer stats each frame.
 */
function BenchmarkFrameSampler({
  route,
  capture,
  onDone,
}: {
  route: BenchmarkRoute;
  capture: BenchmarkCapture;
  onDone: () => void;
}) {
  const { gl } = useThree();
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  useFrame((_, _delta) => {
    if (doneRef.current) return;

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

    // Sample renderer metrics
    capture.sample(gl.info);

    if (elapsed >= route.durationSeconds) {
      doneRef.current = true;
      // Clear all input
      setJoystick({ x: 0, y: 0 }, 0);
      setKey('action', false);
      setKey('shift', false);
      onDone();
    }
  });

  return null;
}

/**
 * BenchmarkRunner — must be mounted INSIDE the R3F <Canvas> because it renders
 * BenchmarkFrameSampler which calls useThree()/useFrame().
 *
 * Usage: add to the Canvas children when `?bench=<route-id>` is detected.
 * The component handles the full lifecycle: load → run → export → report.
 */
export function BenchmarkRunner() {
  const routeId = parseBenchParam();
  const route = routeId ? getRoute(routeId) : undefined;

  const [phase, setPhase] = useState<Phase>('idle');

  const captureRef = useRef<BenchmarkCapture | null>(null);
  const reportRef = useRef<string>('');

  useEffect(() => {
    if (!route) return;
    // Start after a short delay so the scene has time to fully load
    const t = setTimeout(() => {
      captureRef.current = new BenchmarkCapture(route.id);
      setPhase('running');
    }, 2000);
    return () => clearTimeout(t);
  }, [route]);

  if (!route) {
    if (!routeId) return null;
    return (
      <div
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

  function handleDone() {
    if (!captureRef.current) return;
    const summary = captureRef.current.finish();
    reportRef.current = buildMarkdownReport(summary);
    exportBenchmarkJson(summary);
    setPhase('done');
    // Log summary to console for Playwright to capture — omit per-frame data to keep log size sane
    const { frames: _frames, ...slim } = summary;
    console.log('[benchmark:summary]', JSON.stringify(slim));
  }

  return (
    <>
      {phase === 'running' && captureRef.current && (
        <BenchmarkFrameSampler
          route={route}
          capture={captureRef.current}
          onDone={handleDone}
        />
      )}

      {/* HUD overlay */}
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
              {reportRef.current.slice(0, 400)}
            </div>
          </>
        )}
      </div>
    </>
  );
}
