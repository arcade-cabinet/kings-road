import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { togglePause } from '@/ecs/actions/game';
import { useFlags, useChunkState } from '@/ecs/hooks/useGameSession';

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
  const { gameActive } = useFlags();
  const { currentChunkName, currentChunkType } = useChunkState();

  // Fade in region name for ~2.8s when the player crosses into a new named area.
  const [visibleRegion, setVisibleRegion] = useState<string | null>(null);
  const lastRegionRef = useRef<string>('');

  useEffect(() => {
    // When gameplay stops (returning to menu, death, etc.) reset the gate so
    // the next game session's first region fades in cleanly.
    if (!gameActive) {
      lastRegionRef.current = '';
      setVisibleRegion(null);
      return;
    }
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
  // Region label is fully transient — empty DOM when nothing to show.
  // Pause affordance is a low-opacity tap zone rendered as a thin quill glyph
  // that dissolves into the vignette. No button chrome, no border, no card.
  return (
    <>
      {regionName && (
        <div
          className={cn(
            'absolute top-0 left-0 right-0 flex justify-center pt-[max(env(safe-area-inset-top),1rem)]',
            'font-lora italic text-[#4a3820] text-base md:text-lg',
            'tracking-[0.12em] pointer-events-none',
            'animate-kr-region-fade',
          )}
          style={{
            textShadow:
              '0 1px 0 rgba(255,255,255,0.6), 0 0 12px rgba(255,255,255,0.5)',
          }}
        >
          {regionName}
        </div>
      )}
      <button
        type="button"
        aria-label="Pause"
        className={cn(
          'absolute w-12 h-12 flex items-center justify-center pointer-events-auto',
          'top-[max(env(safe-area-inset-top),0.5rem)] right-[max(env(safe-area-inset-right),0.5rem)]',
          'opacity-40 hover:opacity-90 active:opacity-100',
          'active:scale-95 transition-all duration-200',
        )}
        onClick={() => togglePause()}
      >
        <QuillIcon />
      </button>
    </>
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
  // Featureless wilderness doesn't earn the 'you have arrived' fade-in —
  // only named places (towns, dungeons, roads) do. ChunkRoleTag values are
  // 'WILD' | 'TOWN' | 'DUNGEON' | 'ROAD' (see src/types/game.ts).
  if (chunkType === 'WILD') return null;
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
