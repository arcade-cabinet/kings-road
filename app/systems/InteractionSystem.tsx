import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { inputManager } from '@/input/InputManager';
import {
  getFlags,
  getPlayer,
  getCamera,
  getChunkState,
  openDialogue,
  setCurrentInteractable,
} from '@/ecs/actions/game';
import { useChunkState } from '@/ecs/hooks/useGameSession';
import type { Interactable } from '@/types/game';

// Reusable vectors — hoisted to avoid per-frame GC pressure
const _lookDir = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _dirToObj = new THREE.Vector3();

export function InteractionSystem() {
  const { globalInteractables } = useChunkState();

  useFrame(() => {
    const { playerPosition } = getPlayer();
    const { cameraYaw } = getCamera();
    const { gameActive, inDialogue } = getFlags();

    if (!gameActive || inDialogue) {
      setCurrentInteractable(null);
      return;
    }

    // Safety checks
    if (!playerPosition || !globalInteractables) {
      setCurrentInteractable(null);
      return;
    }

    let foundInteractable: Interactable | null = null;
    _lookDir.set(0, 0, -1).applyAxisAngle(_upAxis, cameraYaw ?? 0);

    for (const obj of globalInteractables) {
      // Safety check for each interactable
      if (!obj?.position) continue;

      const distSq =
        (obj.position.x - playerPosition.x) ** 2 +
        (obj.position.z - playerPosition.z) ** 2;

      if (distSq < (obj.radius ?? 4) ** 2) {
        _dirToObj.subVectors(obj.position, playerPosition).normalize();

        if (_dirToObj.dot(_lookDir) > 0.5) {
          foundInteractable = obj;
          break;
        }
      }
    }

    setCurrentInteractable(foundInteractable);

    // Handle interaction — read from InputManager (one-shot flag)
    const input = inputManager.poll(0);
    if (foundInteractable && input.interact) {
      openDialogue(
        foundInteractable.name ?? 'Unknown',
        foundInteractable.dialogueText ?? '...',
        foundInteractable.type,
      );
    }
  });

  return null;
}
