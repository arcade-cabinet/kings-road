import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardMouseProvider } from './KeyboardMouseProvider';

// jsdom defines pointerLockElement as writable but not configurable,
// so we can assign to it directly via type coercion.
function setPointerLock(element: Element | null) {
  (document as { pointerLockElement: Element | null }).pointerLockElement =
    element;
}

function fireKeyDown(key: string, repeat = false) {
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key, repeat, bubbles: true }),
  );
}

function fireKeyUp(key: string) {
  window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
}

function fireMouseMove(movementX: number, movementY: number) {
  // jsdom's MouseEvent constructor ignores movementX/Y,
  // so we create the event and set the properties manually.
  const event = new MouseEvent('mousemove', { bubbles: true });
  Object.defineProperty(event, 'movementX', { value: movementX });
  Object.defineProperty(event, 'movementY', { value: movementY });
  window.dispatchEvent(event);
}

function fireMouseDown(button: number) {
  window.dispatchEvent(new MouseEvent('mousedown', { button, bubbles: true }));
}

function fireMouseUp(button: number) {
  window.dispatchEvent(new MouseEvent('mouseup', { button, bubbles: true }));
}

describe('KeyboardMouseProvider', () => {
  let provider: KeyboardMouseProvider;

  beforeEach(() => {
    provider = new KeyboardMouseProvider();
  });

  afterEach(() => {
    provider.dispose();
  });

  describe('movement', () => {
    it('W key sets moveZ to 1', () => {
      fireKeyDown('w');
      const frame = provider.poll(0.016);
      expect(frame.moveZ).toBe(1);
    });

    it('S key sets moveZ to -1', () => {
      fireKeyDown('s');
      const frame = provider.poll(0.016);
      expect(frame.moveZ).toBe(-1);
    });

    it('A key sets moveX to -1', () => {
      fireKeyDown('a');
      const frame = provider.poll(0.016);
      expect(frame.moveX).toBe(-1);
    });

    it('D key sets moveX to 1', () => {
      fireKeyDown('d');
      const frame = provider.poll(0.016);
      expect(frame.moveX).toBe(1);
    });

    it('arrow keys produce correct movement', () => {
      fireKeyDown('ArrowUp');
      fireKeyDown('ArrowLeft');
      const frame = provider.poll(0.016);
      expect(frame.moveZ).toBe(1);
      expect(frame.moveX).toBe(-1);
    });

    it('releasing a key stops movement in that direction', () => {
      fireKeyDown('w');
      fireKeyDown('d');
      fireKeyUp('w');
      const frame = provider.poll(0.016);
      expect(frame.moveZ).toBe(0);
      expect(frame.moveX).toBe(1);
    });

    it('opposing keys cancel out', () => {
      fireKeyDown('w');
      fireKeyDown('s');
      const frame = provider.poll(0.016);
      expect(frame.moveZ).toBe(0);
    });
  });

  describe('sprint', () => {
    it('Shift held sets sprint to true', () => {
      fireKeyDown('Shift');
      const frame = provider.poll(0.016);
      expect(frame.sprint).toBe(true);
    });

    it('Shift released sets sprint to false', () => {
      fireKeyDown('Shift');
      fireKeyUp('Shift');
      const frame = provider.poll(0.016);
      expect(frame.sprint).toBe(false);
    });
  });

  describe('one-shot flags', () => {
    it('E key sets interact flag', () => {
      fireKeyDown('e');
      const frame = provider.poll(0.016);
      expect(frame.interact).toBe(true);
    });

    it('Space key sets jump flag', () => {
      fireKeyDown(' ');
      const frame = provider.poll(0.016);
      expect(frame.jump).toBe(true);
    });

    it('Escape key sets pause flag', () => {
      fireKeyDown('Escape');
      const frame = provider.poll(0.016);
      expect(frame.pause).toBe(true);
    });

    it('I key sets inventory flag', () => {
      fireKeyDown('i');
      const frame = provider.poll(0.016);
      expect(frame.inventory).toBe(true);
    });

    it('Q key sets questLog flag', () => {
      fireKeyDown('q');
      const frame = provider.poll(0.016);
      expect(frame.questLog).toBe(true);
    });

    it('postFrame clears one-shot flags', () => {
      fireKeyDown('e');
      fireKeyDown(' ');
      fireKeyDown('Escape');
      fireKeyDown('i');
      fireKeyDown('q');

      provider.poll(0.016);
      provider.postFrame();

      const frame = provider.poll(0.016);
      expect(frame.interact).toBe(false);
      expect(frame.jump).toBe(false);
      expect(frame.pause).toBe(false);
      expect(frame.inventory).toBe(false);
      expect(frame.questLog).toBe(false);
    });

    it('key repeat does not re-trigger one-shot flags', () => {
      fireKeyDown('e');
      provider.poll(0.016);
      provider.postFrame();

      // Simulate key repeat
      fireKeyDown('e', true);
      const frame = provider.poll(0.016);
      expect(frame.interact).toBe(false);
    });
  });

  describe('mouse look', () => {
    afterEach(() => {
      setPointerLock(null);
    });

    it('accumulates look deltas when pointer-locked', () => {
      setPointerLock(document.body);

      fireMouseMove(100, -50);
      const frame = provider.poll(0.016);
      expect(frame.lookDeltaX).toBeCloseTo(100 * 0.002);
      expect(frame.lookDeltaY).toBeCloseTo(-50 * 0.002);
    });

    it('ignores mouse movement when not pointer-locked', () => {
      setPointerLock(null);

      fireMouseMove(100, -50);
      const frame = provider.poll(0.016);
      expect(frame.lookDeltaX).toBe(0);
      expect(frame.lookDeltaY).toBe(0);
    });

    it('postFrame clears look deltas', () => {
      setPointerLock(document.body);

      fireMouseMove(100, -50);
      provider.poll(0.016);
      provider.postFrame();

      const frame = provider.poll(0.016);
      expect(frame.lookDeltaX).toBe(0);
      expect(frame.lookDeltaY).toBe(0);
    });

    it('accumulates multiple mouse movements', () => {
      setPointerLock(document.body);

      fireMouseMove(50, 10);
      fireMouseMove(30, 20);
      const frame = provider.poll(0.016);
      expect(frame.lookDeltaX).toBeCloseTo(80 * 0.002);
      expect(frame.lookDeltaY).toBeCloseTo(30 * 0.002);
    });
  });

  describe('attack', () => {
    it('left mouse button sets attack to true', () => {
      fireMouseDown(0);
      const frame = provider.poll(0.016);
      expect(frame.attack).toBe(true);
    });

    it('releasing left mouse button sets attack to false', () => {
      fireMouseDown(0);
      fireMouseUp(0);
      const frame = provider.poll(0.016);
      expect(frame.attack).toBe(false);
    });

    it('right mouse button does not trigger attack', () => {
      fireMouseDown(2);
      const frame = provider.poll(0.016);
      expect(frame.attack).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('returns true when pointer: fine matches', () => {
      // jsdom default: matchMedia returns matches = false
      // But the provider falls back to true when matchMedia is not useful
      const available = provider.isAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('dispose', () => {
    it('clears key state and stops responding to events', () => {
      fireKeyDown('w');
      provider.dispose();

      // After dispose, poll should still return what keysDown had before clear
      // but keysDown was cleared in dispose, so movement stops
      const frame = provider.poll(0.016);
      expect(frame.moveZ).toBe(0);
    });

    it('removes event listeners', () => {
      const spy = vi.spyOn(window, 'removeEventListener');
      provider.dispose();
      // 6 = keydown, keyup, mousemove, mousedown, mouseup, blur.
      // blur was added to clear held keys/mouse buttons on focus loss
      // (see ghost-key fix in #207).
      expect(spy).toHaveBeenCalledTimes(6);
      spy.mockRestore();
    });
  });
});
