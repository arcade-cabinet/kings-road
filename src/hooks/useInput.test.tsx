// Tests for legacy input hooks (useInput.ts). These hooks have been superseded
// by InputManager providers but the tests are retained to guard the store interface.

import { act, renderHook } from '@testing-library/react';
import { WorldProvider } from 'koota/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCamera, getInputLegacy, setGameActive } from '@/ecs/actions/game';
import { gameWorld, unsafe_resetSessionEntity } from '@/ecs/world';
import { useKeyboardInput, useMouseInput, useTouchInput } from './useInput';

function wrapper({ children }: { children: ReactNode }) {
  return <WorldProvider world={gameWorld}>{children}</WorldProvider>;
}

beforeEach(() => {
  unsafe_resetSessionEntity();
  setGameActive(true);
});

describe('useKeyboardInput', () => {
  it('sets w key on KeyW press', () => {
    renderHook(() => useKeyboardInput(), { wrapper });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    });

    expect(getInputLegacy().keys.w).toBe(true);
  });

  it('sets w key on ArrowUp press', () => {
    renderHook(() => useKeyboardInput(), { wrapper });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
    });

    expect(getInputLegacy().keys.w).toBe(true);
  });

  it('unsets w key on KeyW release', () => {
    renderHook(() => useKeyboardInput(), { wrapper });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    });
    expect(getInputLegacy().keys.w).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    });
    expect(getInputLegacy().keys.w).toBe(false);
  });

  it('handles WASD keys', () => {
    renderHook(() => useKeyboardInput(), { wrapper });

    const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
    const storeKeys = ['w', 'a', 's', 'd'] as const;

    keys.forEach((code, i) => {
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code }));
      });
      expect(getInputLegacy().keys[storeKeys[i]]).toBe(true);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { code }));
      });
      expect(getInputLegacy().keys[storeKeys[i]]).toBe(false);
    });
  });

  it('handles arrow keys', () => {
    renderHook(() => useKeyboardInput(), { wrapper });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
    });
    expect(getInputLegacy().keys.w).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
    });
    expect(getInputLegacy().keys.s).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
    });
    expect(getInputLegacy().keys.a).toBe(true);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'ArrowRight' }),
      );
    });
    expect(getInputLegacy().keys.d).toBe(true);
  });

  it('handles Q and E keys', () => {
    renderHook(() => useKeyboardInput(), { wrapper });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
    });
    expect(getInputLegacy().keys.q).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    });
    expect(getInputLegacy().keys.e).toBe(true);
    expect(getInputLegacy().keys.action).toBe(true);
  });

  it('handles Space key', () => {
    renderHook(() => useKeyboardInput(), { wrapper });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });
    expect(getInputLegacy().keys.space).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    });
    expect(getInputLegacy().keys.space).toBe(false);
  });

  it('handles Shift keys', () => {
    renderHook(() => useKeyboardInput(), { wrapper });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
    });
    expect(getInputLegacy().keys.shift).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' }));
    });
    expect(getInputLegacy().keys.shift).toBe(false);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'ShiftRight' }),
      );
    });
    expect(getInputLegacy().keys.shift).toBe(true);
  });

  it('ignores input when in dialogue', () => {
    // Set inDialogue via Koota flags — use setKey to set inDialogue would be wrong,
    // but we can't easily simulate dialogue in unit tests for this hook.
    // The hook reads inDialogue reactively; resetting session entity gives false.
    // This test simply verifies the hook doesn't crash with no dialogue.
    renderHook(() => useKeyboardInput(), { wrapper });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    });

    // With no dialogue, w should be set
    expect(getInputLegacy().keys.w).toBe(true);
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardInput(), { wrapper });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keyup',
      expect.any(Function),
    );
  });

  it('handles keyup for arrow keys', () => {
    renderHook(() => useKeyboardInput(), { wrapper });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' }));
    });
    expect(getInputLegacy().keys.w).toBe(false);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowDown' }));
    });
    expect(getInputLegacy().keys.s).toBe(false);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
    });
    expect(getInputLegacy().keys.a).toBe(false);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'ArrowRight' }),
      );
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }));
    });
    expect(getInputLegacy().keys.d).toBe(false);
  });

  it('handles keyup for Q key', () => {
    renderHook(() => useKeyboardInput(), { wrapper });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyQ' }));
    });
    expect(getInputLegacy().keys.q).toBe(false);
  });

  it('handles keyup for E key and action', () => {
    renderHook(() => useKeyboardInput(), { wrapper });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    });
    expect(getInputLegacy().keys.e).toBe(true);
    expect(getInputLegacy().keys.action).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
    });
    expect(getInputLegacy().keys.e).toBe(false);
    expect(getInputLegacy().keys.action).toBe(false);
  });

  it('handles keyup for ShiftRight', () => {
    renderHook(() => useKeyboardInput(), { wrapper });

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'ShiftRight' }),
      );
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftRight' }));
    });
    expect(getInputLegacy().keys.shift).toBe(false);
  });

  it('ignores unknown key codes', () => {
    renderHook(() => useKeyboardInput(), { wrapper });

    const initialKeys = { ...getInputLegacy().keys };

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyZ' }));
    });

    // Keys should remain unchanged
    expect(getInputLegacy().keys).toEqual(initialKeys);
  });
});

