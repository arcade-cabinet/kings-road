import { describe, expect, it } from 'vitest';
import { getDangerTier, getEncounterChance } from './danger';

describe('getDangerTier', () => {
  it('returns 0 for TOWN chunks', () => {
    expect(getDangerTier(0, 5, 'TOWN')).toBe(0);
    expect(getDangerTier(2, 5, 'TOWN')).toBe(0);
  });

  it('returns 4 for DUNGEON chunks', () => {
    expect(getDangerTier(3, 10, 'DUNGEON')).toBe(4);
  });

  it('returns 0 on the Kings Road (cx === 0)', () => {
    expect(getDangerTier(0, 0, 'ROAD')).toBe(0);
    expect(getDangerTier(0, 100, 'ROAD')).toBe(0);
  });

  it('returns 1 on road shoulder (|cx| === 1)', () => {
    expect(getDangerTier(1, 0, 'WILD')).toBe(1);
    expect(getDangerTier(-1, 0, 'WILD')).toBe(1);
  });

  it('returns 2 for wilderness (|cx| === 2)', () => {
    expect(getDangerTier(2, 0, 'WILD')).toBe(2);
    expect(getDangerTier(-2, 0, 'WILD')).toBe(2);
  });

  it('returns 3 for deep wild (|cx| >= 3)', () => {
    expect(getDangerTier(3, 0, 'WILD')).toBe(3);
    expect(getDangerTier(-5, 0, 'WILD')).toBe(3);
    expect(getDangerTier(10, 0, 'WILD')).toBe(3);
  });
});

describe('getEncounterChance', () => {
  it('returns 0 for safe tier', () => {
    expect(getEncounterChance(0)).toBe(0);
  });

  it('increases with danger tier', () => {
    expect(getEncounterChance(1)).toBeLessThan(getEncounterChance(2));
    expect(getEncounterChance(2)).toBeLessThan(getEncounterChance(3));
    expect(getEncounterChance(3)).toBeLessThan(getEncounterChance(4));
  });

  it('returns 0 for unknown tier', () => {
    expect(getEncounterChance(99)).toBe(0);
  });
});
