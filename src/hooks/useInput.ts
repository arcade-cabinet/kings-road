/** @deprecated Use InputManager providers instead. This file is no longer imported. */

import { useCallback, useEffect, useRef } from 'react';
import {
  closeInventory,
  isInventoryOpen,
  toggleInventory,
} from '@/ecs/actions/inventory-ui';
import {
  closeDialogue,
  getCamera,
  getFlags,
  setKey as setKeyAction,
  setJoystick as setJoystickAction,
  setMouseDown as setMouseDownAction,
  setCameraYaw,
  setCameraPitch,
  togglePause,
} from '@/ecs/actions/game';
import { useFlags } from '@/ecs/hooks/useGameSession';

export function useKeyboardInput() {
  const { inDialogue } = useFlags();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.code;

      // ESC toggles pause (works even in dialogue / inventory)
      if (k === 'Escape') {
        e.preventDefault();
        const flags = getFlags();
        if (!flags.gameActive) return;
        if (flags.inDialogue) {
          closeDialogue();
        } else if (isInventoryOpen()) {
          closeInventory();
        } else {
          togglePause();
        }
        return;
      }

      if (inDialogue || getFlags().paused || isInventoryOpen())
        return;

      // I toggles inventory
      if (k === 'KeyI') {
        e.preventDefault();
        toggleInventory();
        return;
      }

      if (
        ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)
      ) {
        e.preventDefault();
      }

      switch (k) {
        case 'KeyW':
        case 'ArrowUp':
          setKeyAction('w', true);
          break;
        case 'KeyS':
        case 'ArrowDown':
          setKeyAction('s', true);
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setKeyAction('a', true);
          break;
        case 'KeyD':
        case 'ArrowRight':
          setKeyAction('d', true);
          break;
        case 'KeyQ':
          setKeyAction('q', true);
          break;
        case 'KeyE':
          setKeyAction('e', true);
          setKeyAction('action', true);
          break;
        case 'Space':
          setKeyAction('space', true);
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setKeyAction('shift', true);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.code;
      switch (k) {
        case 'KeyW':
        case 'ArrowUp':
          setKeyAction('w', false);
          break;
        case 'KeyS':
        case 'ArrowDown':
          setKeyAction('s', false);
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setKeyAction('a', false);
          break;
        case 'KeyD':
        case 'ArrowRight':
          setKeyAction('d', false);
          break;
        case 'KeyQ':
          setKeyAction('q', false);
          break;
        case 'KeyE':
          setKeyAction('e', false);
          setKeyAction('action', false);
          break;
        case 'Space':
          setKeyAction('space', false);
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setKeyAction('shift', false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [inDialogue]);
}

export function useMouseInput() {
  const { inDialogue, gameActive } = useFlags();
  const mousePos = useRef({ x: 0, y: 0 });
  const isDown = useRef(false);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (inDialogue) return;
      isDown.current = true;
      mousePos.current = { x: e.clientX, y: e.clientY };
      setMouseDownAction(true);
    };

    const handleMouseUp = () => {
      isDown.current = false;
      setMouseDownAction(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (
        !isDown.current ||
        !gameActive ||
        inDialogue ||
        getFlags().paused
      )
        return;

      const { cameraYaw, cameraPitch } = getCamera();
      const dx = e.clientX - mousePos.current.x;
      const dy = e.clientY - mousePos.current.y;

      const newYaw = cameraYaw - dx * 0.005;
      let newPitch = cameraPitch - dy * 0.005;
      newPitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, newPitch));

      setCameraYaw(newYaw);
      setCameraPitch(newPitch);

      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [inDialogue, gameActive]);
}

export function useTouchInput() {
  const touchId = useRef<number | null>(null);
  const joystickBase = useRef({ x: 0, y: 0 });

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (touchId.current === null && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];

        // Check if touch is on action buttons (handled separately)
        const target = e.target as HTMLElement;
        if (target.closest('.action-btn')) return;

        touchId.current = touch.identifier;
        joystickBase.current = { x: touch.clientX, y: touch.clientY };
        setJoystickAction({ x: 0, y: 0 }, 0);
      }
    },
    [],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchId.current) {
          let dx = touch.clientX - joystickBase.current.x;
          let dy = touch.clientY - joystickBase.current.y;
          let dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = 70;
          if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
            dist = maxDist;
          }

          setJoystickAction({ x: dx / maxDist, y: dy / maxDist }, dist);
        }
      }
    },
    [],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId.current) {
          touchId.current = null;
          setJoystickAction({ x: 0, y: 0 }, 0);
        }
      }
    },
    [],
  );

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { setKey: setKeyAction };
}
