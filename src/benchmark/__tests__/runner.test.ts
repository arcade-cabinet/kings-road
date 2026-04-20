import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isBenchmarkAliasRoute, parseBenchParam } from '../runner';

describe('parseBenchParam', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });
  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('returns null when neither param is present', () => {
    expect(parseBenchParam()).toBeNull();
    expect(isBenchmarkAliasRoute()).toBe(false);
  });

  it('reads ?bench=<route-id> unchanged (legacy flow)', () => {
    window.history.replaceState({}, '', '/?bench=walk-village-perimeter');
    expect(parseBenchParam()).toBe('walk-village-perimeter');
    expect(isBenchmarkAliasRoute()).toBe(false);
  });

  it('maps ?benchmark=thornfield to the forward-flight route id', () => {
    window.history.replaceState({}, '', '/?benchmark=thornfield');
    expect(parseBenchParam()).toBe('walk-thornfield-forward');
    expect(isBenchmarkAliasRoute()).toBe(true);
  });

  it('is case-insensitive for the ?benchmark alias', () => {
    window.history.replaceState({}, '', '/?benchmark=Thornfield');
    expect(parseBenchParam()).toBe('walk-thornfield-forward');
  });

  it('surfaces an unknown benchmark alias verbatim (so the HUD errors)', () => {
    window.history.replaceState({}, '', '/?benchmark=narnia');
    // alias stays as "narnia" — getRoute() will return undefined and the
    // HUD renders the "Unknown benchmark route" error branch.
    expect(parseBenchParam()).toBe('narnia');
    expect(isBenchmarkAliasRoute()).toBe(true);
  });

  it('prefers ?benchmark over ?bench when both are present', () => {
    window.history.replaceState(
      {},
      '',
      '/?bench=walk-village-perimeter&benchmark=thornfield',
    );
    expect(parseBenchParam()).toBe('walk-thornfield-forward');
    expect(isBenchmarkAliasRoute()).toBe(true);
  });
});