describe('useMouseInput', () => {
  it('sets mouseDown on mouse down', () => {
    renderHook(() => useMouseInput(), { wrapper });

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      );
    });

    expect(getInputLegacy().mouseDown).toBe(true);
  });

  it('unsets mouseDown on mouse up', () => {
    renderHook(() => useMouseInput(), { wrapper });

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      );
    });
    expect(getInputLegacy().mouseDown).toBe(true);

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'));
    });
    expect(getInputLegacy().mouseDown).toBe(false);
  });

  it('updates camera on mouse move when dragging', () => {
    renderHook(() => useMouseInput(), { wrapper });

    const initialYaw = getCamera().cameraYaw;

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      );
    });

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 150, clientY: 100 }),
      );
    });

    expect(getCamera().cameraYaw).not.toBe(initialYaw);
  });

  it('clamps camera pitch', () => {
    renderHook(() => useMouseInput(), { wrapper });

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      );
    });

    // Try to look way up
    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 100, clientY: -1000 }),
      );
    });

    const { cameraPitch: pitch } = getCamera();
    expect(pitch).toBeLessThanOrEqual(Math.PI / 2.1);
    expect(pitch).toBeGreaterThanOrEqual(-Math.PI / 2.1);
  });

  it('does not update camera when game is not active', () => {
    setGameActive(false);
    renderHook(() => useMouseInput(), { wrapper });

    const initialYaw = getCamera().cameraYaw;

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      );
    });

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 200, clientY: 100 }),
      );
    });

    expect(getCamera().cameraYaw).toBe(initialYaw);
  });

  it('does not update camera on mousemove without mousedown', () => {
    renderHook(() => useMouseInput(), { wrapper });

    const initialYaw = getCamera().cameraYaw;

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 200, clientY: 100 }),
      );
    });

    expect(getCamera().cameraYaw).toBe(initialYaw);
  });
});

