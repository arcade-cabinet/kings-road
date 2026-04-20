import { CloudInstance, Clouds, Stars } from '@react-three/drei';
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

/**
 * Minimum shadow camera far plane (metres). The sun light sits ~100m off the
 * camera horizontally; a static 180m far plane clipped the mid-field at
 * dawn/dusk when the sun dropped to Y=10 and the camera-to-light distance
 * exceeded the plane. Runtime code extends this up to
 * `SHADOW_CAMERA_FAR_MIN + SHADOW_CAMERA_FAR_SLACK + lightDistExcess`; the
 * JSX prop below uses this same value as the initial allocation so the two
 * stay in sync.
 */
const SHADOW_CAMERA_FAR_MIN = 180;
const SHADOW_CAMERA_FAR_SLACK = 60;

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

// Reusable colors hoisted out of useFrame to avoid per-frame GC pressure.
// Sky gradient / getSkyColor were removed when EnvironmentIBL took over
// the scene background — the HDRI now owns the horizon colour and
// DayNightCycle only drives the sun light.
const _amberColor = new THREE.Color(0xffd4a0);
const _noonColor = new THREE.Color(0xfff8e7);

/** How often (in seconds) to push timeOfDay into Zustand for UI consumers. */
const TIME_SYNC_INTERVAL = 2.0;

