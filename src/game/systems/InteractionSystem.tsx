import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import type { Interactable } from '../types';

export function InteractionSystem() {
  const globalInteractables = useGameStore(
    (state) => state.globalInteractables,
  );
  const playerPosition = useGameStore((state) => state.playerPosition);
  const cameraYaw = useGameStore((state) => state.cameraYaw);
  const keys = useGameStore((state) => state.keys);
  const inDialogue = useGameStore((state) => state.inDialogue);
  const gameActive = useGameStore((state) => state.gameActive);

  const setCurrentInteractable = useGameStore(
    (state) => state.setCurrentInteractable,
  );
  const openDialogue = useGameStore((state) => state.openDialogue);
  const setKey = useGameStore((state) => state.setKey);

  useFrame(() => {
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
    const lookDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      cameraYaw ?? 0,
    );

    for (const obj of globalInteractables) {
      // Safety check for each interactable
      if (!obj?.position) continue;

      const distSq =
        (obj.position.x - playerPosition.x) ** 2 +
        (obj.position.z - playerPosition.z) ** 2;

      if (distSq < (obj.radius ?? 4) ** 2) {
        const dirToObj = new THREE.Vector3()
          .subVectors(obj.position, playerPosition)
          .normalize();

        if (dirToObj.dot(lookDir) > 0.5) {
          foundInteractable = obj;
          break;
        }
      }
    }

    setCurrentInteractable(foundInteractable);

    // Handle interaction key press
    if (foundInteractable && keys?.action) {
      openDialogue(
        foundInteractable.name ?? 'Unknown',
        foundInteractable.dialogueText ?? '...',
      );
      setKey('action', false);
    }
  });

  return null;
}
