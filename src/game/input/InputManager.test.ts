import { describe, expect, it, vi } from 'vitest';
import { InputManager } from './InputManager';
import type { IInputProvider, InputFrame } from './types';
import { emptyInputFrame } from './types';

function mockProvider(
  partial: Partial<InputFrame> = {},
  available = true,
): IInputProvider {
  return {
    type: 'mock',
    enabled: true,
    poll: vi.fn(() => partial),
    postFrame: vi.fn(),
    isAvailable: vi.fn(() => available),
    dispose: vi.fn(),
  };
}

describe('emptyInputFrame', () => {
  it('returns all zeros and false', () => {
    const frame = emptyInputFrame();
    expect(frame.moveX).toBe(0);
    expect(frame.moveZ).toBe(0);
    expect(frame.lookDeltaX).toBe(0);
    expect(frame.lookDeltaY).toBe(0);
    expect(frame.interact).toBe(false);
    expect(frame.sprint).toBe(false);
    expect(frame.jump).toBe(false);
    expect(frame.pause).toBe(false);
    expect(frame.inventory).toBe(false);
    expect(frame.questLog).toBe(false);
    expect(frame.attack).toBe(false);
  });
});

describe('InputManager', () => {
  it('returns empty frame with no providers', () => {
    const mgr = new InputManager();
    const frame = mgr.poll(0.016);
    expect(frame).toEqual(emptyInputFrame());
  });

  it('applies a single provider partial frame', () => {
    const mgr = new InputManager();
    mgr.register(mockProvider({ moveX: 1, moveZ: -1, interact: true }));

    const frame = mgr.poll(0.016);
    expect(frame.moveX).toBeCloseTo(1 / Math.SQRT2);
    expect(frame.moveZ).toBeCloseTo(-1 / Math.SQRT2);
    expect(frame.interact).toBe(true);
  });

  it('sums movement from multiple providers', () => {
    const mgr = new InputManager();
    mgr.register(mockProvider({ moveX: 0.5 }));
    mgr.register(mockProvider({ moveX: 0.3 }));

    const frame = mgr.poll(0.016);
    expect(frame.moveX).toBeCloseTo(0.8);
  });

  it('ORs boolean actions from multiple providers', () => {
    const mgr = new InputManager();
    mgr.register(mockProvider({ interact: false, sprint: true }));
    mgr.register(mockProvider({ interact: true, sprint: false }));

    const frame = mgr.poll(0.016);
    expect(frame.interact).toBe(true);
    expect(frame.sprint).toBe(true);
  });

  it('sums look deltas from multiple providers', () => {
    const mgr = new InputManager();
    mgr.register(mockProvider({ lookDeltaX: 0.1, lookDeltaY: 0.2 }));
    mgr.register(mockProvider({ lookDeltaX: 0.05, lookDeltaY: -0.1 }));

    const frame = mgr.poll(0.016);
    expect(frame.lookDeltaX).toBeCloseTo(0.15);
    expect(frame.lookDeltaY).toBeCloseTo(0.1);
  });

  it('clamps movement to unit circle', () => {
    const mgr = new InputManager();
    mgr.register(mockProvider({ moveX: 1, moveZ: 1 }));

    const frame = mgr.poll(0.016);
    const len = Math.sqrt(frame.moveX ** 2 + frame.moveZ ** 2);
    expect(len).toBeCloseTo(1);
    expect(frame.moveX).toBeCloseTo(1 / Math.SQRT2);
    expect(frame.moveZ).toBeCloseTo(1 / Math.SQRT2);
  });

  it('does not clamp movement within unit circle', () => {
    const mgr = new InputManager();
    mgr.register(mockProvider({ moveX: 0.5, moveZ: 0 }));

    const frame = mgr.poll(0.016);
    expect(frame.moveX).toBe(0.5);
    expect(frame.moveZ).toBe(0);
  });

  it('skips disabled providers', () => {
    const mgr = new InputManager();
    const p = mockProvider({ moveX: 1, interact: true });
    p.enabled = false;
    mgr.register(p);

    const frame = mgr.poll(0.016);
    expect(frame.moveX).toBe(0);
    expect(frame.interact).toBe(false);
    expect(p.poll).not.toHaveBeenCalled();
  });

  it('does not register unavailable providers', () => {
    const mgr = new InputManager();
    const p = mockProvider({ moveX: 1 }, false);
    mgr.register(p);

    const frame = mgr.poll(0.016);
    expect(frame.moveX).toBe(0);
  });

  it('calls postFrame on all enabled providers', () => {
    const mgr = new InputManager();
    const p1 = mockProvider();
    const p2 = mockProvider();
    p2.enabled = false;
    mgr.register(p1);
    mgr.register(p2);

    mgr.postFrame();
    expect(p1.postFrame).toHaveBeenCalledOnce();
    expect(p2.postFrame).not.toHaveBeenCalled();
  });

  it('unregisters a provider', () => {
    const mgr = new InputManager();
    const p = mockProvider({ moveX: 1 });
    mgr.register(p);
    mgr.unregister(p);

    const frame = mgr.poll(0.016);
    expect(frame.moveX).toBe(0);
  });

  it('dispose cleans up all providers', () => {
    const mgr = new InputManager();
    const p1 = mockProvider();
    const p2 = mockProvider();
    mgr.register(p1);
    mgr.register(p2);

    mgr.dispose();
    expect(p1.dispose).toHaveBeenCalledOnce();
    expect(p2.dispose).toHaveBeenCalledOnce();

    // No providers remain
    const frame = mgr.poll(0.016);
    expect(frame).toEqual(emptyInputFrame());
  });

  it('ORs all boolean action types across providers', () => {
    const mgr = new InputManager();
    mgr.register(mockProvider({ jump: true, pause: false }));
    mgr.register(mockProvider({ pause: true, inventory: true }));
    mgr.register(mockProvider({ questLog: true, attack: true }));

    const frame = mgr.poll(0.016);
    expect(frame.jump).toBe(true);
    expect(frame.pause).toBe(true);
    expect(frame.inventory).toBe(true);
    expect(frame.questLog).toBe(true);
    expect(frame.attack).toBe(true);
  });
});
