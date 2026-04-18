import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/gameStore';

/**
 * Gameplay HUD frame — organized by mobile thumb zones, not arbitrary corner panels.
 *
 *   ┌──────────────────────────────────────────────────┐
 *   │  region label              ⚜         pause/quill │  ← top safe area (minimal)
 *   ├──────────────────────────────────────────────────┤
 *   │                                                   │
 *   │              3D WORLD — CENTER STAGE              │  ← no overlays on gameplay area
 *   │              (interactables self-light)           │
 *   │                                                   │
 *   │                                                   │
 *   ├───────────────────┬──────────────────────────────┤
 *   │   left thumb      │         right thumb          │
 *   │  (move joystick   │     (camera / tap-to-        │
 *   │   invisible zone) │      interact invisible zone)│
 *   └───────────────────┴──────────────────────────────┘
 *
 * No health bars. No minimap. No keyboard prompts. Everything diegetic.
 * Subtle top strip fades in for region transitions then fades out.
 */
export function GameplayFrame({ children }: { children?: React.ReactNode }) {
  const gameActive = useGameStore((s) => s.gameActive);
  const currentChunkName = useGameStore((s) => s.currentChunkName);
  const currentChunkType = useGameStore((s) => s.currentChunkType);

  // Fade in region name for ~2.8s when the player crosses into a new named area.
  const [visibleRegion, setVisibleRegion] = useState<string | null>(null);
  const lastRegionRef = useRef<string>('');

  useEffect(() => {
    if (!gameActive) return;
    const label = chunkToRegionLabel(currentChunkName, currentChunkType);
    if (!label || label === lastRegionRef.current) return;
    lastRegionRef.current = label;
    setVisibleRegion(label);
    const t = setTimeout(() => setVisibleRegion(null), 2800);
    return () => clearTimeout(t);
  }, [gameActive, currentChunkName, currentChunkType]);

  if (!gameActive) return null;

  return (
    <div
      className="absolute inset-0 z-20 pointer-events-none"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        paddingLeft: 'env(safe-area-inset-left, 0)',
        paddingRight: 'env(safe-area-inset-right, 0)',
      }}
    >
      <TopBand regionName={visibleRegion} />
      {children}
    </div>
  );
}

/**
 * A single narrow band at the top with:
 *  - transient region name (illuminated-manuscript fade in/out)
 *  - pause quill (top-right)
 * No time-of-day dial, no weather icon — those are diegetic (you feel it in the world).
 */
function TopBand({ regionName }: { regionName: string | null }) {
  return (
    <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-5 pt-3 pointer-events-none">
      {/* Region label — transient, manuscript-style */}
      <div
        className={cn(
          'font-lora italic text-[#4a3820] text-sm md:text-base',
          'tracking-[0.08em] transition-all duration-700 ease-out',
          regionName
            ? 'opacity-80 translate-y-0'
            : 'opacity-0 -translate-y-1 pointer-events-none',
        )}
        style={{
          textShadow:
            '0 1px 0 rgba(255,255,255,0.6), 0 0 12px rgba(255,255,255,0.4)',
        }}
      >
        {regionName}
      </div>

      {/* Quill — pause button, diegetic top-right */}
      <button
        type="button"
        aria-label="Pause"
        className={cn(
          'pointer-events-auto w-10 h-10 rounded-full',
          'flex items-center justify-center',
          'bg-white/15 backdrop-blur-sm',
          'border border-white/25',
          'active:scale-95 transition-transform duration-200',
          'shadow-[0_2px_8px_rgba(0,0,0,0.12)]',
        )}
        onClick={() => useGameStore.getState().togglePause()}
      >
        <QuillIcon />
      </button>
    </div>
  );
}

/**
 * Format the chunk's internal name/type into a display label, or null to suppress.
 * Wilderness chunks (featureless) are intentionally suppressed — only named places
 * get the illuminated "you have arrived" fade-in.
 */
function chunkToRegionLabel(
  chunkName: string | undefined,
  chunkType: string | undefined,
): string | null {
  if (!chunkName) return null;
  if (chunkType === 'wilderness') return null;
  return chunkName;
}

function QuillIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 text-[#4a3820]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Simple quill silhouette */}
      <path d="M3 21 L11 13" />
      <path d="M21 3 C13 5 9 9 7 15 L9 17 C15 15 19 11 21 3 Z" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}
