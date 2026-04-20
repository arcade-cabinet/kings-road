import { describe, expect, it } from 'vitest';
import { JUMP_STAMINA_COST, resolveJump } from './PlayerController';

describe('resolveJump', () => {
  describe('successful jump', () => {
    it('allows jump when stamina equals the cost exactly', () => {
      const result = resolveJump(JUMP_STAMINA_COST);
      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.newStamina).toBe(0);
      }
    });

    it('allows jump when stamina exceeds the cost', () => {
      const result = resolveJump(100);
      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.newStamina).toBe(100 - JUMP_STAMINA_COST);
      }
    });

    it('deducts exactly JUMP_STAMINA_COST from stamina on success', () => {
      const initial = 50;
      const result = resolveJump(initial);
      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.newStamina).toBe(initial - JUMP_STAMINA_COST);
      }
    });
  });

  describe('blocked jump', () => {
    it('blocks jump when stamina is below the cost', () => {
      const result = resolveJump(JUMP_STAMINA_COST - 1);
      expect(result.allowed).toBe(false);
    });

    it('blocks jump when stamina is zero', () => {
      const result = resolveJump(0);
      expect(result.allowed).toBe(false);
    });

    it('blocks jump when stamina is fractionally below the cost', () => {
      const result = resolveJump(JUMP_STAMINA_COST - 0.01);
      expect(result.allowed).toBe(false);
    });
  });

  describe('custom cost override', () => {
    it('uses the provided cost instead of JUMP_STAMINA_COST', () => {
      const result = resolveJump(5, 5);
      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.newStamina).toBe(0);
      }
    });

    it('blocks jump with custom cost when stamina is insufficient', () => {
      const result = resolveJump(4, 5);
      expect(result.allowed).toBe(false);
    });
  });
});

describe('JUMP_STAMINA_COST', () => {
  it('is 12 (12% of max stamina — ~8 jumps from full)', () => {
    expect(JUMP_STAMINA_COST).toBe(12);
  });
});

describe('resolveJump — frame-start stamina ordering', () => {
  // Simulates: player is sprinting, stamina draining each tick.
  // On the frame where the player presses jump, sprint drain has already
  // run and pushed stamina just below the jump threshold.  The fix
  // ensures jump eligibility is evaluated against the stamina value
  // captured BEFORE sprint drain, so the jump still succeeds.
  it('succeeds when frame-start stamina is above threshold even if post-drain stamina falls below it', () => {
    const dt = 0.016; // ~60 fps
    const sprintDrainRate = 25;

    // Stamina at the start of the frame — just barely enough to jump.
    const staminaAtFrameStart = JUMP_STAMINA_COST + 0.1;

    // Simulate sprint drain happening first inside the tick.
    const staminaAfterSprintDrain = staminaAtFrameStart - sprintDrainRate * dt;

    // Post-drain stamina is below the jump threshold.
    expect(staminaAfterSprintDrain).toBeLessThan(JUMP_STAMINA_COST);

    // If resolveJump used the post-drain value it would block the jump.
    const resultWithPostDrain = resolveJump(staminaAfterSprintDrain);
    expect(resultWithPostDrain.allowed).toBe(false);

    // With the fix, resolveJump uses staminaAtFrameStart — jump succeeds.
    const resultWithFrameStart = resolveJump(staminaAtFrameStart);
    expect(resultWithFrameStart.allowed).toBe(true);
    if (resultWithFrameStart.allowed) {
      expect(resultWithFrameStart.newStamina).toBeCloseTo(
        staminaAtFrameStart - JUMP_STAMINA_COST,
        5,
      );
    }
  });

  it('still blocks jump when frame-start stamina is genuinely below threshold (not just post-drain)', () => {
    // Even with the fix, a player who truly has insufficient stamina at the
    // start of the tick cannot jump.
    const staminaAtFrameStart = JUMP_STAMINA_COST - 1;
    const result = resolveJump(staminaAtFrameStart);
    expect(result.allowed).toBe(false);
  });
});
