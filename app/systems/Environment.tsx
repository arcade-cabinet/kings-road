import { CloudInstance, Clouds, Sky, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BiomeService } from '@/biome';
import type { BiomeConfig } from '@/biome';
import { BiomeError } from '@/core';
import { assetUrl } from '@/lib/assets';
import {
  getEnvironment,
  getFlags,
  getPlayer,
  setTimeOfDay,
} from '@/ecs/actions/game';
import {
  useEnvironment,
  useFlags,
} from '@/ecs/hooks/useGameSession';
import { updateWindowEmissive } from '@/utils/textures';

const DAY_DURATION = 600.0; // 10 real minutes = 1 game day
const CLOUD_TEXTURE = assetUrl('/assets/cloud.svg');

// Pre-computed cloud configurations to avoid array index keys.
// Placed inside the default fogFar=120 ring so clouds actually render —
// the previous ±180 m horizontal spread fell outside Thornfield's
// fogFar=120 and got culled to full fog opacity.
const cloudConfigs = Array.from({ length: 8 }, (_, i) => ({
  id: `cloud-${i}`,
  x: Math.sin(i * 0.6 + 0.3) * 70,
  y: 35 + (i % 3) * 10,
  z: Math.cos(i * 0.6 + 0.3) * 70,
  speed: 0.08 + (i % 3) * 0.02,
  scale: 20 + (i % 4) * 8,
}));

// Sky color gradient for different times of day. Tuned for the
// "warm pastoral English dawn" aesthetic called out in DESIGN.md —
// morning holds a longer golden-haze tint before going full noon-blue,
// sunset uses a softer amber-rose than the previous pure-red.
const skyColorsGradient = [
  { pct: 0.0, c: new THREE.Color(0x050510) }, // Midnight
  { pct: 0.2, c: new THREE.Color(0x0a0a1a) }, // Pre-dawn
  { pct: 0.25, c: new THREE.Color(0xff8844) }, // Sunrise
  { pct: 0.33, c: new THREE.Color(0xe8b888) }, // Morning haze (warm golden)
  { pct: 0.42, c: new THREE.Color(0x88b0dc) }, // Mid-morning (pastel blue)
  { pct: 0.5, c: new THREE.Color(0x4488cc) }, // Noon
  { pct: 0.65, c: new THREE.Color(0x88b0dc) }, // Afternoon
  { pct: 0.75, c: new THREE.Color(0xe89068) }, // Sunset (amber-rose)
  { pct: 0.85, c: new THREE.Color(0x1a1020) }, // Dusk
  { pct: 1.0, c: new THREE.Color(0x050510) }, // Midnight
];

// Reusable objects — hoisted out of useFrame to avoid per-frame GC pressure
const _skyResult = new THREE.Color();
const _amberColor = new THREE.Color(0xffd4a0);
const _noonColor = new THREE.Color(0xfff8e7);

function getSkyColor(timeOfDay: number): THREE.Color {
  for (let i = 0; i < skyColorsGradient.length - 1; i++) {
    if (
      timeOfDay >= skyColorsGradient[i].pct &&
      timeOfDay <= skyColorsGradient[i + 1].pct
    ) {
      const range = skyColorsGradient[i + 1].pct - skyColorsGradient[i].pct;
      const lerp = (timeOfDay - skyColorsGradient[i].pct) / range;
      return _skyResult
        .copy(skyColorsGradient[i].c)
        .lerp(skyColorsGradient[i + 1].c, lerp);
    }
  }
  return _skyResult.copy(skyColorsGradient[0].c);
}

/** How often (in seconds) to push timeOfDay into Zustand for UI consumers. */
const TIME_SYNC_INTERVAL = 2.0;

