import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { collectGem, getPlayer } from '@/ecs/actions/game';
import { assetUrl } from '@/lib/assets';
import { PLAYER_RADIUS } from '@/utils/worldGen';

const CRYSTAL_GLB = assetUrl('/assets/dungeon/mine/crystal.glb');
useGLTF.preload(CRYSTAL_GLB);

// Reusable vector for collection animation
const _toPlayer = new THREE.Vector3();

interface RelicProps {
  chunkKey: string;
  gemId: number;
  position: [number, number, number];
  collected: boolean;
}

export function Relic({ chunkKey, gemId, position, collected }: RelicProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const innerMeshRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const [isCollected, setIsCollected] = useState(collected ?? false);
  const [collectAnimation, setCollectAnimation] = useState(0);
  const [attractAnimation, setAttractAnimation] = useState(0);

  const elapsedRef = useRef(0);

  // Safe position values
  const posX = position?.[0] ?? 0;
  const posY = position?.[1] ?? 1;
  const posZ = position?.[2] ?? 0;

  // Sync with store's collected state
  useEffect(() => {
    if (collected) setIsCollected(true);
  }, [collected]);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    elapsedRef.current += delta;

    const playerPosition = getPlayer().playerPosition;
    const playerX = playerPosition?.x ?? 0;
    const playerZ = playerPosition?.z ?? 0;

    // Collection animation - relic flies toward player and shrinks
    if (collectAnimation > 0) {
      const newAnim = Math.max(0, collectAnimation - delta * 3);
      setCollectAnimation(newAnim);

      // Scale down
      const scale = newAnim * newAnim; // Ease out
      meshRef.current.scale.setScalar(scale);
      if (innerMeshRef.current) innerMeshRef.current.scale.setScalar(scale);
      if (outerGlowRef.current)
        outerGlowRef.current.scale.setScalar(scale * 1.5);

      // Spin faster as it disappears
      meshRef.current.rotation.y += delta * 20;
      meshRef.current.rotation.x += delta * 15;

      // Move toward player
      _toPlayer.set(
        playerX - position[0],
        (playerPosition?.y ?? 0) - position[1],
        playerZ - position[2],
      );
      const moveAmount = (1 - newAnim) * 0.3;
      meshRef.current.position.x = moveAmount * _toPlayer.x;
      meshRef.current.position.z = moveAmount * _toPlayer.z;

      // Light intensity
      if (lightRef.current) {
        lightRef.current.intensity = scale * 3;
      }
      return;
    }

    if (isCollected) {
      meshRef.current.visible = false;
      if (innerMeshRef.current) innerMeshRef.current.visible = false;
      if (outerGlowRef.current) outerGlowRef.current.visible = false;
      return;
    }

    const t = elapsedRef.current;

    // Calculate distance for proximity effects
    const distSq = (posX - playerX) ** 2 + (posZ - playerZ) ** 2;
    const dist = Math.sqrt(distSq);
    const attractDist = 5.0; // Start attracting at this distance
    const collectDist = PLAYER_RADIUS + 1.5;

    // Proximity-based attraction animation
    if (dist < attractDist && dist > collectDist) {
      const attractStrength = 1 - dist / attractDist;
      setAttractAnimation(attractStrength);
    } else {
      setAttractAnimation(0);
    }

    // Floating animation - more dynamic with attraction
    const baseFloat = Math.sin(t * 2 + gemId) * 0.4;
    const attractFloat = attractAnimation * Math.sin(t * 8) * 0.15;
    meshRef.current.position.y = posY + baseFloat + attractFloat;

    // Rotation - faster when attracted
    const baseRotSpeed = 1.5;
    const attractRotSpeed = attractAnimation * 3;
    meshRef.current.rotation.y = t * (baseRotSpeed + attractRotSpeed);
    meshRef.current.rotation.x = Math.sin(t * (1 + attractAnimation * 2)) * 0.5;

    // Scale pulsing - more intense when close
    const baseScale = 1 + Math.sin(t * 3) * 0.1;
    const attractScale = 1 + attractAnimation * 0.2;
    meshRef.current.scale.setScalar(baseScale * attractScale);

    // Inner glow animation
    if (innerMeshRef.current) {
      innerMeshRef.current.rotation.y = -t * 2;
      innerMeshRef.current.scale.setScalar(0.7 + Math.sin(t * 4) * 0.1);
    }

    // Outer glow pulsing
    if (outerGlowRef.current) {
      const glowScale = 1.5 + Math.sin(t * 2.5) * 0.3 + attractAnimation * 0.5;
      outerGlowRef.current.scale.setScalar(glowScale);
      outerGlowRef.current.rotation.y = t * 0.5;
    }

    // Pulsing glow - more intense when close
    if (lightRef.current) {
      const baseIntensity = 0.8 + Math.sin(t * 3) * 0.3;
      const attractIntensity = attractAnimation * 1.5;
      lightRef.current.intensity = baseIntensity + attractIntensity;
      lightRef.current.distance = 8 + attractAnimation * 4;
    }

    // Check for collection
    if (distSq < collectDist * collectDist) {
      setIsCollected(true);
      setCollectAnimation(1);
      collectGem(chunkKey, gemId);

      // Create enhanced screen flash effect
      const flash = document.createElement('div');
      flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at center, rgba(196, 167, 71, 0.4) 0%, rgba(153, 122, 50, 0.2) 50%, transparent 100%);
        pointer-events: none;
        transition: opacity 0.4s ease-out;
        z-index: 100;
      `;
      document.body.appendChild(flash);

      // Show a "Relic Found" notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 30%;
        left: 50%;
        transform: translateX(-50%);
        color: #c4a747;
        font-family: 'Lora', serif;
        font-size: 18px;
        font-weight: bold;
        text-shadow: 0 0 20px rgba(196, 167, 71, 0.6), 0 2px 4px rgba(0,0,0,0.6);
        pointer-events: none;
        z-index: 101;
        opacity: 1;
        transition: all 0.6s ease-out;
        letter-spacing: 0.1em;
      `;
      notification.textContent = '+1 Ancient Relic';
      document.body.appendChild(notification);

      setTimeout(() => {
        flash.style.opacity = '0';
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
          flash.remove();
          notification.remove();
        }, 600);
      }, 100);
    }
  });

  if (isCollected && collectAnimation <= 0) return null;

  const crystalGlb = useGLTF(CRYSTAL_GLB) as unknown as {
    nodes: Record<string, THREE.Mesh>;
  };
  const crystalGeometry = useMemo(() => {
    const mesh = Object.values(crystalGlb.nodes).find(
      (n): n is THREE.Mesh => (n as THREE.Mesh).isMesh === true,
    );
    if (!mesh) {
      throw new Error(
        `Crystal relic GLB ${CRYSTAL_GLB} has no mesh node — cannot render relic geometry.`,
      );
    }
    if (!mesh.geometry) {
      throw new Error(
        `Crystal relic GLB ${CRYSTAL_GLB} mesh "${mesh.name || '(unnamed)'}" ` +
          `has no geometry — GLB structure changed unexpectedly.`,
      );
    }
    return mesh.geometry;
  }, [crystalGlb.nodes]);

  return (
    <group position={[posX, 0, posZ]}>
      {/* Outer glow sphere — kept as an additive aura hull; no authored
          GLB provides the soft light-sphere look, and this is a pure VFX
          primitive (no collider, no physics). */}
      <mesh ref={outerGlowRef} position={[0, posY, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color={0xc4a747}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Main relic — crystal geometry pulled from the authored mine GLB,
          re-tinted gold/emissive to read as an ancient relic rather than
          a raw gem. */}
      <mesh
        ref={meshRef}
        position={[0, posY, 0]}
        geometry={crystalGeometry}
        castShadow
        scale={0.9}
      >
        <meshStandardMaterial
          color={0xb8962e}
          emissive={0x8b6f1f}
          emissiveIntensity={2}
          roughness={0.15}
          metalness={0.6}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Inner core glow — same crystal geometry at smaller scale as the
          "inner light" payload inside the outer gold facets. */}
      <mesh
        ref={innerMeshRef}
        position={[0, posY, 0]}
        geometry={crystalGeometry}
        scale={0.5}
      >
        <meshBasicMaterial color={0xd4af37} transparent opacity={0.6} />
      </mesh>

      {/* Point light for glow effect */}
      <pointLight
        ref={lightRef}
        position={[0, posY, 0]}
        color={0xc4a747}
        intensity={1}
        distance={8}
        decay={2}
      />

      {/* Secondary ambient light */}
      <pointLight
        position={[0, posY + 1, 0]}
        color={0xb8962e}
        intensity={0.3}
        distance={4}
        decay={2}
      />
    </group>
  );
}
