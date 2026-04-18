import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  SMAA,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BiomeService } from '@/biome';
import { getPlayer } from '@/ecs/actions/game';
import { useEnvironment } from '@/ecs/hooks/useGameSession';
import type { BiomeConfig } from '@/biome';

// Stable module-level tuple so ChromaticAberration doesn't see a new array
// every render and trigger the React-19 StrictMode circular-JSON crash.
const CHROMA_INITIAL: [number, number] = [0, 0];

/** 0–1 time-of-day → dawn/noon/dusk/night bucket string. */
function tod(timeOfDay: number): 'dawn' | 'noon' | 'dusk' | 'night' {
  if (timeOfDay < 0.2 || timeOfDay >= 0.85) return 'night';
  if (timeOfDay < 0.35) return 'dawn';
  if (timeOfDay < 0.7) return 'noon';
  return 'dusk';
}

interface PostParams {
  bloomIntensity: number;
  bloomThreshold: number;
  vignetteOffset: number;
  vignetteDarkness: number;
  chromaticOffset: number;
  noiseOpacity: number;
}

function paramsForBiomeAndTime(biome: BiomeConfig, timeOfDay: number): PostParams {
  const bucket = tod(timeOfDay);

  // Thornfield and moor are dark/cold — moderate bloom so highlights don't blow out.
  const isDark = biome.id === 'thornfield' || biome.id === 'moor';
  const baseBloom = isDark ? 0.25 : 0.35;
  const baseThreshold = isDark ? 0.75 : 0.8;

  // Chromatic aberration peaks at dawn/dusk atmospheric distortion.
  const isAtmospheric = bucket === 'dawn' || bucket === 'dusk';
  const chromaticOffset = isAtmospheric ? 0.0012 : 0.0004;

  // Night is darker and grainier.
  const isNight = bucket === 'night';
  const vignetteOffset = isNight ? 0.2 : 0.3;
  const vignetteDarkness = isNight ? 0.55 : 0.35;
  const noiseOpacity = isNight ? 0.08 : 0.04;

  // Bloom brightens at golden hour.
  const goldenHourBoost = isAtmospheric ? 0.1 : 0.0;

  return {
    bloomIntensity: baseBloom + goldenHourBoost,
    bloomThreshold: baseThreshold,
    vignetteOffset,
    vignetteDarkness,
    chromaticOffset,
    noiseOpacity,
  };
}

/**
 * Biome-driven post-processing pipeline.
 *
 * Bloom, chromatic aberration, and vignette intensities vary by biome id and
 * time-of-day bucket. Parameters use frame-rate-independent exponential smoothing
 * (decay constant 4 s⁻¹) so transitions don't pop at any frame rate.
 *
 * GodRays are omitted here — they require a mesh sun reference that lives
 * inside DayNightCycle. Wire them from that component when needed.
 */
export function BiomePostProcessing() {
  const { timeOfDay } = useEnvironment();

  // Smoothed current values — updated imperatively in useFrame.
  const bloomIntRef = useRef(0.3);
  const bloomThreshRef = useRef(0.8);
  const vigOffRef = useRef(0.3);
  const vigDarkRef = useRef(0.35);
  const chromaRef = useRef(0.0004);
  const noiseRef = useRef(0.04);

  // Direct refs to postprocessing effect instances for imperative uniform updates.
  const bloomRef = useRef<{ intensity: number; luminanceThreshold: number } | null>(null);
  const vignetteRef = useRef<{ offset: number; darkness: number } | null>(null);
  const chromaEffectRef = useRef<{ offset: { x: number; y: number } } | null>(null);
  const noiseEffectRef = useRef<{ opacity: number } | null>(null);

  useFrame((_, delta) => {
    let biome: BiomeConfig;
    try {
      const roadDist = getPlayer().playerPosition?.x ?? 0;
      biome = BiomeService.getCurrentBiome(roadDist);
    } catch {
      // BiomeService not yet initialised (early lifecycle) — fall back to distance 0.
      // This keeps the bloom/vignette refs driven from the first frame onward.
      try {
        biome = BiomeService.getCurrentBiome(0);
      } catch {
        return;
      }
    }

    const target = paramsForBiomeAndTime(biome, timeOfDay);
    // Frame-rate-independent exponential smoothing: decay constant 4 s⁻¹.
    const k = 1 - Math.exp(-4 * delta);

    bloomIntRef.current += (target.bloomIntensity - bloomIntRef.current) * k;
    bloomThreshRef.current += (target.bloomThreshold - bloomThreshRef.current) * k;
    vigOffRef.current += (target.vignetteOffset - vigOffRef.current) * k;
    vigDarkRef.current += (target.vignetteDarkness - vigDarkRef.current) * k;
    chromaRef.current += (target.chromaticOffset - chromaRef.current) * k;
    noiseRef.current += (target.noiseOpacity - noiseRef.current) * k;

    if (bloomRef.current) {
      bloomRef.current.intensity = bloomIntRef.current;
      bloomRef.current.luminanceThreshold = bloomThreshRef.current;
    }
    if (vignetteRef.current) {
      vignetteRef.current.offset = vigOffRef.current;
      vignetteRef.current.darkness = vigDarkRef.current;
    }
    if (chromaEffectRef.current) {
      chromaEffectRef.current.offset.x = chromaRef.current;
      chromaEffectRef.current.offset.y = chromaRef.current;
    }
    if (noiseEffectRef.current) {
      noiseEffectRef.current.opacity = noiseRef.current;
    }
  });

  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      {/* Initial props are stable. Real values drive via refs in useFrame above
          (e.g. chromaEffectRef.current.offset.x) so React never re-reconciles
          on value change. Passing changing arrays/refs at render time causes
          @react-three/postprocessing to re-create KawaseBlurPass which then
          hits a circular-JSON crash in React 19 StrictMode. */}
      <Bloom
        ref={bloomRef}
        intensity={0.5}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <ChromaticAberration
        ref={chromaEffectRef}
        offset={CHROMA_INITIAL}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise
        ref={noiseEffectRef}
        opacity={0.05}
        blendFunction={BlendFunction.SCREEN}
      />
      <Vignette
        ref={vignetteRef}
        offset={0.3}
        darkness={0.5}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