export function DayNightCycle() {
  const { scene, camera } = useThree();
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const playerLanternRef = useRef<THREE.PointLight>(null);

  const { gameActive } = useFlags();
  const { timeOfDay } = useEnvironment();

  // Local time ref — updated every frame, synced to Koota periodically
  const localTimeRef = useRef(timeOfDay);
  const syncTimerRef = useRef(0);

  // Cache biome lookup — only re-query when road distance changes by >100 units
  const lastBiomeQueryDistRef = useRef(-Infinity);
  const cachedBiomeRef = useRef<BiomeConfig | null>(null);

  // Initialize scene background immediately on mount
  useMemo(() => {
    const skyColor = getSkyColor(timeOfDay);
    scene.background = skyColor;
  }, [scene, timeOfDay]);

  useFrame((_, delta) => {
    if (!gameActive) return;

    const dt = Math.min(delta, 0.1);

    // Advance local time (no Zustand write — avoids React re-render cascade)
    localTimeRef.current = (localTimeRef.current + dt / DAY_DURATION) % 1;
    const newTime = localTimeRef.current;

    // Sync to Koota periodically for HUD / other UI consumers
    syncTimerRef.current += dt;
    if (syncTimerRef.current >= TIME_SYNC_INTERVAL) {
      syncTimerRef.current = 0;
      setTimeOfDay(newTime);
    }

    // Calculate sun position
    const theta = (newTime - 0.25) * Math.PI * 2;
    const sunY = Math.sin(theta);

    // Update sky background — fog is owned by <Fog /> (biome-driven), so we
    // don't overwrite scene.fog.color here. Night darkening of fog could be
    // added later by multiplying the biome base with a time-of-day factor
    // inside the Fog component.
    const skyColor = getSkyColor(newTime);
    scene.background = skyColor;

    // Update sun light — base intensity from biome if available, else default
    if (sunLightRef.current) {
      sunLightRef.current.position.set(
        camera.position.x + Math.cos(theta) * 100,
        Math.max(10, sunY * 100),
        camera.position.z + Math.sin(theta) * 30,
      );
      sunLightRef.current.target.position.copy(camera.position);
      sunLightRef.current.target.updateMatrixWorld();

      let biomeDirectionalIntensity = 1.8;
      let biomeDirectionalColor: string | null = null;
      try {
        const roadDist = getPlayer().playerPosition?.x ?? 0;
        if (Math.abs(roadDist - lastBiomeQueryDistRef.current) > 100) {
          cachedBiomeRef.current = BiomeService.getCurrentBiome(roadDist);
          lastBiomeQueryDistRef.current = roadDist;
        }
        if (cachedBiomeRef.current) {
          biomeDirectionalIntensity = cachedBiomeRef.current.lighting.directionalIntensity;
          biomeDirectionalColor = cachedBiomeRef.current.lighting.directionalColor;
        }
      } catch (err) {
        if (!(err instanceof BiomeError)) throw err;
        // BiomeService not yet initialized — use defaults
      }

      sunLightRef.current.intensity =
        sunY > 0 ? Math.max(0.2, sunY * biomeDirectionalIntensity) : 0;

      if (sunY > 0) {
        if (biomeDirectionalColor) {
          // Golden-hour blend: biome directional color at sunrise/set, toward white at noon
          _amberColor.set(biomeDirectionalColor);
        } else {
          _amberColor.setHex(0xffd4a0);
        }
        sunLightRef.current.color.lerpColors(_amberColor, _noonColor, sunY);
      }
    }

    // Update player lantern for night
    if (playerLanternRef.current) {
      playerLanternRef.current.position.copy(camera.position);
      if (sunY <= 0) {
        const elapsed = performance.now() / 1000;
        playerLanternRef.current.intensity =
          Math.min(1.5, -sunY * 3.0) + Math.sin(elapsed * 10) * 0.1;
      } else {
        playerLanternRef.current.intensity = 0;
      }
    }

    // Update window emissive
    updateWindowEmissive(sunY <= 0 ? 1.0 : 0);
  });

  return (
    <>
      {/* Main sun/moon light */}
      <directionalLight
        ref={sunLightRef}
        castShadow
        intensity={1.2}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.001}
      >
        <primitive object={new THREE.Object3D()} attach="target" />
      </directionalLight>

      {/* Warm ambient light */}
      <ambientLight intensity={0.4} color={0xfff8e7} />

      {/* Player lantern for night */}
      <pointLight
        ref={playerLanternRef}
        color={0xffaa55}
        intensity={0}
        distance={25}
        decay={2}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
    </>
  );
}