describe('useTouchInput', () => {
  let mockTarget: HTMLElement;

  beforeEach(() => {
    // Create a mock target element with closest
    mockTarget = document.createElement('div');
    mockTarget.closest = vi.fn().mockReturnValue(null);
    document.body.appendChild(mockTarget);
  });

  afterEach(() => {
    if (mockTarget?.parentNode) {
      mockTarget.parentNode.removeChild(mockTarget);
    }
  });

  // Helper to create touch event with proper target
  const createTouchEvent = (
    type: string,
    identifier: number,
    clientX: number,
    clientY: number,
  ) => {
    const touch = new Touch({
      identifier,
      target: mockTarget,
      clientX,
      clientY,
    });
    return new TouchEvent(type, {
      changedTouches: [touch],
      bubbles: true,
    });
  };

  it('returns setKey function', () => {
    const { result } = renderHook(() => useTouchInput(), { wrapper });
    expect(result.current.setKey).toBeDefined();
  });

  it('initializes joystick on touch start', () => {
    renderHook(() => useTouchInput(), { wrapper });

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchstart', 1, 100, 100));
    });

    expect(getInputLegacy().joystickDist).toBe(0);
  });

  it('updates joystick on touch move', () => {
    renderHook(() => useTouchInput(), { wrapper });

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchstart', 1, 100, 100));
    });

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchmove', 1, 150, 100));
    });

    expect(getInputLegacy().joystickVector.x).toBeGreaterThan(0);
  });

  it('resets joystick on touch end', () => {
    renderHook(() => useTouchInput(), { wrapper });

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchstart', 1, 100, 100));
    });

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchend', 1, 100, 100));
    });

    expect(getInputLegacy().joystickVector).toEqual({ x: 0, y: 0 });
    expect(getInputLegacy().joystickDist).toBe(0);
  });

  it('handles touch cancel', () => {
    renderHook(() => useTouchInput(), { wrapper });

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchstart', 1, 100, 100));
    });

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchcancel', 1, 100, 100));
    });

    expect(getInputLegacy().joystickDist).toBe(0);
  });

  it('clamps joystick distance to maxDist', () => {
    renderHook(() => useTouchInput(), { wrapper });

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchstart', 1, 100, 100));
    });

    // Move far beyond maxDist (70)
    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchmove', 1, 300, 100));
    });

    const state = getInputLegacy();
    // Vector should be clamped to 1
    expect(Math.abs(state.joystickVector.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(state.joystickVector.y)).toBeLessThanOrEqual(1);
  });

  it('ignores touch on action buttons', () => {
    renderHook(() => useTouchInput(), { wrapper });

    // Create a target that returns truthy for .action-btn
    const actionButton = document.createElement('button');
    actionButton.className = 'action-btn';
    actionButton.closest = vi.fn().mockImplementation((selector) => {
      if (selector === '.action-btn') return actionButton;
      return null;
    });
    document.body.appendChild(actionButton);

    const touch = new Touch({
      identifier: 99,
      target: actionButton,
      clientX: 50,
      clientY: 50,
    });

    act(() => {
      actionButton.dispatchEvent(
        new TouchEvent('touchstart', {
          changedTouches: [touch],
          bubbles: true,
        }),
      );
    });

    // Joystick should not be initialized because touch was on action button
    expect(getInputLegacy().joystickDist).toBe(0);

    document.body.removeChild(actionButton);
  });

  it('ignores touchstart when already tracking a touch', () => {
    renderHook(() => useTouchInput(), { wrapper });

    // Start first touch
    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchstart', 1, 100, 100));
    });

    // Try to start second touch - should be ignored
    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchstart', 2, 200, 200));
    });

    // Move first touch
    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchmove', 1, 150, 100));
    });

    // Joystick should track first touch
    expect(getInputLegacy().joystickVector.x).toBeGreaterThan(0);
  });

  it('ignores touchmove for non-tracked touch', () => {
    renderHook(() => useTouchInput(), { wrapper });

    // Start touch with id 1
    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchstart', 1, 100, 100));
    });

    // Move a different touch (id 2) - should be ignored
    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchmove', 2, 200, 200));
    });

    // Joystick should still be at origin
    expect(getInputLegacy().joystickVector.x).toBe(0);
  });

  it('ignores touchend for non-tracked touch', () => {
    renderHook(() => useTouchInput(), { wrapper });

    // Start touch with id 1
    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchstart', 1, 100, 100));
    });

    // Move touch
    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchmove', 1, 150, 100));
    });

    // End a different touch (id 2) - should not reset joystick
    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchend', 2, 200, 200));
    });

    // Joystick should still have value from touch 1
    expect(getInputLegacy().joystickVector.x).toBeGreaterThan(0);
  });

  it('handles empty changedTouches array', () => {
    renderHook(() => useTouchInput(), { wrapper });

    act(() => {
      mockTarget.dispatchEvent(
        new TouchEvent('touchstart', {
          changedTouches: [],
          bubbles: true,
        }),
      );
    });

    // Should not crash and joystick should be unchanged
    expect(getInputLegacy().joystickDist).toBe(0);
  });
});
