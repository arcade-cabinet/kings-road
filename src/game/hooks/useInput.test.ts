// Tests for legacy input hooks (useInput.ts). These hooks have been superseded
// by InputManager providers but the tests are retained to guard the store interface.

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../stores/gameStore';
import { useKeyboardInput, useMouseInput, useTouchInput } from './useInput';

describe('useKeyboardInput', () => {
  beforeEach(() => {
    // Reset store state
    useGameStore.setState({
      inDialogue: false,
      keys: {
        w: false,
        a: false,
        s: false,
        d: false,
        q: false,
        e: false,
        space: false,
        shift: false,
        action: false,
      },
    });
  });

  it('sets w key on KeyW press', () => {
    renderHook(() => useKeyboardInput());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    });

    expect(useGameStore.getState().keys.w).toBe(true);
  });

  it('sets w key on ArrowUp press', () => {
    renderHook(() => useKeyboardInput());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
    });

    expect(useGameStore.getState().keys.w).toBe(true);
  });

  it('unsets w key on KeyW release', () => {
    renderHook(() => useKeyboardInput());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    });
    expect(useGameStore.getState().keys.w).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    });
    expect(useGameStore.getState().keys.w).toBe(false);
  });

  it('handles WASD keys', () => {
    renderHook(() => useKeyboardInput());

    const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
    const storeKeys = ['w', 'a', 's', 'd'] as const;

    keys.forEach((code, i) => {
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code }));
      });
      expect(useGameStore.getState().keys[storeKeys[i]]).toBe(true);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { code }));
      });
      expect(useGameStore.getState().keys[storeKeys[i]]).toBe(false);
    });
  });

  it('handles arrow keys', () => {
    renderHook(() => useKeyboardInput());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
    });
    expect(useGameStore.getState().keys.w).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
    });
    expect(useGameStore.getState().keys.s).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
    });
    expect(useGameStore.getState().keys.a).toBe(true);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'ArrowRight' }),
      );
    });
    expect(useGameStore.getState().keys.d).toBe(true);
  });

  it('handles Q and E keys', () => {
    renderHook(() => useKeyboardInput());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
    });
    expect(useGameStore.getState().keys.q).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    });
    expect(useGameStore.getState().keys.e).toBe(true);
    expect(useGameStore.getState().keys.action).toBe(true);
  });

  it('handles Space key', () => {
    renderHook(() => useKeyboardInput());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });
    expect(useGameStore.getState().keys.space).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    });
    expect(useGameStore.getState().keys.space).toBe(false);
  });

  it('handles Shift keys', () => {
    renderHook(() => useKeyboardInput());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
    });
    expect(useGameStore.getState().keys.shift).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' }));
    });
    expect(useGameStore.getState().keys.shift).toBe(false);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'ShiftRight' }),
      );
    });
    expect(useGameStore.getState().keys.shift).toBe(true);
  });

  it('ignores input when in dialogue', () => {
    useGameStore.setState({ inDialogue: true });
    renderHook(() => useKeyboardInput());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    });

    expect(useGameStore.getState().keys.w).toBe(false);
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardInput());

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
    renderHook(() => useKeyboardInput());

    // Press and release arrow keys
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' }));
    });
    expect(useGameStore.getState().keys.w).toBe(false);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowDown' }));
    });
    expect(useGameStore.getState().keys.s).toBe(false);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
    });
    expect(useGameStore.getState().keys.a).toBe(false);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'ArrowRight' }),
      );
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }));
    });
    expect(useGameStore.getState().keys.d).toBe(false);
  });

  it('handles keyup for Q key', () => {
    renderHook(() => useKeyboardInput());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyQ' }));
    });
    expect(useGameStore.getState().keys.q).toBe(false);
  });

  it('handles keyup for E key and action', () => {
    renderHook(() => useKeyboardInput());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    });
    expect(useGameStore.getState().keys.e).toBe(true);
    expect(useGameStore.getState().keys.action).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
    });
    expect(useGameStore.getState().keys.e).toBe(false);
    expect(useGameStore.getState().keys.action).toBe(false);
  });

  it('handles keyup for ShiftRight', () => {
    renderHook(() => useKeyboardInput());

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'ShiftRight' }),
      );
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftRight' }));
    });
    expect(useGameStore.getState().keys.shift).toBe(false);
  });

  it('ignores unknown key codes', () => {
    renderHook(() => useKeyboardInput());

    const initialKeys = { ...useGameStore.getState().keys };

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyZ' }));
    });

    // Keys should remain unchanged
    expect(useGameStore.getState().keys).toEqual(initialKeys);
  });
});

