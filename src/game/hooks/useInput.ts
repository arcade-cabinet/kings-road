import { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';

export function useKeyboardInput() {
  const setKey = useGameStore((state) => state.setKey);
  const inDialogue = useGameStore((state) => state.inDialogue);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (inDialogue) return;

      const k = e.code;
      if (
        ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)
      ) {
        e.preventDefault();
      }

      switch (k) {
        case 'KeyW':
        case 'ArrowUp':
          setKey('w', true);
          break;
        case 'KeyS':
        case 'ArrowDown':
          setKey('s', true);
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setKey('a', true);
          break;
        case 'KeyD':
        case 'ArrowRight':
          setKey('d', true);
          break;
        case 'KeyQ':
          setKey('q', true);
          break;
        case 'KeyE':
          setKey('e', true);
          setKey('action', true);
          break;
        case 'Space':
          setKey('space', true);
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setKey('shift', true);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.code;
      switch (k) {
        case 'KeyW':
        case 'ArrowUp':
          setKey('w', false);
          break;
        case 'KeyS':
        case 'ArrowDown':
          setKey('s', false);
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setKey('a', false);
          break;
        case 'KeyD':
        case 'ArrowRight':
          setKey('d', false);
          break;
        case 'KeyQ':
          setKey('q', false);
          break;
        case 'KeyE':
          setKey('e', false);
          setKey('action', false);
          break;
        case 'Space':
          setKey('space', false);
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setKey('shift', false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setKey, inDialogue]);
}

export function useMouseInput() {
  const setMouseDown = useGameStore((state) => state.setMouseDown);
  const setCameraYaw = useGameStore((state) => state.setCameraYaw);
  const setCameraPitch = useGameStore((state) => state.setCameraPitch);
  const inDialogue = useGameStore((state) => state.inDialogue);
  const gameActive = useGameStore((state) => state.gameActive);
  const mousePos = useRef({ x: 0, y: 0 });
  const isDown = useRef(false);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (inDialogue) return;
      isDown.current = true;
      mousePos.current = { x: e.clientX, y: e.clientY };
      setMouseDown(true);
    };

    const handleMouseUp = () => {
      isDown.current = false;
      setMouseDown(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown.current || !gameActive || inDialogue) return;

      const state = useGameStore.getState();
      const dx = e.clientX - mousePos.current.x;
      const dy = e.clientY - mousePos.current.y;

      const newYaw = state.cameraYaw - dx * 0.005;
      let newPitch = state.cameraPitch - dy * 0.005;
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
  }, [setMouseDown, setCameraYaw, setCameraPitch, inDialogue, gameActive]);
}

export function useTouchInput() {
  const setJoystick = useGameStore((state) => state.setJoystick);
  const setKey = useGameStore((state) => state.setKey);
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
        setJoystick({ x: 0, y: 0 }, 0);
      }
    },
    [setJoystick],
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

          setJoystick({ x: dx / maxDist, y: dy / maxDist }, dist);
        }
      }
    },
    [setJoystick],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId.current) {
          touchId.current = null;
          setJoystick({ x: 0, y: 0 }, 0);
        }
      }
    },
    [setJoystick],
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

  return { setKey };
}
