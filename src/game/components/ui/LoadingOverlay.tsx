import { useProgress } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { cn } from '../../../lib/utils';
import { useGameStore } from '../../stores/gameStore';
import { useWorldStore } from '../../stores/worldStore';

/** Fallback stage messages shown while chunks are loading (after generation) */
const CHUNK_LOADING_STAGES = [
  'Awakening the physics engine...',
  'Summoning inhabitants...',
  'Opening the gates...',
];

/** Minimum display time in ms — ensures the overlay isn't just a flash */
const MIN_DISPLAY_MS = 2000;

export function LoadingOverlay() {
  const gameActive = useGameStore((state) => state.gameActive);
  const seedPhrase = useGameStore((state) => state.seedPhrase);
  const activeChunks = useGameStore((state) => state.activeChunks);

  const isGenerating = useWorldStore((state) => state.isGenerating);
  const generationProgress = useWorldStore((state) => state.generationProgress);
  const generationPhase = useWorldStore((state) => state.generationPhase);

  // Real-time asset loading progress from Three.js
  const { progress: assetProgress, active: assetsLoading } = useProgress();

  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [chunkStageIndex, setChunkStageIndex] = useState(0);
  const [startTime, setStartTime] = useState(0);

  // Show overlay when generation begins or when a significant asset load is triggered
  useEffect(() => {
    const isMajorAssetLoad = assetsLoading && assetProgress < 100;

    // Only show if we aren't already visible/fading, and it's either the initial generation
    // or a significant mid-game asset load (e.g. entering a new zone)
    if ((isGenerating || isMajorAssetLoad) && !visible && gameActive) {
      setVisible(true);
      setFadeOut(false);
      setChunkStageIndex(0);
      setStartTime(Date.now());
    }
  }, [isGenerating, assetsLoading, assetProgress, visible, gameActive]);

  // Advance chunk-loading stages over time (after generation completes)
  useEffect(() => {
    if (!visible || fadeOut || isGenerating) return;

    const interval = setInterval(() => {
      setChunkStageIndex((prev) =>
        prev < CHUNK_LOADING_STAGES.length - 1 ? prev + 1 : prev,
      );
    }, 600);

    return () => clearInterval(interval);
  }, [visible, fadeOut, isGenerating]);

  // Fade out once chunks are loaded, assets are hot, and minimum time has passed
  useEffect(() => {
    if (!visible || fadeOut) return;
    if (isGenerating || (assetsLoading && assetProgress < 100)) return;
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
  }, [
    visible,
    fadeOut,
    isGenerating,
    assetsLoading,
    assetProgress,
    activeChunks.size,
    startTime,
  ]);

  if (!visible) return null;

  // Weighted progress calculation:
  // 1. World Generation (0-60%)
  // 2. Asset Downloading (60-90%)
  // 3. Finalizing/Physics (90-100%)
  let displayProgress = 0;
  if (isGenerating) {
    displayProgress = generationProgress * 60;
  } else if (assetsLoading) {
    displayProgress = 60 + (assetProgress / 100) * 30;
  } else {
    displayProgress =
      90 + ((chunkStageIndex + 1) / CHUNK_LOADING_STAGES.length) * 10;
  }
  const progress = Math.min(100, displayProgress);

  // Phase text logic
  let phaseText = '';
  if (isGenerating) {
    phaseText = generationPhase || 'Weaving the landscape...';
  } else if (assetsLoading && assetProgress < 100) {
    phaseText = 'Unrolling the ancient scrolls...';
  } else {
    phaseText = CHUNK_LOADING_STAGES[chunkStageIndex];
  }

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
      {/* Decorative rune circle -- slow spin */}
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
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <line
              key={`rune-${angle}`}
              x1="100"
              y1="5"
              x2="100"
              y2="20"
              stroke="#c4a747"
              strokeWidth="0.5"
              transform={`rotate(${angle} 100 100)`}
            />
          ))}
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Title */}
        <h2
          className="font-lora text-3xl font-bold tracking-[0.05em] mb-2"
          style={{
            color: '#8b6f47',
            textShadow: '0 0 20px rgba(196, 167, 71, 0.15)',
          }}
        >
          Preparing the Realm
        </h2>

        {/* Seed name */}
        {seedPhrase && (
          <div className="flex items-center gap-3 mb-8">
            <span className="w-6 h-px bg-gradient-to-r from-transparent to-yellow-600/30" />
            <span
              className="font-lora text-lg font-semibold tracking-wider"
              style={{ color: '#a68b5b' }}
            >
              {seedPhrase}
            </span>
            <span className="w-6 h-px bg-gradient-to-l from-transparent to-yellow-600/30" />
          </div>
        )}

        {/* Progress bar container */}
        <div className="w-64 md:w-80">
          {/* Progress track */}
          <div className="h-1.5 bg-yellow-900/10 overflow-hidden rounded-full">
            <div
              className="h-full bg-gradient-to-r from-yellow-700/50 via-yellow-500/80 to-yellow-400/90 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Phase text */}
          <p className="text-yellow-800/60 text-xs tracking-wider mt-4 text-center font-light italic min-h-[1.25rem]">
            {phaseText}
          </p>
        </div>
      </div>
    </div>
  );
}
