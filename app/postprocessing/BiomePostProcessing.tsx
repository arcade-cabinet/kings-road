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
import { useEnvironment, useFlags } from '@/ecs/hooks/useGameSession';
import type { BiomeConfig } from '@/biome';
import { combineDungeonVignette, lerpDungeonVignette } from './dungeonVignette';

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
  // Bright, readable bloom tuned for HDRI-lit scenes: Thornfield's HDR
  // sky punches through at ~0.7 luminance so threshold must sit just
  // under that to produce the glow halo the pastoral look calls for.
  const baseBloom = isDark ? 0.5 : 0.6;
  const baseThreshold = isDark ? 0.58 : 0.62;

  const isAtmospheric = bucket === 'dawn' || bucket === 'dusk';
  const chromaticOffset = isAtmospheric ? 0.0006 : 0.0003;

  const isNight = bucket === 'night';
  const vignetteOffset = isNight ? 0.28 : 0.35;
  const vignetteDarkness = isNight ? 0.55 : 0.42;
  const noiseOpacity = isNight ? 0.03 : 0.015;

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
  const { inDungeon } = useFlags();

  const bloomIntRef = useRef(0.3);
  const bloomThreshRef = useRef(0.8);
  const vigOffRef = useRef(0.3);
  const vigDarkRef = useRef(0.35);
  const chromaRef = useRef(0.0004);
  const noiseRef = useRef(0.04);
  // Dungeon vignette contribution — lerped independently so transitions are
  // smooth regardless of biome changes happening at the same time.
  const dungeonDarkRef = useRef(0);
  const dungeonOffRef = useRef(0);

  const pipeline = useMemo(() => {
    // HalfFloatType framebuffer preserves HDR range from the HDRI-lit
    // scene all the way to the tone-mapping pass at the end. Without
    // it, bright values from bloom/IBL saturate to 1.0 in the first
    // pass and the ToneMappingEffect has nothing to roll off — the
    // earlier "flat-tinted output" symptom.
    //
    // `multisampling: 4` enables hardware MSAA on the composer's
    // internal framebuffer — much cheaper than SMAA (which requires
    // async lookup texture loading and caused a blank-frame flash at
    // mount). 4× is the sweet spot for mobile; higher hits
    // bandwidth on integrated GPUs without a visible gain.
    const composer = new EffectComposer(gl, {
      multisampling: 4,
      frameBufferType: THREE.HalfFloatType,
    });
    // RenderPass draws the scene into the composer's input buffer. With
    // `renderToScreen=true` (set automatically on the last pass) it writes
    // directly to the canvas instead — useful for the no-effects debug
    // path but the EffectPass below becomes the screen-writer in normal
    // operation.
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloom = new BloomEffect({
      intensity: 0.55,
      luminanceThreshold: 0.6,
      luminanceSmoothing: 0.35,
      mipmapBlur: true,
    });
    const chroma = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.0003, 0.0003),
      radialModulation: false,
      modulationOffset: 0,
    });
    const noise = new NoiseEffect({ premultiply: true });
    noise.blendMode.opacity.value = 0.015;
    const vignette = new VignetteEffect({ offset: 0.35, darkness: 0.45 });
    // ACES tone mapping + warmer exposure — bloom now triggers on
    // luminance > 0.6 instead of 0.85, so HDRI sky + lit wet stone
    // actually glow. Bloom intensity 0.15 → 0.55 for a visible soft
    // halo around bright pixels. Vignette offset tightened 0.45 → 0.35
    // with darkness 0.25 → 0.45 so the corner falloff reads as a
    // proper cinematic vignette rather than a barely-visible mask.
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

    // Dungeon vignette — lerped separately at TRANSITION_SPEED (~0.4s)
    const dungeon = lerpDungeonVignette(
      dungeonDarkRef.current,
      dungeonOffRef.current,
      inDungeon,
      delta,
    );
    dungeonDarkRef.current = dungeon.darkness;
    dungeonOffRef.current = dungeon.offset;

    // Combine biome + dungeon contributions before writing to the effect.
    // Health vignette is a separate CSS layer (DiegeticLayer) and always
    // renders on top of the WebGL canvas — no interaction needed here.
    const combined = combineDungeonVignette(
      vigDarkRef.current,
      vigOffRef.current,
      dungeonDarkRef.current,
      dungeonOffRef.current,
    );

    pipeline.bloom.intensity = bloomIntRef.current;
    pipeline.bloom.luminanceMaterial.threshold = bloomThreshRef.current;
    pipeline.vignette.offset = combined.offset;
    pipeline.vignette.darkness = combined.darkness;
    pipeline.chroma.offset.set(chromaRef.current, chromaRef.current);
    pipeline.noise.blendMode.opacity.value = noiseRef.current;

    pipeline.composer.render(delta);
  }, 1);

  return null;
}
