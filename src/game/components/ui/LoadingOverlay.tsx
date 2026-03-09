import { useEffect, useState } from 'react';
import { cn } from '../../../lib/utils';
import { useGameStore } from '../../stores/gameStore';

const LOADING_STAGES = [
  'Awakening the physics engine...',
  'Charting the realm...',
  'Summoning inhabitants...',
  'Opening the gates...',
];

/** Minimum display time in ms — ensures the overlay isn't just a flash */
const MIN_DISPLAY_MS = 2000;

export function LoadingOverlay() {
  const gameActive = useGameStore((state) => state.gameActive);
  const activeChunks = useGameStore((state) => state.activeChunks);
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [startTime, setStartTime] = useState(0);

  // Show overlay when game becomes active
  useEffect(() => {
    if (gameActive && !visible && !fadeOut) {
      setVisible(true);
      setFadeOut(false);
      setStageIndex(0);
      setStartTime(Date.now());
    }
  }, [gameActive, visible, fadeOut]);

  // Advance stages over time
  useEffect(() => {
    if (!visible || fadeOut) return;

    const interval = setInterval(() => {
      setStageIndex((prev) =>
        prev < LOADING_STAGES.length - 1 ? prev + 1 : prev,
      );
    }, 500);

    return () => clearInterval(interval);
  }, [visible, fadeOut]);

  // Fade out once chunks are loaded and minimum time has passed
  useEffect(() => {
    if (!visible || fadeOut) return;
    if (activeChunks.size === 0) return;

    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

    const timeout = setTimeout(() => {
      setFadeOut(true);
      // Remove from DOM after fade animation
      setTimeout(() => {
        setVisible(false);
        setFadeOut(false);
      }, 800);
    }, remaining);

    return () => clearTimeout(timeout);
  }, [visible, fadeOut, activeChunks.size, startTime]);

  if (!visible) return null;

  const progress = Math.min(
    100,
    ((stageIndex + 1) / LOADING_STAGES.length) * 100,
  );

  return (
    <div
      className={cn(
        'absolute inset-0 z-[60] flex flex-col items-center justify-center transition-opacity duration-700',
        fadeOut ? 'opacity-0' : 'opacity-100',
      )}
      style={{
        background:
          'radial-gradient(ellipse at center, #f5f1e8 0%, #ede8dc 50%, #e8d7c3 100%)',
      }}
    >
      {/* Decorative rune circle — slow spin */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] opacity-[0.04] pointer-events-none">
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full animate-spin"
          style={{ animationDuration: '60s' }}
          aria-hidden="true"
        >
          <circle
            cx="100"
            cy="100"
            r="95"
            fill="none"
            stroke="#c4a747"
            strokeWidth="0.8"
          />
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#c4a747"
            strokeWidth="0.4"
            strokeDasharray="6 3"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Title */}
        <h2
          className="font-lora text-3xl font-bold tracking-[0.05em] mb-8"
          style={{
            color: '#8b6f47',
            textShadow: '0 0 20px rgba(196, 167, 71, 0.15)',
          }}
        >
          Preparing the Realm
        </h2>

        {/* Progress bar container */}
        <div className="w-64 md:w-80">
          <div className="h-1 bg-yellow-900/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-600/60 to-yellow-500/80 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Stage text */}
          <p className="text-yellow-800/60 text-xs tracking-wider mt-4 text-center font-light italic">
            {LOADING_STAGES[stageIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
