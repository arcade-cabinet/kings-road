/**
 * WeatherSystem — reads the current region's WeatherProfile and applies
 * weather effects: fog density, rain particles, wind-modulated ambient
 * particles, and smooth transitions between regions.
 *
 * Runs every frame via useFrame. Region lookup is throttled to avoid
 * per-frame map queries. Weather "rolls" happen on a seeded RNG so
 * the same seed+time always produces the same weather pattern.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { WeatherProfile } from '@/schemas/kingdom.schema';
import type { WeatherState } from '@/ecs/traits/session-game';
import {
  getEnvironment,
  getFlags,
  getPlayer,
  getSeedPhrase,
  setCurrentWeather,
} from '@/ecs/actions/game';
import { useEnvironment } from '@/ecs/hooks/useGameSession';
import { useWorldSession } from '@/ecs/hooks/useWorldSession';
import { getWorldState } from '@/ecs/actions/world';
import { worldToGrid } from '@/utils/worldCoords';
import { createRng } from '@/utils/random';
import { getRegionAt } from '@/world/kingdom-gen';

// ── Constants ────────────────────────────────────────────────────────────

/** How often (seconds) we re-check region + roll weather */
const WEATHER_CHECK_INTERVAL = 2.0;

/** Transition speed for weather values (lerp factor per second) */
const TRANSITION_SPEED = 0.8;

/** Rain particle count — kept moderate for performance */
const RAIN_PARTICLE_COUNT = 400;

/** Rain spread around the player */
const RAIN_SPREAD = 30;

/** Rain fall height above player */
const RAIN_HEIGHT = 20;

/** Rain fall speed (units/sec) */
const RAIN_FALL_SPEED = 25;

// ── Fog color presets by weather ─────────────────────────────────────────

const FOG_COLORS: Record<string, THREE.Color> = {
  clear_day: new THREE.Color(0xf5f0e8),
  clear_night: new THREE.Color(0x0a0a1a),
  overcast_day: new THREE.Color(0xd5d0c8),
  overcast_night: new THREE.Color(0x0a0a18),
  foggy_day: new THREE.Color(0xcec8ba),
  foggy_night: new THREE.Color(0x0e0e1e),
  rainy_day: new THREE.Color(0xb0aba0),
  rainy_night: new THREE.Color(0x080810),
  stormy_day: new THREE.Color(0x8a8580),
  stormy_night: new THREE.Color(0x060608),
};

// ── Fog distance presets ─────────────────────────────────────────────────

const FOG_NEAR_BASE = 80;
const FOG_FAR_BASE = 200;

// ── Helper: resolve weather from profile + time ──────────────────────────

function resolveWeather(
  profile: WeatherProfile | undefined,
  timeOfDay: number,
  rng: () => number,
): WeatherState {
  if (!profile) {
    return {
      condition: 'clear',
      fogDensity: 0,
      rainIntensity: 0,
      windStrength: 0.1,
      regionId: '',
    };
  }

  // Time-of-day modulation: fog more likely at dawn (0.2-0.3), rain at night
  const isDawn = timeOfDay > 0.2 && timeOfDay < 0.35;
  const isNight = timeOfDay < 0.25 || timeOfDay > 0.75;

  const fogMod = isDawn ? 1.5 : isNight ? 1.2 : 1.0;
  const rainMod = isNight ? 1.3 : 1.0;

  const roll = rng();
  const fogRoll = rng();
  const rainRoll = rng();

  // Determine condition
  let condition = profile.defaultWeather;
  const effectiveRainChance = Math.min(1, profile.rainChance * rainMod);
  const effectiveFogChance = Math.min(1, profile.fogChance * fogMod);

  if (rainRoll < effectiveRainChance) {
    condition = roll < 0.15 ? 'stormy' : 'rainy';
  } else if (fogRoll < effectiveFogChance) {
    condition = 'foggy';
  }

  // Compute intensities
  let fogDensity = 0;
  let rainIntensity = 0;

  switch (condition) {
    case 'foggy':
      fogDensity = profile.fogDensity ?? 0.3;
      break;
    case 'rainy':
      fogDensity = (profile.fogDensity ?? 0.3) * 0.5;
      rainIntensity = 0.6;
      break;
    case 'stormy':
      fogDensity = (profile.fogDensity ?? 0.3) * 0.7;
      rainIntensity = 1.0;
      break;
    case 'overcast':
      fogDensity = (profile.fogDensity ?? 0.3) * 0.2;
      break;
    default:
      fogDensity = 0;
  }

  // Dawn fog boost
  if (isDawn) {
    fogDensity = Math.min(1, fogDensity + 0.15);
  }

  return {
    condition,
    fogDensity,
    rainIntensity,
    windStrength: profile.windStrength ?? 0.2,
    regionId: '',
  };
}

// ── Rain particles (InstancedMesh) ───────────────────────────────────────

function RainParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { currentWeather } = useEnvironment();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Per-particle offsets (deterministic)
  const offsets = useMemo(() => {
    const arr: { x: number; z: number; phase: number }[] = [];
    for (let i = 0; i < RAIN_PARTICLE_COUNT; i++) {
      arr.push({
        x: Math.sin(i * 7.13) * RAIN_SPREAD - RAIN_SPREAD / 2,
        z: Math.cos(i * 5.41) * RAIN_SPREAD - RAIN_SPREAD / 2,
        phase: (i / RAIN_PARTICLE_COUNT) * RAIN_HEIGHT,
      });
    }
    return arr;
  }, []);

  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const intensity = currentWeather.rainIntensity;
    // Hide mesh entirely when no rain
    meshRef.current.visible = intensity > 0.01;
    if (!meshRef.current.visible) return;

    elapsedRef.current += delta;
    const { playerPosition: pp } = getPlayer();
    const px = pp?.x ?? 0;
    const pz = pp?.z ?? 0;
    const wind = currentWeather.windStrength;

    // Only render a fraction of particles proportional to intensity
    const activeCount = Math.floor(RAIN_PARTICLE_COUNT * intensity);

    for (let i = 0; i < RAIN_PARTICLE_COUNT; i++) {
      if (i >= activeCount) {
        // Hide inactive particles by scaling to zero
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const o = offsets[i];
      // Fall position: loop within RAIN_HEIGHT
      const yOffset =
        ((o.phase + elapsedRef.current * RAIN_FALL_SPEED) % RAIN_HEIGHT) -
        RAIN_HEIGHT / 2;

      // Wind drift
      const windDrift = wind * elapsedRef.current * 2;

      dummy.position.set(
        px + o.x + Math.sin(windDrift) * wind * 3,
        (pp?.y ?? 0) + RAIN_HEIGHT / 2 - yOffset,
        pz + o.z + Math.cos(windDrift * 0.7) * wind * 2,
      );

      // Stretch droplets vertically for speed effect
      dummy.scale.set(0.02, 0.15 + intensity * 0.1, 0.02);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, RAIN_PARTICLE_COUNT]}
      visible={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color={0x8899aa}
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

// ── Main WeatherSystem component ─────────────────────────────────────────

export function WeatherSystem() {
  const { scene } = useThree();
  const checkTimerRef = useRef(0);
  const lastRegionRef = useRef('');

  // Target weather we're transitioning toward
  const targetRef = useRef<WeatherState>({
    condition: 'clear',
    fogDensity: 0,
    rainIntensity: 0,
    windStrength: 0.1,
    regionId: '',
  });

  // Current interpolated values for smooth transitions
  const currentFogDensity = useRef(0);
  const currentRainIntensity = useRef(0);
  const currentWindStrength = useRef(0.1);

  // Scratch color objects to avoid allocations
  const fogColorTarget = useMemo(() => new THREE.Color(0xf5f0e8), []);
  const fogColorCurrent = useMemo(() => new THREE.Color(0xf5f0e8), []);

  useFrame((_, delta) => {
    const { gameActive } = getFlags();
    if (!gameActive) return;

    const dt = Math.min(delta, 0.1);
    checkTimerRef.current += dt;

    // ── Periodic region check + weather roll ──────────────────────────
    if (checkTimerRef.current >= WEATHER_CHECK_INTERVAL) {
      checkTimerRef.current = 0;

      const { playerPosition } = getPlayer();
      const { timeOfDay } = getEnvironment();
      const seedPhrase = getSeedPhrase();
      const kingdomMap = getWorldState().kingdomMap;

      if (kingdomMap && playerPosition) {
        const [gx, gy] = worldToGrid(playerPosition.x, playerPosition.z);
        const region = getRegionAt(kingdomMap, gx, gy);
        const regionId = region?.id ?? '';

        // Create a deterministic RNG from seed + region + coarse time
        // Use integer game-hour so weather doesn't flicker every check
        const gameHour = Math.floor(timeOfDay * 24);
        const weatherSeed = `${seedPhrase}:weather:${regionId}:${gameHour}`;
        const rng = createRng(weatherSeed);

        const newWeather = resolveWeather(region?.weather, timeOfDay, rng);
        newWeather.regionId = regionId;

        targetRef.current = newWeather;

        // Update Koota trait (for HUD display and other systems)
        setCurrentWeather(newWeather);
        lastRegionRef.current = regionId;
      }
    }

    // ── Smooth interpolation toward target ────────────────────────────
    const target = targetRef.current;
    const lerpFactor = 1 - Math.exp(-TRANSITION_SPEED * dt);

    currentFogDensity.current +=
      (target.fogDensity - currentFogDensity.current) * lerpFactor;
    currentRainIntensity.current +=
      (target.rainIntensity - currentRainIntensity.current) * lerpFactor;
    currentWindStrength.current +=
      (target.windStrength - currentWindStrength.current) * lerpFactor;

    // ── Apply fog ─────────────────────────────────────────────────────
    if (scene.fog instanceof THREE.Fog) {
      const { timeOfDay } = getEnvironment();
      const theta = (timeOfDay - 0.25) * Math.PI * 2;
      const isDay = Math.sin(theta) > 0;

      // Pick target fog color based on condition + day/night
      const colorKey = `${target.condition}_${isDay ? 'day' : 'night'}`;
      const targetColor = FOG_COLORS[colorKey] ?? FOG_COLORS.clear_day;
      fogColorTarget.copy(targetColor);

      // Lerp fog color
      fogColorCurrent.lerp(fogColorTarget, lerpFactor * 0.5);

      // Modulate fog distances based on density
      // Higher density = shorter visibility
      const densityFactor = 1 - currentFogDensity.current * 0.7;
      const near = FOG_NEAR_BASE * densityFactor;
      const far = FOG_FAR_BASE * densityFactor;

      scene.fog.near = near;
      scene.fog.far = far;

      // Blend with the existing fog color set by DayNightCycle
      // We only override partially so both systems cooperate
      scene.fog.color.lerp(fogColorCurrent, 0.3);
    }
  });

  return <RainParticles />;
}
