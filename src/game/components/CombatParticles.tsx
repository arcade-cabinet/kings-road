import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useCombatStore } from '../stores/combatStore';
import { useGameStore } from '../stores/gameStore';

const PARTICLE_COUNT = 32;

interface ActiveBurst {
  id: number;
  position: THREE.Vector3;
  startTime: number;
  color: string;
}

/**
 * CombatParticles — renders blood/hit bursts when entities take damage.
 * Uses InstancedMesh for efficiency.
 */
export function CombatParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [bursts, setBursts] = useState<ActiveBurst[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const lastDamageRef = useRef(0);
  const lastHitRef = useRef(0);
  const nextBurstId = useRef(0);

  useFrame((_state, delta) => {
    const { lastDamageTime, lastHitTime, damagePopups } = useCombatStore.getState();
    const playerPos = useGameStore.getState().playerPosition;
    const now = performance.now();

    // ── Check for new bursts ─────────────────────────────────────────
    
    // We look at the latest damage popups to determine burst positions
    const recentPopups = damagePopups.filter(p => now - p.createdAt < 100);
    
    if (lastDamageTime > lastDamageRef.current && playerPos) {
      lastDamageRef.current = lastDamageTime;
      // Player hit burst (blood)
      setBursts(prev => [
        ...prev.slice(-4), // Limit active bursts
        { 
          id: nextBurstId.current++, 
          position: playerPos.clone().add(new THREE.Vector3(0, 0.5, 0)), 
          startTime: now,
          color: '#880000'
        }
      ]);
    }

    if (lastHitTime > lastHitRef.current) {
      lastHitRef.current = lastHitTime;
      // Dealt damage burst (white/sparks)
      // Since we don't have exact monster world positions easily here, 
      // we'll put it slightly ahead of the player for feedback.
      if (playerPos) {
        const direction = new THREE.Vector3(0, 0, -1).applyEuler(_state.camera.rotation);
        const hitPos = playerPos.clone().add(direction.multiplyScalar(2)).add(new THREE.Vector3(0, 0.5, 0));
        setBursts(prev => [
          ...prev.slice(-4),
          { 
            id: nextBurstId.current++, 
            position: hitPos, 
            startTime: now,
            color: '#ffffff'
          }
        ]);
      }
    }

    // ── Render particles ────────────────────────────────────────────
    
    if (!meshRef.current) return;

    let particleIdx = 0;
    const burstLifetime = 600;

    // Filter out old bursts
    const activeBursts = bursts.filter(b => now - b.startTime < burstLifetime);
    if (activeBursts.length !== bursts.length) {
      setBursts(activeBursts);
    }

    // Hide all particles initially
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    // Update active particles
    for (const burst of activeBursts) {
      const age = (now - burst.startTime) / burstLifetime; // 0 to 1
      const burstSize = 8; // particles per burst
      
      for (let i = 0; i < burstSize && particleIdx < PARTICLE_COUNT; i++) {
        const pId = (burst.id * 13 + i) * 7.13;
        const speed = 2 + Math.sin(pId) * 1;
        const dir = new THREE.Vector3(
          Math.sin(pId * 1.5),
          Math.cos(pId * 2.1) + 0.5, // Bias upward
          Math.sin(pId * 0.9)
        ).normalize();

        const dist = age * speed;
        dummy.position.copy(burst.position).addScaledVector(dir, dist);
        // Gravity
        dummy.position.y -= age * age * 2.5;
        
        const scale = (1 - age) * 0.15;
        dummy.scale.setScalar(Math.max(0, scale));
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(particleIdx, dummy.matrix);
        particleIdx++;
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial transparent opacity={0.8} />
    </instancedMesh>
  );
}
