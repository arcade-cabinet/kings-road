import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GamepadProvider } from './GamepadProvider';

/** Helper: build a fake GamepadButton. */
function btn(pressed = false, value?: number): GamepadButton {
  return {
    pressed,
    touched: pressed,
    value: value ?? (pressed ? 1.0 : 0.0),
  };
}

/** Helper: build a minimal fake Gamepad with given axes and buttons. */
function fakeGamepad(
  axes: number[] = [0, 0, 0, 0],
  buttons: GamepadButton[] = Array.from({ length: 17 }, () => btn()),
): Gamepad {
  return {
    id: 'Fake Gamepad',
    index: 0,
    connected: true,
    timestamp: performance.now(),
    mapping: 'standard',
    axes,
    buttons,
    hapticActuators: [],
    vibrationActuator: null as unknown as GamepadHapticActuator,
  };
}

function mockGetGamepads(gp: Gamepad | null) {
  const result = gp ? [gp, null, null, null] : [null, null, null, null];
  navigator.getGamepads = vi.fn(() => result) as Navigator['getGamepads'];
}

describe('GamepadProvider', () => {
  let provider: GamepadProvider;
  const originalGetGamepads = navigator.getGamepads;

  beforeEach(() => {
    // Ensure getGamepads exists (happy-dom doesn't provide it)
    navigator.getGamepads =
      originalGetGamepads ??
      (vi.fn(() => [null, null, null, null]) as Navigator['getGamepads']);
    provider = new GamepadProvider();
  });

  afterEach(() => {
    if (originalGetGamepads) {
      navigator.getGamepads = originalGetGamepads;
    }
    vi.restoreAllMocks();
  });

  it('returns empty object when no gamepad connected', () => {
    mockGetGamepads(null);
    expect(provider.poll(0.016)).toEqual({});
  });

  describe('deadzone', () => {
    it('returns 0 for values below deadzone (0.15)', () => {
      mockGetGamepads(fakeGamepad([0.1, -0.05, 0, 0]));
      const frame = provider.poll(0.016);
      expect(frame.moveX).toBe(0);
      expect(frame.moveZ).toBeCloseTo(0);
    });

    it('rescales values above deadzone to 0..1 range', () => {
      // Axis at 1.0: rescaled = (1.0 - 0.15) / (1 - 0.15) = 1.0
      mockGetGamepads(fakeGamepad([1.0, 0, 0, 0]));
      const frame = provider.poll(0.016);
      expect(frame.moveX).toBeCloseTo(1.0);

      // Axis at ~0.575: rescaled = (0.575 - 0.15) / 0.85 = 0.5
      mockGetGamepads(fakeGamepad([0.575, 0, 0, 0]));
      const frame2 = new GamepadProvider().poll(0.016);
      expect(frame2.moveX).toBeCloseTo(0.5);
    });
  });

  describe('movement', () => {
    it('inverts Y-axis so stick-up produces positive moveZ', () => {
      // Stick up = axes[1] negative → moveZ should be positive
      mockGetGamepads(fakeGamepad([0, -1.0, 0, 0]));
      const frame = provider.poll(0.016);
      expect(frame.moveZ).toBeCloseTo(1.0);
    });

    it('maps left stick to moveX/moveZ', () => {
      mockGetGamepads(fakeGamepad([-0.8, 0.6, 0, 0]));
      const frame = provider.poll(0.016);
      expect(frame.moveX).toBeLessThan(0);
      expect(frame.moveZ).toBeLessThan(0); // axes[1] positive → moveZ negative (inverted)
    });
  });

  describe('look', () => {
    it('applies look sensitivity to right stick', () => {
      mockGetGamepads(fakeGamepad([0, 0, 1.0, 0]));
      const frame = provider.poll(0.016);
      // rescaled 1.0 * 0.05 = 0.05
      expect(frame.lookDeltaX).toBeCloseTo(0.05);
      expect(frame.lookDeltaY).toBe(0);
    });

    it('returns 0 look when right stick is within deadzone', () => {
      mockGetGamepads(fakeGamepad([0, 0, 0.1, 0.05]));
      const frame = provider.poll(0.016);
      expect(frame.lookDeltaX).toBe(0);
      expect(frame.lookDeltaY).toBe(0);
    });
  });

  describe('rising edge buttons', () => {
    it('triggers jump only on false→true transition', () => {
      const buttons = Array.from({ length: 17 }, () => btn());
      buttons[0] = btn(true); // A pressed

      mockGetGamepads(fakeGamepad([0, 0, 0, 0], buttons));

      // First poll: rising edge → jump = true
      const frame1 = provider.poll(0.016);
      expect(frame1.jump).toBe(true);

      // Second poll: still pressed → jump = false (no edge)
      const frame2 = provider.poll(0.016);
      expect(frame2.jump).toBe(false);

      // Third poll: released then pressed again → jump = true
      const released = Array.from({ length: 17 }, () => btn());
      mockGetGamepads(fakeGamepad([0, 0, 0, 0], released));
      provider.poll(0.016); // release frame

      buttons[0] = btn(true);
      mockGetGamepads(fakeGamepad([0, 0, 0, 0], buttons));
      const frame4 = provider.poll(0.016);
      expect(frame4.jump).toBe(true);
    });

    it('triggers pause on Start (button 9) rising edge', () => {
      const buttons = Array.from({ length: 17 }, () => btn());
      buttons[9] = btn(true);
      mockGetGamepads(fakeGamepad([0, 0, 0, 0], buttons));

      expect(provider.poll(0.016).pause).toBe(true);
      expect(provider.poll(0.016).pause).toBe(false);
    });

    it('triggers questLog on Y (button 3) or DPad-Up (button 12)', () => {
      const buttons = Array.from({ length: 17 }, () => btn());
      buttons[3] = btn(true);
      mockGetGamepads(fakeGamepad([0, 0, 0, 0], buttons));
      expect(provider.poll(0.016).questLog).toBe(true);

      // Reset
      const released = Array.from({ length: 17 }, () => btn());
      mockGetGamepads(fakeGamepad([0, 0, 0, 0], released));
      provider.poll(0.016);

      // DPad-Up alternative
      const buttons2 = Array.from({ length: 17 }, () => btn());
      buttons2[12] = btn(true);
      mockGetGamepads(fakeGamepad([0, 0, 0, 0], buttons2));
      expect(provider.poll(0.016).questLog).toBe(true);
    });
  });

  describe('analog triggers', () => {
    it('triggers attack when RT (button 7) value > 0.5', () => {
      const buttons = Array.from({ length: 17 }, () => btn());
      buttons[7] = btn(false, 0.8);
      mockGetGamepads(fakeGamepad([0, 0, 0, 0], buttons));
      expect(provider.poll(0.016).attack).toBe(true);
    });

    it('does not trigger attack when RT value <= 0.5', () => {
      const buttons = Array.from({ length: 17 }, () => btn());
      buttons[7] = btn(false, 0.3);
      mockGetGamepads(fakeGamepad([0, 0, 0, 0], buttons));
      expect(provider.poll(0.016).attack).toBe(false);
    });

    it('triggers interact when LT (button 6) value > 0.5', () => {
      const buttons = Array.from({ length: 17 }, () => btn());
      buttons[6] = btn(false, 0.9);
      mockGetGamepads(fakeGamepad([0, 0, 0, 0], buttons));
      expect(provider.poll(0.016).interact).toBe(true);
    });
  });

  describe('sprint', () => {
    it('reports sprint when L3 (button 10) is held', () => {
      const buttons = Array.from({ length: 17 }, () => btn());
      buttons[10] = btn(true);
      mockGetGamepads(fakeGamepad([0, 0, 0, 0], buttons));
      expect(provider.poll(0.016).sprint).toBe(true);
    });

    it('reports no sprint when L3 is released', () => {
      mockGetGamepads(fakeGamepad());
      expect(provider.poll(0.016).sprint).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('returns true when navigator.getGamepads exists', () => {
      expect(provider.isAvailable()).toBe(true);
    });

    it('returns false when navigator.getGamepads is missing', () => {
      const orig = navigator.getGamepads;
      Object.defineProperty(navigator, 'getGamepads', {
        value: undefined,
        configurable: true,
      });
      expect(provider.isAvailable()).toBe(false);
      Object.defineProperty(navigator, 'getGamepads', {
        value: orig,
        configurable: true,
      });
    });
  });
});
