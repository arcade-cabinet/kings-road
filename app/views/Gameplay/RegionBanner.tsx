import { useEffect, useRef, useState } from 'react';
import { getPlayer, setRegionCrossing } from '@/ecs/actions/game';
import { useFlags, useRegionCrossing } from '@/ecs/hooks/useGameSession';

/** How long the banner stays fully visible before the fade-out starts (ms). */
const BANNER_DISPLAY_MS = 2000;

/** Fade-out animation duration (ms) — matches CSS transition-duration. */
const FADE_OUT_MS = 700;

/**
 * Metres past the crossing point before the banner auto-dismisses on
 * movement. Acts as a safety valve on top of the timer (e.g. player teleport
 * or fast-travel drops them 20 m past the boundary before the timer fires).
 */
const AUTO_DISMISS_DISTANCE = 20;

/**
 * RegionBanner — DOM overlay that displays the road-spine biome region name
 * when the player crosses a boundary. Subscribes to the RegionCrossing
 * session trait (written by RegionCrossingSystem inside the R3F Canvas).
 *
 * Visual design: centred, illuminated-manuscript style — large Lora italic
 * with warm gold decorative rules. Fades in quickly, holds for 2 s, then
 * fades out. Distinct from:
 *  - LoadingOverlay (world-generation / asset-load gate — full-screen)
 *  - TopBand in GameplayFrame (chunk-name label — top-edge, small)
 *
 * Palette: #3d3a34 (text), #c4a747 (gold rules), #8b6f47 (warm brown),
 * rgba(245,240,232,…) (parchment wash) — from DESIGN.md.
 */
export function RegionBanner() {
  const { gameActive } = useFlags();
  const crossing = useRegionCrossing();

  const [bannerName, setBannerName] = useState<string | null>(null);
  const [fading, setFading] = useState(false);

  const lastShownId = useRef<string>('');
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const crossingDistanceRef = useRef<number>(0);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup all timers on unmount.
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current !== null) clearTimeout(dismissTimerRef.current);
      if (fadeTimerRef.current !== null) clearTimeout(fadeTimerRef.current);
      if (checkIntervalRef.current !== null) clearInterval(checkIntervalRef.current);
    };
  }, []);

  // Reset when game becomes inactive.
  useEffect(() => {
    if (!gameActive) {
      clearAllTimers();
      setBannerName(null);
      setFading(false);
      lastShownId.current = '';
    }
  }, [gameActive]);

  // React to new crossings from the Koota trait.
  useEffect(() => {
    if (!crossing || !gameActive) return;
    if (crossing.regionId === lastShownId.current) return;

    lastShownId.current = crossing.regionId;
    crossingDistanceRef.current = crossing.crossingDistance;

    // Cancel any in-flight timers.
    clearAllTimers();

    setFading(false);
    setBannerName(crossing.regionName);

    // Auto-dismiss on timer.
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      beginFade();
    }, BANNER_DISPLAY_MS);

    // Distance-based dismiss: poll player position every 250 ms.
    checkIntervalRef.current = setInterval(() => {
      const roadDist = getPlayer().playerPosition?.x ?? 0;
      if (Math.abs(roadDist - crossingDistanceRef.current) >= AUTO_DISMISS_DISTANCE) {
        clearInterval(checkIntervalRef.current!);
        checkIntervalRef.current = null;
        beginFade();
      }
    }, 250);
  }, [crossing, gameActive]); // eslint-disable-line react-hooks/exhaustive-deps

  function clearAllTimers() {
    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (fadeTimerRef.current !== null) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (checkIntervalRef.current !== null) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  }

  function beginFade() {
    setFading(true);
    // Clear the crossing trait so it can fire again for the same region if
    // the player u-turns and re-enters.
    setRegionCrossing(null);
    fadeTimerRef.current = setTimeout(() => {
      fadeTimerRef.current = null;
      setBannerName(null);
      setFading(false);
    }, FADE_OUT_MS);
  }

  if (!bannerName) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{
        opacity: fading ? 0 : 1,
        transition: fading
          ? `opacity ${FADE_OUT_MS}ms ease-out`
          : 'opacity 400ms ease-in',
      }}
    >
      <div
        className="flex flex-col items-center gap-1 px-8 py-4"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(245,240,232,0.55) 30%, rgba(245,240,232,0.55) 70%, transparent 100%)',
        }}
      >
        {/* Decorative top rule with "entering" label */}
        <div className="flex items-center gap-3 w-full justify-center mb-1">
          <span
            className="block h-px flex-1 max-w-[80px]"
            style={{
              background: 'linear-gradient(to right, transparent, #c4a747)',
            }}
          />
          <span
            className="font-lora text-[10px] tracking-[0.3em] uppercase"
            style={{ color: '#c4a747' }}
          >
            entering
          </span>
          <span
            className="block h-px flex-1 max-w-[80px]"
            style={{
              background: 'linear-gradient(to left, transparent, #c4a747)',
            }}
          />
        </div>

        {/* Region name */}
        <h2
          className="font-lora italic font-bold text-2xl md:text-3xl tracking-wide text-center"
          style={{
            color: '#3d3a34',
            textShadow:
              '0 1px 2px rgba(255,255,255,0.7), 0 0 20px rgba(196,167,71,0.25)',
          }}
        >
          {bannerName}
        </h2>

        {/* Decorative bottom rule */}
        <div className="flex items-center gap-3 w-full justify-center mt-1">
          <span
            className="block h-px flex-1 max-w-[80px]"
            style={{
              background: 'linear-gradient(to right, transparent, #8b6f47)',
            }}
          />
          <span style={{ color: '#8b6f47', fontSize: '10px' }}>✦</span>
          <span
            className="block h-px flex-1 max-w-[80px]"
            style={{
              background: 'linear-gradient(to left, transparent, #8b6f47)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
