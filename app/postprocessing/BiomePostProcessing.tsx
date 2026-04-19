import { useFrame, useThree } from '@react-three/fiber';
import {
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  SMAAEffect,
  VignetteEffect,
} from 'postprocessing';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
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

interface PostParams {
  bloomIntensity: number;
  bloomThreshold: number;
  vignetteOffset: number;
  vignetteDarkness: number;
  chromaticOffset: number;
  noiseOpacity: number;
}

function paramsForBiomeAndTime(
  biome: BiomeConfig,
  timeOfDay: number,
): PostParams {
  const bucket = tod(timeOfDay);
  const isDark = biome.id === 'thornfield' || biome.id === 'moor';
  const baseBloom = isDark ? 0.25 : 0.35;
  const baseThreshold = isDark ? 0.75 : 0.8;

  const isAtmospheric = bucket === 'dawn' || bucket === 'dusk';
  const chromaticOffset = isAtmospheric ? 0.0012 : 0.0004;

  const isNight = bucket === 'night';
  const vignetteOffset = isNight ? 0.2 : 0.3;
  const vignetteDarkness = isNight ? 0.55 : 0.35;
  const noiseOpacity = isNight ? 0.08 : 0.04;

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
 * Biome-driven post-processing pipeline using the raw `postprocessing`
 * library directly — bypasses @react-three/postprocessing's reconciler.
 *
 * Why: `@react-three/postprocessing` under React 19 hits
 *   `TypeError: Converting circular structure to JSON ...
 *    property 'resolution' -> object with constructor 'E'
 *    --- property 'resizable' closes the circle`
 * from postprocessing@6's `Resolution` ↔ `Resizable` mutual refs when the
 * wrapper serializes effect state for reconciliation. This class of crash
 * fires in both dev and production. Driving the composer imperatively —
 * new composer, attach RenderPass + EffectPass once, dispose on unmount —
 * avoids the serialization path entirely.
 *
 * Effects: SMAA + Bloom + ChromaticAberration + Noise + Vignette.
 * Biome + time-of-day drive the uniforms every frame with exponential
 * smoothing (decay 4 s⁻¹) so transitions don't pop.
 */
export function BiomePostProcessing() {
  const { gl, scene, camera, size } = useThree();
  const { timeOfDay } = useEnvironment();

  // Smoothed current values — updated every frame.
  const bloomIntRef = useRef(0.3);
  const bloomThreshRef = useRef(0.8);
  const vigOffRef = useRef(0.3);
  const vigDarkRef = useRef(0.35);
  const chromaRef = useRef(0.0004);
  const noiseRef = useRef(0.04);

  // Build the composer + effects once, imperatively. The composer owns its
  // framebuffer; we tell R3F to stop auto-rendering via `priority` > 0 on
  // useFrame and drive composer.render() manually instead.
  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl, {
      multisampling: 0,
    });

    composer.addPass(new RenderPass(scene, camera));

    const bloom = new BloomEffect({
      intensity: 0.3,
      luminanceThreshold: 0.8,
      luminanceSmoothing: 0.3,
      mipmapBlur: true,
    });
    const chroma = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.0004, 0.0004),
      radialModulation: false,
      modulationOffset: 0,
    });
    const noise = new NoiseEffect({ premultiply: true });
    noise.blendMode.opacity.value = 0.05;
    const vignette = new VignetteEffect({
      offset: 0.3,
      darkness: 0.5,
    });
    const smaa = new SMAAEffect();

    composer.addPass(new EffectPass(camera, smaa, bloom, chroma, noise, vignette));

    return { composer, bloom, chroma, noise, vignette };
  }, [gl, scene, camera]);

  // Resize composer + disable R3F's auto-render so we drive the composer.
  useEffect(() => {
    pipeline.composer.setSize(size.width, size.height, false);
  }, [pipeline, size.width, size.height]);

  useEffect(() => {
    return () => {
      pipeline.composer.dispose();
    };
  }, [pipeline]);

  // Drive composer.render() AFTER every frame's scene updates. Priority=1
  // runs after the default (0) R3F render loop; we also disable the default
  // renderer clear so the composer sees our scene cleanly.
  useFrame((_, delta) => {
    // Biome-driven target params.
    let biome: BiomeConfig;
    try {
      const roadDist = getPlayer().playerPosition?.x ?? 0;
      biome = BiomeService.getCurrentBiome(roadDist);
    } catch {
      try {
        biome = BiomeService.getCurrentBiome(0);
      } catch {
        // Service not yet initialised — skip this frame.
        pipeline.composer.render(delta);
        return;
      }
    }

    const target = paramsForBiomeAndTime(biome, timeOfDay);
    const k = 1 - Math.exp(-4 * delta);

    bloomIntRef.current += (target.bloomIntensity - bloomIntRef.current) * k;
    bloomThreshRef.current += (target.bloomThreshold - bloomThreshRef.current) * k;
    vigOffRef.current += (target.vignetteOffset - vigOffRef.current) * k;
    vigDarkRef.current += (target.vignetteDarkness - vigDarkRef.current) * k;
    chromaRef.current += (target.chromaticOffset - chromaRef.current) * k;
    noiseRef.current += (target.noiseOpacity - noiseRef.current) * k;

    pipeline.bloom.intensity = bloomIntRef.current;
    pipeline.bloom.luminanceMaterial.threshold = bloomThreshRef.current;
    pipeline.vignette.offset = vigOffRef.current;
    pipeline.vignette.darkness = vigDarkRef.current;
    pipeline.chroma.offset.set(chromaRef.current, chromaRef.current);
    pipeline.noise.blendMode.opacity.value = noiseRef.current;

    pipeline.composer.render(delta);
  }, 1);

  // Suppress R3F's default frame render — composer now owns the output.
  // Must return after registering the useFrame above so the hook chain is
  // stable across renders.
  useEffect(() => {
    const prevAutoClear = gl.autoClear;
    return () => {
      gl.autoClear = prevAutoClear;
    };
  }, [gl]);

  return null;
}
