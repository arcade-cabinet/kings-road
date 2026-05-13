import { describe, expect, it } from 'vitest';
import {
  WARMTH_HUE_SCALE,
  WARMTH_TRANSITION_SPEED,
  type WarmthState,
  lerpWarmth,
  warmthToHue,
} from './biomeWarmth';

describe('lerpWarmth', () => {
  it('stays at zero when target is neutral', () => {
    const out: WarmthState = { warmth: 0, saturation: 0 };
    lerpWarmth(out, 0, 0, 0.016);
    expect(out.warmth).toBeCloseTo(0, 5);
    expect(out.saturation).toBeCloseTo(0, 5);
  });

  it('approaches warm target over many frames', () => {
    const out: WarmthState = { warmth: 0, saturation: 0 };
    const delta = 0.016;
    for (let i = 0; i < 300; i++) {
      lerpWarmth(out, 0.15, 0.08, delta);
    }
    expect(out.warmth).toBeCloseTo(0.15, 3);
    expect(out.saturation).toBeCloseTo(0.08, 3);
  });

  it('approaches cool target over many frames', () => {
    const out: WarmthState = { warmth: 0, saturation: 0 };
    const delta = 0.016;
    for (let i = 0; i < 300; i++) {
      lerpWarmth(out, -0.2, -0.1, delta);
    }
    expect(out.warmth).toBeCloseTo(-0.2, 3);
    expect(out.saturation).toBeCloseTo(-0.1, 3);
  });

  it('transitions back to neutral when biome changes', () => {
    const out: WarmthState = { warmth: 0.15, saturation: 0.08 };
    const delta = 0.016;
    for (let i = 0; i < 300; i++) {
      lerpWarmth(out, 0, 0, delta);
    }
    expect(out.warmth).toBeCloseTo(0, 3);
    expect(out.saturation).toBeCloseTo(0, 3);
  });

  it('has meaningful progress after one 0.016s frame', () => {
    // k = 1 - exp(-3.0 * 0.016) ≈ 0.047; should move ≥ 2% of distance
    const out: WarmthState = { warmth: 0, saturation: 0 };
    lerpWarmth(out, 0.15, 0.08, 0.016);
    expect(out.warmth).toBeGreaterThan(0.15 * 0.02);
    expect(out.saturation).toBeGreaterThan(0.08 * 0.02);
  });

  it('respects custom speed parameter', () => {
    const slow: WarmthState = { warmth: 0, saturation: 0 };
    const fast: WarmthState = { warmth: 0, saturation: 0 };
    lerpWarmth(slow, 0.15, 0.08, 0.016, 1.0);
    lerpWarmth(fast, 0.15, 0.08, 0.016, 10.0);
    expect(fast.warmth).toBeGreaterThan(slow.warmth);
  });

  it('mutates `out` in place — no new objects', () => {
    const out: WarmthState = { warmth: 0, saturation: 0 };
    const ref = out;
    lerpWarmth(out, 0.15, 0.08, 0.016);
    expect(out).toBe(ref);
  });

  it('default speed equals WARMTH_TRANSITION_SPEED', () => {
    const a: WarmthState = { warmth: 0, saturation: 0 };
    const b: WarmthState = { warmth: 0, saturation: 0 };
    lerpWarmth(a, 0.15, 0.08, 0.016);
    lerpWarmth(b, 0.15, 0.08, 0.016, WARMTH_TRANSITION_SPEED);
    expect(a.warmth).toBeCloseTo(b.warmth, 6);
    expect(a.saturation).toBeCloseTo(b.saturation, 6);
  });
});

describe('warmthToHue', () => {
  it('returns 0 for neutral warmth', () => {
    expect(warmthToHue(0)).toBe(0);
  });

  it('returns positive hue for positive warmth', () => {
    expect(warmthToHue(0.15)).toBeGreaterThan(0);
  });

  it('returns negative hue for negative warmth', () => {
    expect(warmthToHue(-0.2)).toBeLessThan(0);
  });

  it('is linear: warmthToHue(1) === WARMTH_HUE_SCALE', () => {
    expect(warmthToHue(1)).toBeCloseTo(WARMTH_HUE_SCALE, 6);
  });

  it('is linear: warmthToHue(-1) === -WARMTH_HUE_SCALE', () => {
    expect(warmthToHue(-1)).toBeCloseTo(-WARMTH_HUE_SCALE, 6);
  });
});