export function DayNightCycle() {
  const { scene, camera } = useThree();
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const playerLanternRef = useRef<THREE.PointLight>(null);

  const { gameActive } = useFlags();
  const { timeOfDay } = useEnvironment();

  // Local time ref — updated every frame, synced to Koota periodically
  const localTimeRef = useRef(timeOfDay);
  const syncTimerRef = useRef(0);

  // Cache biome lookup — only re-query when road distance changes by >100 units
  const lastBiomeQueryDistRef = useRef(-Infinity);
  const cachedBiomeRef = useRef<BiomeConfig | null>(null);

  // EnvironmentIBL paints the HDRI onto scene.background with
  // `backgroundBlurriness`; DayNightCycle no longer clobbers it with a
  // hand-picked solid colour. Kept the `getSkyColor` helper around for
  // the SceneInit early-boot clear colour (renders before IBL loads)
  // but don't apply it here.

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

    // Sky background is owned by EnvironmentIBL (HDRI with
    // backgroundBlurriness). Fog is owned by <Fog /> (biome-driven).
    // DayNightCycle only drives the directional sun light + player
    // lantern; it used to paint scene.background with `getSkyColor` but
    // that was a solid colour that fought the HDRI every frame and
    // produced the flat-sky look user flagged.

    // Update sun light — base intensity from biome if available, else default
    if (sunLightRef.current) {
      const sunX = camera.position.x + Math.cos(theta) * 100;
      const sunYPos = Math.max(10, sunY * 100);
      const sunZ = camera.position.z + Math.sin(theta) * 30;
      sunLightRef.current.position.set(sunX, sunYPos, sunZ);
      sunLightRef.current.target.position.copy(camera.position);
      sunLightRef.current.target.updateMatrixWorld();

      // Dynamic shadow frustum far plane — the JSX allocation sets the
      // initial value to SHADOW_CAMERA_FAR_MIN, which is also the floor
      // here. At dawn/dusk when the sun drops near the horizon the
      // camera-to-light distance can exceed that floor (XZ offset stays
      // ~100m while Y bottoms out at 10m). A clipped far plane makes
      // objects 30–50m from the player pop in and out of shadow as the
      // sun sweeps (audit bug #12). Extend to the actual light distance
      // + slack so the far edge always clears the shadow-receiving area.
      const dxL = sunX - camera.position.x;
      const dyL = sunYPos - camera.position.y;
      const dzL = sunZ - camera.position.z;
      const lightDist = Math.sqrt(dxL * dxL + dyL * dyL + dzL * dzL);
      const shadowCam = sunLightRef.current.shadow.camera;
      const wantedFar = Math.max(
        SHADOW_CAMERA_FAR_MIN,
        lightDist + SHADOW_CAMERA_FAR_SLACK,
      );
      if (Math.abs(shadowCam.far - wantedFar) > 1) {
        shadowCam.far = wantedFar;
        shadowCam.updateProjectionMatrix();
      }

      // BiomeService is synchronously initialized at App module load
      // (see App.tsx), so getCurrentBiome() must return a valid biome here.
      // Any throw is a real bug — let it bubble to the ErrorBoundary /
      // runtime-error-bus rather than hiding behind defaults.
      const roadDist = getPlayer().playerPosition?.x ?? 0;
      if (Math.abs(roadDist - lastBiomeQueryDistRef.current) > 100) {
        cachedBiomeRef.current = BiomeService.getCurrentBiome(roadDist);
        lastBiomeQueryDistRef.current = roadDist;
      }
      const biome = cachedBiomeRef.current;
      if (!biome) {
        throw new Error(
          'Environment.DayNightCycle: BiomeService returned no biome for ' +
            `roadDist=${roadDist}. BiomeService should be initialized at ` +
            'App module load.',
        );
      }
      const biomeDirectionalIntensity = biome.lighting.directionalIntensity;
      const biomeDirectionalColor = biome.lighting.directionalColor;

      sunLightRef.current.intensity =
        sunY > 0 ? Math.max(0.2, sunY * biomeDirectionalIntensity) : 0;

      if (sunY > 0) {
        _amberColor.set(biomeDirectionalColor);
        sunLightRef.current.color.lerpColors(_amberColor, _noonColor, sunY);
      }
    }

    // Ambient — biome-driven color + intensity, modulated by time-of-day so
    // night pulls ambient down without going to zero (otherwise non-emissive
    // props go pitch black). Previously hardcoded `intensity=0.25 color=fff8e7`
    // ignored the biome's authored lighting config entirely.
    if (ambientLightRef.current && cachedBiomeRef.current) {
      const biomeAmbIntensity =
        cachedBiomeRef.current.lighting.ambientIntensity;
      const biomeAmbColor = cachedBiomeRef.current.lighting.ambientColor;
      // Keep 30% of ambient at night so silhouettes remain visible.
      const dayFactor = sunY > 0 ? 1.0 : 0.3;
      ambientLightRef.current.intensity = biomeAmbIntensity * dayFactor;
      ambientLightRef.current.color.set(biomeAmbColor);
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
      {/* Main sun/moon light — 2048² shadow map with a wider 60m frustum
          so the watchtower + cottage at 25-28m dist from spawn cast
          crisp shadows on the plaza, and trees on the edge of the
          settlement clearance ring don't abruptly drop their shadows
          as the player rotates. Previous 1024² + 40m frustum gave
          visibly jaggy shadow edges on the cottage mid-screen. */}
      <directionalLight
        ref={sunLightRef}
        castShadow
        intensity={1.2}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={SHADOW_CAMERA_FAR_MIN}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      >
        <primitive object={new THREE.Object3D()} attach="target" />
      </directionalLight>

      {/* Ambient light — drive intensity + color from biome via
          `ambientLightRef` in DayNightCycle. The JSX values here are
          initial placeholders until the first biome query resolves.
          Hardcoding ignored the biome's authored `lighting.ambientColor`
          (#7a6e5a warm for Thornfield) which let dead trees pool too
          dark in shadow. */}
      <ambientLight ref={ambientLightRef} intensity={0.5} color={0x7a6e5a} />

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

    // Sky shader removed (HDRI owns the background); only the moon
    // position updates here now.

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

  return (
    <>
      {/* Sky background ownership: EnvironmentIBL (HDRI) paints the
          day sky onto scene.background with backgroundBlurriness. The
          drei `<Sky>` atmospheric shader was previously rendered here
          at full opacity, fighting the HDRI and washing it out. It is
          now removed. <Stars> is kept for the night sky (HDRI doesn't
          encode stars) and punches through the fade automatically via
          the `fade` prop. */}

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
    // BiomeService is synchronously initialized at App module load, so
    // fog identity comes from the biome with no defaults. Any throw is
    // a real bug — let it bubble.
    const dist = getPlayer().playerPosition?.x ?? 0;
    const biome = BiomeService.getCurrentBiome(dist);
    const { fogColor, fogNear, fogFar } = biome.lighting;
    const color = new THREE.Color(fogColor).getHex();
    const near = fogNear;
    const far = fogFar;
    const sig = `${color.toString(16)}|${near}|${far}`;
    if (sig !== lastSigRef.current || !(scene.fog instanceof THREE.Fog)) {
      scene.fog = new THREE.Fog(color, near, far);
      lastSigRef.current = sig;
    } else {
      // Re-assert the biome's base color and distances every frame.
      // WeatherSystem scales near/far and desaturates color; without this
      // reset the scaling compounds toward zero over time and the biome's
      // authored identity drifts away.
      scene.fog.color.setHex(color);
      scene.fog.near = near;
      scene.fog.far = far;
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
