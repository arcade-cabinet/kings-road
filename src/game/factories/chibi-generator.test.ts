import { describe, expect, it } from 'vitest';
import type { ChibiConfig } from './chibi-generator';
import {
  ACCENT_METALS,
  EYE_PALETTES,
  generateChibiFromSeed,
  generateTownNPC,
  HAIR_PALETTES,
  hashString,
  PRIMARY_DYES,
  SKIN_PALETTES,
  SLOTS,
} from './chibi-generator';

describe('hashString', () => {
  it('is deterministic', () => {
    expect(hashString('test')).toBe(hashString('test'));
    expect(hashString('hello')).toBe(hashString('hello'));
  });

  it('produces different hashes for different strings', () => {
    expect(hashString('foo')).not.toBe(hashString('bar'));
  });

  it('returns a non-negative integer', () => {
    const h = hashString('anything');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(h)).toBe(true);
  });
});

describe('generateChibiFromSeed', () => {
  it('is deterministic — same seed produces same output', () => {
    const a = generateChibiFromSeed('hero_42');
    const b = generateChibiFromSeed('hero_42');
    expect(a).toEqual(b);
  });

  it('is deterministic with numeric seeds', () => {
    const a = generateChibiFromSeed(12345);
    const b = generateChibiFromSeed(12345);
    expect(a).toEqual(b);
  });

  it('different seeds produce different configs', () => {
    const a = generateChibiFromSeed('alpha');
    const b = generateChibiFromSeed('beta');
    // At minimum some fields should differ
    const identical =
      a.race === b.race &&
      a.job === b.job &&
      a.skinTone === b.skinTone &&
      a.hairColor === b.hairColor &&
      a.primaryColor === b.primaryColor;
    expect(identical).toBe(false);
  });

  it('all ChibiConfig fields are populated (no undefined)', () => {
    const config = generateChibiFromSeed('completeness_check');
    const fields: (keyof ChibiConfig)[] = [
      'race',
      'job',
      'skinTone',
      'hairColor',
      'eyeColor',
      'primaryColor',
      'secondaryColor',
      'accentColor',
      'expression',
      'headSize',
      'bodyPlumpness',
      'hairStyle',
      'facialHair',
      'hasCloak',
      'weaponType',
    ];
    for (const field of fields) {
      expect(config[field]).toBeDefined();
    }
  });

  it('race values come from SLOTS', () => {
    for (let i = 0; i < 50; i++) {
      const config = generateChibiFromSeed(`race_test_${i}`);
      expect(SLOTS.race).toContain(config.race);
    }
  });

  it('colors come from palettes', () => {
    const config = generateChibiFromSeed('palette_check');
    expect([...SKIN_PALETTES]).toContain(config.skinTone);
    expect([...HAIR_PALETTES]).toContain(config.hairColor);
    expect([...EYE_PALETTES]).toContain(config.eyeColor);
    expect([...PRIMARY_DYES]).toContain(config.primaryColor);
    expect([...PRIMARY_DYES]).toContain(config.secondaryColor);
    expect([...ACCENT_METALS]).toContain(config.accentColor);
  });

  describe('race modifies body proportions', () => {
    it('dwarf gets headSize=1.35', () => {
      // Brute-force find a dwarf seed
      let config: ChibiConfig | null = null;
      for (let i = 0; i < 500; i++) {
        const c = generateChibiFromSeed(`dwarf_search_${i}`);
        if (c.race === 'dwarf') {
          config = c;
          break;
        }
      }
      expect(config).not.toBeNull();
      expect(config!.headSize).toBe(1.35);
    });

    it('elf gets headSize=0.95', () => {
      let config: ChibiConfig | null = null;
      for (let i = 0; i < 500; i++) {
        const c = generateChibiFromSeed(`elf_search_${i}`);
        if (c.race === 'elf') {
          config = c;
          break;
        }
      }
      expect(config).not.toBeNull();
      expect(config!.headSize).toBe(0.95);
    });

    it('halfling gets bodyPlumpness=0.85', () => {
      let config: ChibiConfig | null = null;
      for (let i = 0; i < 500; i++) {
        const c = generateChibiFromSeed(`halfling_search_${i}`);
        if (c.race === 'halfling') {
          config = c;
          break;
        }
      }
      expect(config).not.toBeNull();
      expect(config!.bodyPlumpness).toBe(0.85);
    });
  });
});

describe('generateTownNPC', () => {
  it('guard has warrior job and cloak', () => {
    const npc = generateTownNPC('millbrook', 0, 'guard');
    expect(npc.job).toBe('warrior');
    expect(npc.hasCloak).toBe(true);
    expect(npc.bodyPlumpness).toBe(1.15);
    expect(npc.role).toBe('guard');
  });

  it('merchant has ranger job and ponytail', () => {
    const npc = generateTownNPC('millbrook', 1, 'merchant');
    expect(npc.job).toBe('ranger');
    expect(npc.hairStyle).toBe('ponytail');
    expect(npc.expression).toBe('happy');
  });

  it('priest has cleric job and gray hair', () => {
    const npc = generateTownNPC('millbrook', 2, 'priest');
    expect(npc.job).toBe('cleric');
    expect(npc.hairColor).toBe('#d4d4d4');
  });

  it('blacksmith has warrior job and topknot', () => {
    const npc = generateTownNPC('millbrook', 3, 'blacksmith');
    expect(npc.job).toBe('warrior');
    expect(npc.hairStyle).toBe('topknot');
  });

  it('bard has mage job and long hair', () => {
    const npc = generateTownNPC('millbrook', 4, 'bard');
    expect(npc.job).toBe('mage');
    expect(npc.hairStyle).toBe('long');
    expect(npc.expression).toBe('happy');
  });

  it('produces name with first and last', () => {
    const npc = generateTownNPC('ashford', 0, 'villager');
    expect(npc.name).toBeDefined();
    const parts = npc.name.split(' ');
    expect(parts.length).toBe(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it('is deterministic — same inputs produce same NPC', () => {
    const a = generateTownNPC('ravensgate', 5, 'guard');
    const b = generateTownNPC('ravensgate', 5, 'guard');
    expect(a).toEqual(b);
  });

  it('different indices produce different NPCs', () => {
    const a = generateTownNPC('millbrook', 0, 'villager');
    const b = generateTownNPC('millbrook', 1, 'villager');
    expect(a.name).not.toBe(b.name);
  });

  it('villager has no role overrides — keeps generated values', () => {
    const npc = generateTownNPC('millbrook', 10, 'villager');
    // Villager should still have all fields populated
    expect(npc.role).toBe('villager');
    expect(SLOTS.job).toContain(npc.job);
    expect(SLOTS.hairStyle).toContain(npc.hairStyle);
  });
});
