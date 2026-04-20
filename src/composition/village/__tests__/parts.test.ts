import { describe, expect, it } from 'vitest';

import {
  getPartsByRole,
  VILLAGE_PARTS,
  VILLAGE_PARTS_ARRAY,
} from '../parts/catalog';
import { VillagePartRoleSchema, VillagePartSchema } from '../parts/schema';

describe('VILLAGE_PARTS catalog', () => {
  it('contains exactly 15 entries', () => {
    expect(VILLAGE_PARTS_ARRAY.length).toBe(15);
  });

  it('every entry passes VillagePartSchema validation', () => {
    for (const part of VILLAGE_PARTS_ARRAY) {
      expect(() => VillagePartSchema.parse(part)).not.toThrow();
    }
  });

  it('all ids are unique', () => {
    const ids = VILLAGE_PARTS_ARRAY.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('record key matches entry id for every entry', () => {
    for (const [key, part] of Object.entries(VILLAGE_PARTS)) {
      expect(key).toBe(part.id);
    }
  });

  it('all glbPaths point to /assets/buildings/village/ and end .glb', () => {
    for (const part of VILLAGE_PARTS_ARRAY) {
      expect(part.glbPath).toMatch(/^\/assets\/buildings\/village\/.+\.glb$/);
    }
  });

  it('all footprint dimensions are positive', () => {
    for (const part of VILLAGE_PARTS_ARRAY) {
      expect(part.footprint.width).toBeGreaterThan(0);
      expect(part.footprint.depth).toBeGreaterThan(0);
    }
  });

  it('all roles are valid VillagePartRole enum members', () => {
    const valid = VillagePartRoleSchema.options;
    for (const part of VILLAGE_PARTS_ARRAY) {
      expect(valid).toContain(part.role);
    }
  });

  it('all attachTo entries are valid VillagePartRole values', () => {
    const valid = VillagePartRoleSchema.options;
    for (const part of VILLAGE_PARTS_ARRAY) {
      for (const role of part.attachTo) {
        expect(valid).toContain(role);
      }
    }
  });

  it('getPartsByRole("wall") returns 8 entries', () => {
    expect(getPartsByRole('wall').length).toBe(8);
  });

  it('getPartsByRole("roof") returns 3 entries', () => {
    expect(getPartsByRole('roof').length).toBe(3);
  });

  it('getPartsByRole("door") returns 1 entry', () => {
    expect(getPartsByRole('door').length).toBe(1);
  });

  it('getPartsByRole("window") returns 1 entry', () => {
    expect(getPartsByRole('window').length).toBe(1);
  });

  it('getPartsByRole("chimney") returns 1 entry', () => {
    expect(getPartsByRole('chimney').length).toBe(1);
  });

  it('getPartsByRole("decoration") returns gazeebo', () => {
    const dec = getPartsByRole('decoration');
    expect(dec.length).toBe(1);
    expect(dec[0].id).toBe('gazeebo');
  });

  it('getPartsByRole returns [] for unoccupied roles', () => {
    expect(getPartsByRole('foundation')).toEqual([]);
    expect(getPartsByRole('trim')).toEqual([]);
  });

  it('chimny attaches only to roof', () => {
    expect(VILLAGE_PARTS.chimny.attachTo).toEqual(['roof']);
  });

  it('every roof attaches only to wall', () => {
    for (const p of getPartsByRole('roof')) {
      expect(p.attachTo).toEqual(['wall']);
    }
  });

  it('every wall body attaches to foundation', () => {
    for (const p of getPartsByRole('wall')) {
      expect(p.attachTo).toContain('foundation');
    }
  });
});
