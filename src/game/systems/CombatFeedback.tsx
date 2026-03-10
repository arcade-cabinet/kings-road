import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useCombatStore } from '../stores/combatStore';

/**
 * CombatFeedback System — handles screen shake and visceral effects.
 *
 * Listens to combatStore events and applies camera offsets.
 */
export function CombatFeedback() {
  const { camera } = useThree();
  const shakeRef = useRef(new THREE.Vector3());
  const lastDamageRef = useRef(0);
  const lastHitRef = useRef(0);

  // Initial camera position for relative offsets
  // NOTE: This assumes the camera is controlled by PlayerController or similar
  // and we are just adding a transient offset.
  
  useFrame((_state, delta) => {
    const { lastDamageTime, lastHitTime } = useCombatStore.getState();
    const now = performance.now();

    // ── Screen Shake Logic ───────────────────────────────────────────
    
    let shakeIntensity = 0;

    // Shake for damage taken (Stronger)
    if (lastDamageTime > lastDamageRef.current) {
      lastDamageRef.current = lastDamageTime;
      shakeIntensity = 0.5;
    }
    
    // Shake for hits dealt (Subtle)
    if (lastHitTime > lastHitRef.current) {
      lastHitRef.current = lastHitTime;
      shakeIntensity = Math.max(shakeIntensity, 0.15);
    }

    // Decay existing shake
    if (shakeIntensity > 0) {
      shakeRef.current.set(
        (Math.random() - 0.5) * shakeIntensity,
        (Math.random() - 0.5) * shakeIntensity,
        (Math.random() - 0.5) * shakeIntensity
      );
    } else {
      shakeRef.current.lerp(new THREE.Vector3(0, 0, 0), delta * 15);
    }

    // Apply shake to camera (added to current position)
    // NOTE: In a robust FPS controller, you usually shake the 'camera group'
    // or add to the look-at target. Here we just add to the camera object.
    camera.position.add(shakeRef.current);
  });

  return null;
}
