import { useFrame, useThree } from '@react-three/fiber';
import {
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
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
  const baseBloom = isDark ? 0.12 : 0.18;
  const baseThreshold = isDark ? 0.82 : 0.85;

  const isAtmospheric = bucket === 'dawn' || bucket === 'dusk';
  const chromaticOffset = isAtmospheric ? 0.0006 : 0.0002;

  const isNight = bucket === 'night';
  const vignetteOffset = isNight ? 0.35 : 0.45;
  const vignetteDarkness = isNight ? 0.4 : 0.22;
  const noiseOpacity = isNight ? 0.03 : 0.015;

  const goldenHourBoost = isAtmospheric ? 0.05 : 0.0;

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
 * Why not @react-three/postprocessing: the wrapper under React 19 hits
 *   `TypeError: Converting circular structure to JSON ...
 *    property 'resolution' -> object with constructor 'E'
 *    --- property 'resizable' closes the circle`
 * every frame in both dev and prod (`postprocessing@6`'s Resolution ↔
 * Resizable mutual refs + reconciler's JSON.stringify).
 *
 * How the render loop works:
 *  - `useFrame(cb, 1)` — `priority > 0` tells R3F 9 to skip the default
 *    `state.gl.render(scene, camera)` call (react-three-fiber@9 source
 *    line ~16041: `if (!state.internal.priority) state.gl.render(...)`).
 *  - Our composer's last pass (`EffectPass`) writes directly to the
 *    canvas via its internal `renderToScreen=true`, so calling
 *    `composer.render(delta)` produces the final image.
 *  - Pipeline is built once via `useMemo` and resized via `useEffect` on
 *    the viewport `size` — no reconciliation of children = no JSON
 *    cycle crash.
 *
 * Effects: Bloom + ChromaticAberration + Noise + Vignette. Omitted SMAA
 * because its async lookup-texture loading can cause a blank frame or
 * two at mount before antialiasing is ready (renders correctly once
 * loaded, but an earlier revision of this component showed a black
 * frame during that window on Pages). The Canvas's `antialias: false`
 * can be promoted later if we want SMAA back with a proper onReady
 * gate.
 */
export function BiomePostProcessing() {
  const { gl, scene, camera, size } = useThree();
  const { timeOfDay } = useEnvironment();

  const bloomIntRef = useRef(0.3);
  const bloomThreshRef = useRef(0.8);
  const vigOffRef = useRef(0.3);
  const vigDarkRef = useRef(0.35);
  const chromaRef = useRef(0.0004);
  const noiseRef = useRef(0.04);

  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl, { multisampling: 0 });
    // RenderPass draws the scene into the composer's input buffer. With
    // `renderToScreen=true` (set automatically on the last pass) it writes
    // directly to the canvas instead — useful for the no-effects debug
    // path but the EffectPass below becomes the screen-writer in normal
    // operation.
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloom = new BloomEffect({
      intensity: 0.15,
      luminanceThreshold: 0.85,
      luminanceSmoothing: 0.2,
      mipmapBlur: true,
    });
    const chroma = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.0002, 0.0002),
      radialModulation: false,
      modulationOffset: 0,
    });
    const noise = new NoiseEffect({ premultiply: true });
    noise.blendMode.opacity.value = 0.015;
    const vignette = new VignetteEffect({ offset: 0.45, darkness: 0.25 });
    // ToneMapping restores visual parity with the R3F default renderer —
    // without it the composer's linear output reads as a washed-out cast.
    const toneMapping = new ToneMappingEffect({
      mode: ToneMappingMode.ACES_FILMIC,
    });

    composer.addPass(
      new EffectPass(camera, bloom, chroma, noise, vignette, toneMapping),
    );

    return { composer, bloom, chroma, noise, vignette };
  }, [gl, scene, camera]);

  useEffect(() => {
    pipeline.composer.setSize(size.width, size.height, false);
  }, [pipeline, size.width, size.height]);

  useEffect(() => {
    return () => {
      pipeline.composer.dispose();
    };
  }, [pipeline]);

  // priority=1 tells R3F 9 to suppress its default `gl.render()` call
  // for this frame — we render the composer instead. See R3F source
  // `events-*.cjs.dev.js`: `if (!state.internal.priority) state.gl.render(...)`.
  useFrame((_, delta) => {
    let biome: BiomeConfig;
    try {
      const roadDist = getPlayer().playerPosition?.x ?? 0;
      biome = BiomeService.getCurrentBiome(roadDist);
    } catch {
      try {
        biome = BiomeService.getCurrentBiome(0);
      } catch {
        pipeline.composer.render(delta);
        return;
      }
    }

    const target = paramsForBiomeAndTime(biome, timeOfDay);
    const k = 1 - Math.exp(-4 * delta);

    bloomIntRef.current += (target.bloomIntensity - bloomIntRef.current) * k;
    bloomThreshRef.current +=
      (target.bloomThreshold - bloomThreshRef.current) * k;
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

  return null;
}
