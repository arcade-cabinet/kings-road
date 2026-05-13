import { describe, expect, it } from 'vitest';
import { normaliseAngle, turnTowardsYaw } from './turn-towards-yaw';

describe('normaliseAngle', () => {
  it('returns values already in [-π, π] unchanged', () => {
    expect(normaliseAngle(0)).toBeCloseTo(0);
    expect(normaliseAngle(Math.PI)).toBeCloseTo(Math.PI);
    expect(normaliseAngle(-Math.PI)).toBeCloseTo(-Math.PI);
    expect(normaliseAngle(1.5)).toBeCloseTo(1.5);
  });

  it('wraps values above π back into range', () => {
    expect(normaliseAngle(Math.PI + 0.1)).toBeCloseTo(-(Math.PI - 0.1));
    // 3π mod 2π = π, which is at the boundary — both π and -π are valid
    // representations; check the result is in [-π, π].
    const v = normaliseAngle(3 * Math.PI);
    expect(Math.abs(v)).toBeCloseTo(Math.PI);
  });

  it('wraps values below -π back into range', () => {
    expect(normaliseAngle(-Math.PI - 0.1)).toBeCloseTo(Math.PI - 0.1);
    expect(normaliseAngle(-3 * Math.PI)).toBeCloseTo(Math.PI);
  });
});

describe('turnTowardsYaw', () => {
  const TURN_RATE = 3.5; // rad/s — mid-point of target range

  it('(a) advances yaw toward target', () => {
    const result = turnTowardsYaw(0, Math.PI / 2, TURN_RATE, 0.016);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(Math.PI / 2);
  });

  it('(a) advances in the negative direction when target is negative', () => {
    const result = turnTowardsYaw(0, -Math.PI / 2, TURN_RATE, 0.016);
    expect(result).toBeLessThan(0);
    expect(result).toBeGreaterThan(-Math.PI / 2);
  });

  it('(b) converges without overshooting — large delta still reaches target', () => {
    // Delta large enough that a naive step would overshoot
    const result = turnTowardsYaw(0, 0.1, TURN_RATE, 10);
    expect(result).toBeCloseTo(0.1);
  });

  it('(b) does not overshoot when remaining gap equals exactly one step', () => {
    const step = TURN_RATE * 0.016;
    const result = turnTowardsYaw(0, step, TURN_RATE, 0.016);
    expect(result).toBeCloseTo(step);
  });

  it('(c) wrap-around: monster at -π+ε, player at +π-ε turns the short way', () => {
    // Monster facing just past -π (≈ almost behind), player just past +π (≈ almost behind).
    // The angular gap through zero is tiny; going through ±π would be the long way.
    const currentYaw = -Math.PI + 0.05;
    const targetYaw = Math.PI - 0.05;
    // Short path difference is ~0.1 rad (through ±π boundary);
    // long path is ~2π - 0.1 rad.
    const result = turnTowardsYaw(currentYaw, targetYaw, TURN_RATE, 0.016);
    // After one frame the monster should have moved AWAY from 0 (toward ±π),
    // i.e. become more negative (short path goes through -π).
    expect(result).toBeLessThan(currentYaw);
  });

  it('(c) wrap-around: monster at π-ε, target at -π+ε turns the short way', () => {
    const currentYaw = Math.PI - 0.05;
    const targetYaw = -Math.PI + 0.05;
    const result = turnTowardsYaw(currentYaw, targetYaw, TURN_RATE, 0.016);
    // Short path goes through +π boundary, so yaw increases
    expect(result).toBeGreaterThan(currentYaw);
  });

  it('(d) reaches target exactly when step >= remaining angle', () => {
    const target = 0.01;
    const result = turnTowardsYaw(0, target, TURN_RATE, 1.0); // huge delta
    expect(result).toBe(target);
  });

  it('(d) reaches target when current equals target', () => {
    const result = turnTowardsYaw(1.23, 1.23, TURN_RATE, 0.016);
    expect(result).toBeCloseTo(1.23);
  });

  it('(e) snap with unbounded currentYaw does not jump by multiple π', () => {
    // currentYaw = 5π is physically the same as π (same orientation mod 2π).
    // targetYaw = 0 means "face forward". A large-step snap should land near 0
    // (mod 2π), not teleport to the raw value 0 — which would be a ~5π jump
    // in the accumulated angle the caller was tracking.
    const result = turnTowardsYaw(5 * Math.PI, 0, 100, 1);
    // The result must be in [-π, π] (normaliseAngle output range) …
    expect(result).toBeGreaterThanOrEqual(-Math.PI);
    expect(result).toBeLessThanOrEqual(Math.PI);
    // … and must represent the same physical facing as 0 (i.e. near 0 mod 2π).
    const physical = ((result % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    // physical is in [0, 2π); values near 0 or 2π are both "facing forward"
    const nearZero = Math.min(physical, 2 * Math.PI - physical);
    expect(nearZero).toBeCloseTo(0, 5);
  });

  it('advances by exactly turnRate*delta when gap is large', () => {
    const dt = 0.016;
    const result = turnTowardsYaw(0, Math.PI, TURN_RATE, dt);
    expect(result).toBeCloseTo(TURN_RATE * dt);
  });
});
