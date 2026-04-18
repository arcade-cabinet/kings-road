import { Cloud, Sky, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import { updateWindowEmissive } from '@/utils/textures';

const DAY_DURATION = 600.0; // 10 real minutes = 1 game day

// Pre-computed cloud configurations to avoid array index keys
const cloudConfigs = Array.from({ length: 6 }, (_, i) => ({
  id: `cloud-${i}`,
  x: Math.sin(i * 0.6 + 0.3) * 180,
  y: 45 + (i % 3) * 15,
  z: Math.cos(i * 0.6 + 0.3) * 180,
  speed: 0.08 + (i % 3) * 0.02,
  scale: 25 + (i % 4) * 10,
}));

// Sky color gradient for different times of day
const skyColorsGradient = [
  { pct: 0.0, c: new THREE.Color(0x050510) }, // Midnight
  { pct: 0.2, c: new THREE.Color(0x0a0a1a) }, // Pre-dawn
  { pct: 0.25, c: new THREE.Color(0xff8844) }, // Sunrise
  { pct: 0.35, c: new THREE.Color(0x6699cc) }, // Morning
  { pct: 0.5, c: new THREE.Color(0x4488cc) }, // Noon
  { pct: 0.65, c: new THREE.Color(0x6699cc) }, // Afternoon
  { pct: 0.75, c: new THREE.Color(0xaa4433) }, // Sunset
  { pct: 0.85, c: new THREE.Color(0x1a1020) }, // Dusk
  { pct: 1.0, c: new THREE.Color(0x050510) }, // Midnight
];

// Reusable objects — hoisted out of useFrame to avoid per-frame GC pressure
const _skyResult = new THREE.Color();
const _fogWarm = new THREE.Color(0xc4b99a);
const _fogBright = new THREE.Color(0xf5f0e8);
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

  const setTimeOfDay = useGameStore((state) => state.setTimeOfDay);
  const gameActive = useGameStore((state) => state.gameActive);
  const timeOfDay = useGameStore((state) => state.timeOfDay);

  // Local time ref — updated every frame, synced to store periodically
  const localTimeRef = useRef(timeOfDay);
  const syncTimerRef = useRef(0);

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

    // Sync to Zustand periodically for HUD / other UI consumers
    syncTimerRef.current += dt;
    if (syncTimerRef.current >= TIME_SYNC_INTERVAL) {
      syncTimerRef.current = 0;
      setTimeOfDay(newTime);
    }

    // Calculate sun position
    const theta = (newTime - 0.25) * Math.PI * 2;
    const sunY = Math.sin(theta);

    // Update sky/fog color
    const skyColor = getSkyColor(newTime);
    scene.background = skyColor;

    if (scene.fog) {
      if (sunY > 0) {
        scene.fog.color.lerpColors(_fogWarm, _fogBright, sunY);
      } else {
        scene.fog.color.setHex(0x0a0a1a);
      }
    }

    // Update sun light
    if (sunLightRef.current) {
      sunLightRef.current.position.set(
        camera.position.x + Math.cos(theta) * 100,
        Math.max(10, sunY * 100),
        camera.position.z + Math.sin(theta) * 30,
      );
      sunLightRef.current.target.position.copy(camera.position);
      sunLightRef.current.target.updateMatrixWorld();
      sunLightRef.current.intensity = sunY > 0 ? Math.max(0.2, sunY * 1.8) : 0;

      // Golden-hour amber tint that blends toward white at noon
      if (sunY > 0) {
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
  // Subscribe to coarse sky mode — only re-renders at visual transitions, NOT every frame
  const skyMode = useGameStore((state) => getSkyMode(state.timeOfDay));
  const gameActive = useGameStore((state) => state.gameActive);

  // biome-ignore lint/suspicious/noExplicitAny: drei Sky ref type is complex
  // biome-ignore lint/correctness/noUnusedVariables: reserved for future sky effects
  const skyRef = useRef<any>(null);
  const moonRef = useRef<THREE.Mesh>(null);
  const cloudGroupRef = useRef<THREE.Group>(null);

  const isNight = skyMode === 'night';
  const isDusk = skyMode === 'dusk';
  const isDawn = skyMode === 'dawn';

  // Read initial player position once (clouds/moon follow player imperatively in useFrame)
  const initPlayerPos = useRef(useGameStore.getState().playerPosition);
  const playerX = initPlayerPos.current?.x ?? 60;
  const playerZ = initPlayerPos.current?.z ?? 60;

  // Update sky sun position and moon imperatively (no React re-render)
  useFrame(() => {
    const t = useGameStore.getState().timeOfDay;
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
      const pp = useGameStore.getState().playerPosition;
      moonRef.current.position.set(
        (pp?.x ?? 60) + Math.cos((t + 0.5) * Math.PI * 2) * 200,
        100 + Math.sin((t + 0.5) * Math.PI * 2) * 50,
        (pp?.z ?? 60) + 100,
      );
    }

    // Update cloud group to follow player
    if (cloudGroupRef.current) {
      const pp = useGameStore.getState().playerPosition;
      cloudGroupRef.current.position.set(pp?.x ?? 60, 0, pp?.z ?? 60);
    }
  });

  if (!gameActive) return null;

  // Initial sun position for Sky mount
  const timeOfDay = useGameStore.getState().timeOfDay;
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
      <group ref={cloudGroupRef} position={[playerX, 0, playerZ]}>
        {cloudConfigs.map((cfg) => (
          <Cloud
            key={cfg.id}
            position={[cfg.x, cfg.y, cfg.z]}
            speed={cfg.speed}
            opacity={isNight ? 0.15 : isDusk || isDawn ? 0.7 : 0.4}
            scale={cfg.scale}
            segments={8}
            color={isDusk ? '#ffccaa' : isDawn ? '#ffddcc' : '#ffffff'}
          />
        ))}
      </group>
    </>
  );
}

export function Fog() {
  const { scene } = useThree();

  useMemo(() => {
    // Distance-based fog in cream/gold — hides chunk loading, adds pastoral depth
    scene.fog = new THREE.Fog(0xf5f0e8, 50, 200);
  }, [scene]);

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
    const pp = useGameStore.getState().playerPosition;
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
