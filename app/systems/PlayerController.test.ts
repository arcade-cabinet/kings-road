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