/** Derive a coarse sky mode that only changes at dawn/dusk/night transitions. */
function getSkyMode(t: number): 'day' | 'dawn' | 'dusk' | 'night' {
  const theta = (t - 0.25) * Math.PI * 2;
  const sunY = Math.sin(theta);
  if (sunY < 0.1) return 'night';
  if (t > 0.2 && t < 0.35) return 'dawn';
  if (t > 0.7 && t < 0.85) return 'dusk';
  return 'day';
}

export function SkyDome() {
  // Subscribe to a coarse sky mode — only re-renders on actual visual transitions
  const { timeOfDay } = useEnvironment();
  const skyMode = getSkyMode(timeOfDay);
  const { gameActive } = useFlags();

  // biome-ignore lint/suspicious/noExplicitAny: drei Sky ref type is complex
  // biome-ignore lint/correctness/noUnusedVariables: reserved for future sky effects
  const skyRef = useRef<any>(null);
  const moonRef = useRef<THREE.Mesh>(null);
  const cloudGroupRef = useRef<THREE.Group>(null);

  const isNight = skyMode === 'night';
  const isDusk = skyMode === 'dusk';
  const isDawn = skyMode === 'dawn';

  // Read initial player position once (clouds/moon follow player imperatively in useFrame)
  const initPlayerPos = useRef(getPlayer().playerPosition);
  const playerX = initPlayerPos.current?.x ?? 60;
  const playerZ = initPlayerPos.current?.z ?? 60;

  // Update sky sun position and moon imperatively (no React re-render)
  useFrame(() => {
    const t = getEnvironment().timeOfDay;
    const theta = (t - 0.25) * Math.PI * 2;
    const sunY = Math.sin(theta);
    const sunX = Math.cos(theta);

    // Update Sky shader's sunPosition uniform directly
    if (skyRef.current?.material?.uniforms?.sunPosition) {
      skyRef.current.material.uniforms.sunPosition.value.set(
        sunX * 100,
        sunY * 100,
        50,
      );
    }

    // Update moon position
    if (moonRef.current) {
      const { playerPosition: pp } = getPlayer();
      moonRef.current.position.set(
        (pp?.x ?? 60) + Math.cos((t + 0.5) * Math.PI * 2) * 200,
        100 + Math.sin((t + 0.5) * Math.PI * 2) * 50,
        (pp?.z ?? 60) + 100,
      );
    }

    // Update cloud group to follow player
    if (cloudGroupRef.current) {
      const { playerPosition: pp } = getPlayer();
      cloudGroupRef.current.position.set(pp?.x ?? 60, 0, pp?.z ?? 60);
    }
  });

  if (!gameActive) return null;

  // Initial sun position for Sky mount (reuse timeOfDay from reactive hook above)
  const initTheta = (timeOfDay - 0.25) * Math.PI * 2;
  const initSunPos: [number, number, number] = [
    Math.cos(initTheta) * 100,
    Math.sin(initTheta) * 100,
    50,
  ];

  return (
    <>
      {!isNight && (
        <Sky
          ref={skyRef}
          distance={450000}
          sunPosition={initSunPos}
          inclination={0.5}
          azimuth={0.25}
          turbidity={isDusk || isDawn ? 15 : 10}
          rayleigh={isDusk || isDawn ? 2 : 0.5}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
      )}

      {isNight && (
        <Stars
          radius={300}
          depth={100}
          count={6000}
          factor={7}
          saturation={0.1}
          fade
          speed={0.3}
        />
      )}

      {/* Moon during night */}
      {isNight && (
        <mesh
          ref={moonRef}
          position={[
            playerX + Math.cos((timeOfDay + 0.5) * Math.PI * 2) * 200,
            100 + Math.sin((timeOfDay + 0.5) * Math.PI * 2) * 50,
            playerZ + 100,
          ]}
        >
          <sphereGeometry args={[8, 32, 32]} />
          <meshBasicMaterial color="#e8e4d9" />
        </mesh>
      )}

      {/* Atmospheric clouds that follow player */}
      <Clouds
        ref={cloudGroupRef}
        position={[playerX, 0, playerZ]}
        texture={CLOUD_TEXTURE}
      >
        {cloudConfigs.map((cfg) => (
          <CloudInstance
            key={cfg.id}
            position={[cfg.x, cfg.y, cfg.z]}
            speed={cfg.speed}
            opacity={isNight ? 0.15 : isDusk || isDawn ? 0.7 : 0.4}
            scale={cfg.scale}
            segments={8}
            color={isDusk ? '#ffccaa' : isDawn ? '#ffddcc' : '#ffffff'}
          />
        ))}
      </Clouds>
    </>
  );
}

