import { describe, expect, it } from 'vitest';
import {
  getSaveSlotKind,
  type SlotKindInput,
  TOWN_RADIUS,
} from './save-slot-kind';

// ---------------------------------------------------------------------------
// Minimal fixture helpers — only the fields getSaveSlotKind inspects
// ---------------------------------------------------------------------------

function makeSave(z: number, hasDungeon = false): SlotKindInput {
  return {
    player: { position: { x: 0, y: 1.6, z } },
    dungeon: hasDungeon ? { id: 'test-dungeon' } : undefined,
  };
}

// ---------------------------------------------------------------------------
// Dungeon branch
// ---------------------------------------------------------------------------

describe('getSaveSlotKind — dungeon', () => {
  it('returns "dungeon" when save.dungeon is set', () => {
    expect(getSaveSlotKind(makeSave(500, true))).toBe('dungeon');
  });

  it('returns "dungeon" even if position is near a town anchor', () => {
    // Ashford is at z=0; player is exactly there, but dungeon flag wins.
    expect(getSaveSlotKind(makeSave(0, true))).toBe('dungeon');
  });

  it('returns "dungeon" even deep in the wilderness', () => {
    expect(getSaveSlotKind(makeSave(14000, true))).toBe('dungeon');
  });
});

// ---------------------------------------------------------------------------
// Town branch — each settlement anchor
// ---------------------------------------------------------------------------

describe('getSaveSlotKind — town (Ashford, z=0)', () => {
  it('returns "town" at exactly z=0', () => {
    expect(getSaveSlotKind(makeSave(0))).toBe('town');
  });

  it('returns "town" within TOWN_RADIUS forward of Ashford', () => {
    expect(getSaveSlotKind(makeSave(TOWN_RADIUS))).toBe('town');
  });

  it('returns "town" within TOWN_RADIUS behind Ashford (clamped to 0)', () => {
    // Negative z is behind start; still within radius of anchor at 0.
    expect(getSaveSlotKind(makeSave(-TOWN_RADIUS))).toBe('town');
  });

  it('returns "overworld" just outside TOWN_RADIUS of Ashford', () => {
    expect(getSaveSlotKind(makeSave(TOWN_RADIUS + 1))).toBe('overworld');
  });
});

describe('getSaveSlotKind — town (Millbrook, z=6000)', () => {
  it('returns "town" at Millbrook anchor', () => {
    expect(getSaveSlotKind(makeSave(6000))).toBe('town');
  });

  it('returns "town" at Millbrook +TOWN_RADIUS', () => {
    expect(getSaveSlotKind(makeSave(6000 + TOWN_RADIUS))).toBe('town');
  });

  it('returns "overworld" at Millbrook + TOWN_RADIUS + 1', () => {
    expect(getSaveSlotKind(makeSave(6000 + TOWN_RADIUS + 1))).toBe('overworld');
  });
});

describe('getSaveSlotKind — town (Ravensgate, z=17000)', () => {
  it('returns "town" at Ravensgate anchor', () => {
    expect(getSaveSlotKind(makeSave(17000))).toBe('town');
  });

  it('returns "town" within radius before Ravensgate', () => {
    expect(getSaveSlotKind(makeSave(17000 - TOWN_RADIUS))).toBe('town');
  });
});

describe("getSaveSlotKind — town (Pilgrim's Rest, z=21000)", () => {
  it('returns "town" at Pilgrim\'s Rest', () => {
    expect(getSaveSlotKind(makeSave(21000))).toBe('town');
  });
});

// ---------------------------------------------------------------------------
// Overworld branch
// ---------------------------------------------------------------------------

describe('getSaveSlotKind — overworld', () => {
  it('returns "overworld" on the open road between Ashford and Millbrook', () => {
    expect(getSaveSlotKind(makeSave(3000))).toBe('overworld');
  });

  it('returns "overworld" near Thornfield Ruins (not a settlement anchor)', () => {
    // Thornfield (z=12000) is a DUNGEON anchor type, not a settlement.
    expect(getSaveSlotKind(makeSave(12000))).toBe('overworld');
  });

  it('returns "overworld" near Grailsend (DUNGEON anchor, no dungeon flag)', () => {
    expect(getSaveSlotKind(makeSave(28000))).toBe('overworld');
  });

  it('returns "overworld" in the moors between Ravensgate and Pilgrim Rest', () => {
    expect(getSaveSlotKind(makeSave(19500))).toBe('overworld');
  });

  it('returns "overworld" at mid-journey z=10000', () => {
    expect(getSaveSlotKind(makeSave(10000))).toBe('overworld');
  });
});