describe('useMouseInput', () => {
  beforeEach(() => {
    useGameStore.setState({
      gameActive: true,
      inDialogue: false,
      mouseDown: false,
      cameraYaw: Math.PI,
      cameraPitch: 0,
    });
  });

  it('sets mouseDown on mouse down', () => {
    renderHook(() => useMouseInput());

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      );
    });

    expect(useGameStore.getState().mouseDown).toBe(true);
  });

  it('unsets mouseDown on mouse up', () => {
    renderHook(() => useMouseInput());

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      );
    });
    expect(useGameStore.getState().mouseDown).toBe(true);

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'));
    });
    expect(useGameStore.getState().mouseDown).toBe(false);
  });

  it('ignores mousedown when in dialogue', () => {
    useGameStore.setState({ inDialogue: true });
    renderHook(() => useMouseInput());

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      );
    });

    expect(useGameStore.getState().mouseDown).toBe(false);
  });

  it('updates camera on mouse move when dragging', () => {
    renderHook(() => useMouseInput());

    const initialYaw = useGameStore.getState().cameraYaw;

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

    expect(useGameStore.getState().cameraYaw).not.toBe(initialYaw);
  });

  it('clamps camera pitch', () => {
    renderHook(() => useMouseInput());

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

    const pitch = useGameStore.getState().cameraPitch;
    expect(pitch).toBeLessThanOrEqual(Math.PI / 2.1);
    expect(pitch).toBeGreaterThanOrEqual(-Math.PI / 2.1);
  });

  it('does not update camera when game is not active', () => {
    useGameStore.setState({ gameActive: false });
    renderHook(() => useMouseInput());

    const initialYaw = useGameStore.getState().cameraYaw;

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

    expect(useGameStore.getState().cameraYaw).toBe(initialYaw);
  });

  it('does not update camera on mousemove without mousedown', () => {
    renderHook(() => useMouseInput());

    const initialYaw = useGameStore.getState().cameraYaw;

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 200, clientY: 100 }),
      );
    });

    expect(useGameStore.getState().cameraYaw).toBe(initialYaw);
  });
});

describe('useTouchInput', () => {
  let mockTarget: HTMLElement;

  beforeEach(() => {
    useGameStore.setState({
      joystickVector: { x: 0, y: 0 },
      joystickDist: 0,
    });

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
    const { result } = renderHook(() => useTouchInput());
    expect(result.current.setKey).toBeDefined();
  });

  it('initializes joystick on touch start', () => {
    renderHook(() => useTouchInput());

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchstart', 1, 100, 100));
    });

    expect(useGameStore.getState().joystickDist).toBe(0);
  });

  it('updates joystick on touch move', () => {
    renderHook(() => useTouchInput());

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchstart', 1, 100, 100));
    });

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchmove', 1, 150, 100));
    });

    const state = useGameStore.getState();
    expect(state.joystickVector.x).toBeGreaterThan(0);
  });

  it('resets joystick on touch end', () => {
    renderHook(() => useTouchInput());

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchstart', 1, 100, 100));
    });

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchend', 1, 100, 100));
    });

    expect(useGameStore.getState().joystickVector).toEqual({ x: 0, y: 0 });
    expect(useGameStore.getState().joystickDist).toBe(0);
  });

  it('handles touch cancel', () => {
    renderHook(() => useTouchInput());

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchstart', 1, 100, 100));
    });

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchcancel', 1, 100, 100));
    });

    expect(useGameStore.getState().joystickDist).toBe(0);
  });

  it('clamps joystick distance to maxDist', () => {
    renderHook(() => useTouchInput());

    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchstart', 1, 100, 100));
    });

    // Move far beyond maxDist (70)
    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchmove', 1, 300, 100));
    });

    const state = useGameStore.getState();
    // Vector should be clamped to 1
    expect(Math.abs(state.joystickVector.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(state.joystickVector.y)).toBeLessThanOrEqual(1);
  });

  it('ignores touch on action buttons', () => {
    renderHook(() => useTouchInput());

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
    expect(useGameStore.getState().joystickDist).toBe(0);

    document.body.removeChild(actionButton);
  });

  it('ignores touchstart when already tracking a touch', () => {
    renderHook(() => useTouchInput());

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
    expect(useGameStore.getState().joystickVector.x).toBeGreaterThan(0);
  });

  it('ignores touchmove for non-tracked touch', () => {
    renderHook(() => useTouchInput());

    // Start touch with id 1
    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchstart', 1, 100, 100));
    });

    // Move a different touch (id 2) - should be ignored
    act(() => {
      mockTarget.dispatchEvent(createTouchEvent('touchmove', 2, 200, 200));
    });

    // Joystick should still be at origin
    expect(useGameStore.getState().joystickVector.x).toBe(0);
  });

  it('ignores touchend for non-tracked touch', () => {
    renderHook(() => useTouchInput());

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
    expect(useGameStore.getState().joystickVector.x).toBeGreaterThan(0);
  });

  it('handles empty changedTouches array', () => {
    renderHook(() => useTouchInput());

    act(() => {
      mockTarget.dispatchEvent(
        new TouchEvent('touchstart', {
          changedTouches: [],
          bubbles: true,
        }),
      );
    });

    // Should not crash and joystick should be unchanged
    expect(useGameStore.getState().joystickDist).toBe(0);
  });
});
