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

/** 0–1 time-of-day → dawn/noon/dusk/night bucket string. */
function tod(timeOfDay: number): 'dawn' | 'noon' | 'dusk' | 'night' {
  if (timeOfDay < 0.2 || timeOfDay >= 0.85) return 'night';
  if (timeOfDay < 0.35) return 'dawn';
  if (timeOfDay < 0.7) return 'noon';
  return 'dusk';
}

/** Smooth-step clamp [0,1]. */
function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
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
 * time-of-day bucket. Parameters lerp frame-by-frame (0.05 factor) so biome
 * transitions don't cause visible pops.
 *
 * GodRays are omitted here — they require a mesh sun reference that lives
 * inside DayNightCycle. Wire them from that component when needed.
 */
export function BiomePostProcessing() {
  const { timeOfDay } = useEnvironment();

  // Smoothed targets — updated each frame inside useFrame.
  const bloomIntRef = useRef(0.3);
  const bloomThreshRef = useRef(0.8);
  const vigOffRef = useRef(0.3);
  const vigDarkRef = useRef(0.35);
  const chromaRef = useRef(0.0004);
  const noiseRef = useRef(0.04);

  // Refs for the live effect props. @react-three/postprocessing reads these
  // directly from the effect uniforms, so we drive them imperatively via
  // useFrame rather than re-rendering the whole pipeline.
  const bloomRef = useRef<{ intensity: number; luminanceThreshold: number } | null>(null);
  const vignetteRef = useRef<{ offset: number; darkness: number } | null>(null);

  useFrame(() => {
    let biome: BiomeConfig;
    try {
      const roadDist = getPlayer().playerPosition?.x ?? 0;
      biome = BiomeService.getCurrentBiome(roadDist);
    } catch {
      return;
    }

    const target = paramsForBiomeAndTime(biome, timeOfDay);
    const k = 0.05; // lerp factor — slow enough to avoid pops, fast enough for day transitions

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
  });

  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        ref={bloomRef}
        intensity={bloomIntRef.current}
        luminanceThreshold={bloomThreshRef.current}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <ChromaticAberration
        offset={[chromaRef.current, chromaRef.current]}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise
        opacity={noiseRef.current}
        blendFunction={BlendFunction.SCREEN}
      />
      <Vignette
        ref={vignetteRef}
        offset={vigOffRef.current}
        darkness={vigDarkRef.current}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

export { smoothstep };
