import { Cloud, Sky, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { updateWindowEmissive } from '../utils/textures';

const DAY_DURATION = 600.0; // 10 real minutes = 1 game day

// Pre-computed cloud configurations to avoid array index keys
const cloudConfigs = Array.from({ length: 10 }, (_, i) => ({
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

function getSkyColor(timeOfDay: number): THREE.Color {
  for (let i = 0; i < skyColorsGradient.length - 1; i++) {
    if (
      timeOfDay >= skyColorsGradient[i].pct &&
      timeOfDay <= skyColorsGradient[i + 1].pct
    ) {
      const range = skyColorsGradient[i + 1].pct - skyColorsGradient[i].pct;
      const lerp = (timeOfDay - skyColorsGradient[i].pct) / range;
      return skyColorsGradient[i].c
        .clone()
        .lerp(skyColorsGradient[i + 1].c, lerp);
    }
  }
  return skyColorsGradient[0].c.clone();
}

export function DayNightCycle() {
  const { scene, camera } = useThree();
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const playerLanternRef = useRef<THREE.PointLight>(null);

  const setTimeOfDay = useGameStore((state) => state.setTimeOfDay);
  const gameActive = useGameStore((state) => state.gameActive);
  const timeOfDay = useGameStore((state) => state.timeOfDay);

  // Initialize scene background immediately on mount
  useMemo(() => {
    const skyColor = getSkyColor(timeOfDay);
    scene.background = skyColor;
  }, [scene, timeOfDay]);

  useFrame((_, delta) => {
    if (!gameActive) return;

    const state = useGameStore.getState();
    const dt = Math.min(delta, 0.1);

    // Advance time
    const newTime = (state.timeOfDay + dt / DAY_DURATION) % 1;
    setTimeOfDay(newTime);

    // Calculate sun position
    const theta = (newTime - 0.25) * Math.PI * 2;
    const sunY = Math.sin(theta);

    // Update sky/fog color
    const skyColor = getSkyColor(newTime);
    scene.background = skyColor;

    if (scene.fog instanceof THREE.FogExp2) {
      const fogColor = new THREE.Color();
      if (sunY > 0) {
        fogColor.lerpColors(
          new THREE.Color(0xc4b99a),
          new THREE.Color(0xd4cfc2),
          sunY,
        );
      } else {
        fogColor.setHex(0x0a0a1a);
      }
      scene.fog.color.copy(fogColor);
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
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0005}
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

export function SkyDome() {
  const timeOfDay = useGameStore((state) => state.timeOfDay) ?? 0.33;
  const gameActive = useGameStore((state) => state.gameActive);
  const playerPosition = useGameStore((state) => state.playerPosition);

  // Calculate sun position for Sky component
  const sunPosition = useMemo(() => {
    const theta = (timeOfDay - 0.25) * Math.PI * 2;
    const sunY = Math.sin(theta);
    const sunX = Math.cos(theta);
    return [sunX * 100, sunY * 100, 50] as [number, number, number];
  }, [timeOfDay]);

  const theta = (timeOfDay - 0.25) * Math.PI * 2;
  const sunY = Math.sin(theta);
  const isNight = sunY < 0.1;
  const isDusk = timeOfDay > 0.7 && timeOfDay < 0.85;
  const isDawn = timeOfDay > 0.2 && timeOfDay < 0.35;

  // Safety check for player position
  const playerX = playerPosition?.x ?? 60;
  const playerZ = playerPosition?.z ?? 60;

  if (!gameActive) return null;

  return (
    <>
      {!isNight && (
        <Sky
          distance={450000}
          sunPosition={sunPosition}
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
      <group position={[playerX, 0, playerZ]}>
        {cloudConfigs.map((cfg) => (
          <Cloud
            key={cfg.id}
            position={[cfg.x, cfg.y, cfg.z]}
            speed={cfg.speed}
            opacity={isNight ? 0.15 : isDusk || isDawn ? 0.7 : 0.4}
            scale={cfg.scale}
            segments={15}
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
    scene.fog = new THREE.FogExp2(0xc4b99a, 0.012);
  }, [scene]);

  return null;
}