/**
 * Biome-driven fog — samples the current biome's lighting.fogColor /
 * fogNear / fogFar from BiomeService and applies it to scene.fog every
 * time the player's road distance moves into a new biome region. Falls
 * back to a pastoral cream fog when the service isn't ready yet (early
 * boot, before kingdom gen completes).
 *
 * Previously hardcoded to cream `(0xf5f0e8, 50, 200)` — that washed out
 * Thornfield's cold mist (should be `#8090a0, 20, 120` per the biome
 * config) and any biome set dusk/dawn colours had no visible effect.
 */
export function Fog() {
  const { scene } = useThree();
  const lastSigRef = useRef<string>('');

  useFrame(() => {
    let color = 0xf5f0e8;
    let near = 50;
    let far = 200;
    try {
      const dist = getPlayer().playerPosition?.x ?? 0;
      const biome = BiomeService.getCurrentBiome(dist);
      const { fogColor, fogNear, fogFar } = biome.lighting;
      color = new THREE.Color(fogColor).getHex();
      near = fogNear;
      far = fogFar;
    } catch {
      // fall back to defaults while BiomeService initialises
    }
    const sig = `${color.toString(16)}|${near}|${far}`;
    if (sig !== lastSigRef.current) {
      scene.fog = new THREE.Fog(color, near, far);
      lastSigRef.current = sig;
    }
  });

  return null;
}

const PARTICLE_COUNT = 80;
const PARTICLE_SPREAD = 30;

/**
 * Ambient dust/pollen particles — slow sine-wave drift around the player.
 * Uses InstancedMesh for performance.
 */
export function AmbientParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Deterministic offsets per particle (position + phase)
  const offsets = useMemo(() => {
    const arr: {
      x: number;
      y: number;
      z: number;
      phase: number;
      speed: number;
    }[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const sx = Math.sin(i * 7.13) * 0.5 + 0.5;
      const sz = Math.cos(i * 5.41) * 0.5 + 0.5;
      arr.push({
        x: sx * PARTICLE_SPREAD * 2 - PARTICLE_SPREAD,
        y: (Math.sin(i * 3.97) * 0.5 + 0.5) * 8 + 0.5,
        z: sz * PARTICLE_SPREAD * 2 - PARTICLE_SPREAD,
        phase: i * 0.37,
        speed: 0.3 + (Math.sin(i * 2.71) * 0.5 + 0.5) * 0.4,
      });
    }
    return arr;
  }, []);

  const elapsedRef = useRef(0);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    elapsedRef.current += delta;
    const t = elapsedRef.current;
    const { playerPosition: pp } = getPlayer();
    const px = pp?.x ?? 0;
    const pz = pp?.z ?? 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const o = offsets[i];
      dummy.position.set(
        px + o.x + Math.sin(t * o.speed + o.phase) * 2,
        o.y + Math.sin(t * 0.5 + o.phase) * 1.5,
        pz + o.z + Math.cos(t * o.speed + o.phase * 1.3) * 2,
      );
      const scale = 0.03 + Math.sin(t * 0.8 + o.phase) * 0.01;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial
        color={0xf5e6c8}
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
