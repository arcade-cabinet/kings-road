import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getCombatUI } from '@/ecs/actions/combat-ui';
import { useGameStore } from '@/stores/gameStore';

const PARTICLE_COUNT = 32;

interface ActiveBurst {
  id: number;
  // Plain scalars — no Three.js objects in state or ref-stored data.
  x: number;
  y: number;
  z: number;
  startTime: number;
  color: string;
}

/**
 * CombatParticles — renders blood/hit bursts when entities take damage.
 * Uses InstancedMesh for efficiency.
 *
 * Burst data lives in a ref (not state) so mutations inside useFrame never
 * trigger React re-renders. Positions are stored as plain scalars; Three.js
 * objects (Vector3, Object3D) are only created/reused inside useFrame.
 */
export function CombatParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  // Bursts stored in a ref — mutations are invisible to React's reconciler,
  // which is correct because the InstancedMesh is updated imperatively.
  const burstsRef = useRef<ActiveBurst[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const lastDamageRef = useRef(0);
  const lastHitRef = useRef(0);
  const nextBurstId = useRef(0);

  // Reusable Vector3 to avoid per-frame allocations.
  const dirVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((_state, _delta) => {
    const { lastDamageTime, lastHitTime, damagePopups } = getCombatUI();
    const playerPos = useGameStore.getState().playerPosition;
    const now = performance.now();

    // ── Check for new bursts ─────────────────────────────────────────

    // We look at the latest damage popups to determine burst positions
    const _recentPopups = damagePopups.filter((p) => now - p.createdAt < 100);

    if (lastDamageTime > lastDamageRef.current && playerPos) {
      lastDamageRef.current = lastDamageTime;
      // Player hit burst (blood)
      const bursts = burstsRef.current;
      // Cap active bursts at 5 via in-place shift — no slice() allocation.
      while (bursts.length >= 5) bursts.shift();
      bursts.push({
        id: nextBurstId.current++,
        x: playerPos.x,
        y: playerPos.y + 0.5,
        z: playerPos.z,
        startTime: now,
        color: '#880000',
      });
    }

    if (lastHitTime > lastHitRef.current) {
      lastHitRef.current = lastHitTime;
      // Dealt damage burst (white/sparks)
      // Since we don't have exact monster world positions easily here,
      // we'll put it slightly ahead of the player for feedback.
      if (playerPos) {
        dirVec.set(0, 0, -1).applyEuler(_state.camera.rotation);
        const hitX = playerPos.x + dirVec.x * 2;
        const hitY = playerPos.y + dirVec.y * 2 + 0.5;
        const hitZ = playerPos.z + dirVec.z * 2;

        const bursts = burstsRef.current;
        while (bursts.length >= 5) bursts.shift();
        bursts.push({
          id: nextBurstId.current++,
          x: hitX,
          y: hitY,
          z: hitZ,
          startTime: now,
          color: '#ffffff',
        });
      }
    }

    // ── Render particles ────────────────────────────────────────────

    if (!meshRef.current) return;

    let particleIdx = 0;
    const burstLifetime = 600;

    // Drop expired bursts in place — no filter() allocation per frame.
    const bursts = burstsRef.current;
    let write = 0;
    for (let read = 0; read < bursts.length; read++) {
      if (now - bursts[read].startTime < burstLifetime) {
        if (write !== read) bursts[write] = bursts[read];
        write++;
      }
    }
    bursts.length = write;
    const activeBursts = bursts;

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
        dirVec.set(
          Math.sin(pId * 1.5),
          Math.cos(pId * 2.1) + 0.5, // Bias upward
          Math.sin(pId * 0.9),
        ).normalize();

        const dist = age * speed;
        dummy.position.set(
          burst.x + dirVec.x * dist,
          burst.y + dirVec.y * dist - age * age * 2.5, // Gravity
          burst.z + dirVec.z * dist,
        );

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
