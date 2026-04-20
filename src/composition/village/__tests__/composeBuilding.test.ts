import { describe, expect, it } from 'vitest';
import { createRng } from '@/core';
import { composeBuilding } from '../composeBuilding';
import { VILLAGE_PARTS } from '../parts/catalog';

const VALID_ASSET_IDS = new Set(
  Object.values(VILLAGE_PARTS).map((p) => p.glbPath.replace(/^\/assets\//, '')),
);
const VALID_ROLES = new Set(['wall', 'roof', 'chimney', 'door', 'window']);
const VALID_ROTATIONS = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

describe('composeBuilding', () => {
  it('returns at least 2 placements (wall + roof)', () => {
    const result = composeBuilding({ width: 4, depth: 4 }, createRng('s1'));
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('is deterministic given the same seed', () => {
    const a = composeBuilding({ width: 4, depth: 4 }, createRng('det'));
    const b = composeBuilding({ width: 4, depth: 4 }, createRng('det'));
    expect(a).toEqual(b);
  });

  it('all assetIds point to catalog GLBs', () => {
    const result = composeBuilding({ width: 4, depth: 4 }, createRng('assets'));
    for (const p of result) {
      expect(VALID_ASSET_IDS.has(p.assetId)).toBe(true);
    }
  });

  it('all roles are in the valid subset', () => {
    const result = composeBuilding({ width: 4, depth: 4 }, createRng('roles'));
    for (const p of result) {
      expect(VALID_ROLES.has(p.role)).toBe(true);
    }
  });

  it('exactly one wall + one roof in every output', () => {
    const result = composeBuilding({ width: 4, depth: 4 }, createRng('layers'));
    expect(result.filter((p) => p.role === 'wall').length).toBe(1);
    expect(result.filter((p) => p.role === 'roof').length).toBe(1);
  });

  it('no z-fighting — wall < roof < chimney in y', () => {
    for (let i = 0; i < 20; i++) {
      const result = composeBuilding(
        { width: 4, depth: 4 },
        createRng(`z-${i}`),
      );
      const wall = result.find((p) => p.role === 'wall');
      const roof = result.find((p) => p.role === 'roof');
      const chimney = result.find((p) => p.role === 'chimney');
      const door = result.find((p) => p.role === 'door');
      const win = result.find((p) => p.role === 'window');

      if (!wall || !roof) throw new Error('missing wall or roof');
      expect(roof.position.y).toBeGreaterThan(wall.position.y);
      if (chimney) {
        expect(chimney.position.y).toBeGreaterThan(roof.position.y);
      }
      if (door && win) {
        expect(win.position.y).toBeGreaterThan(door.position.y);
      }
    }
  });

  it('picks a wall whose footprint fits the requested footprint', () => {
    const footprint = { width: 4, depth: 4 };
    const result = composeBuilding(footprint, createRng('fit'));
    const wallPlacement = result.find((p) => p.role === 'wall');
    if (!wallPlacement) throw new Error('no wall');
    const wallEntry = Object.values(VILLAGE_PARTS).find(
      (p) => p.glbPath.replace(/^\/assets\//, '') === wallPlacement.assetId,
    );
    expect(wallEntry).toBeDefined();
    if (!wallEntry) return;
    expect(wallEntry.footprint.width).toBeLessThanOrEqual(footprint.width);
    expect(wallEntry.footprint.depth).toBeLessThanOrEqual(footprint.depth);
  });

  it('shell walls get both door + window inserts', () => {
    const SHELL_WALL_IDS = [
      'building-shape-1',
      'building-shape-2',
      'building-shape-3-2-story',
    ];
    let checked = 0;
    for (let i = 0; i < 100 && checked === 0; i++) {
      const result = composeBuilding(
        { width: 4, depth: 4 },
        createRng(`shell-${i}`),
      );
      const wall = result.find((p) => p.role === 'wall');
      if (!wall) continue;
      const isShell = SHELL_WALL_IDS.some((sid) => wall.assetId.includes(sid));
      if (isShell) {
        expect(result.some((p) => p.role === 'door')).toBe(true);
        expect(result.some((p) => p.role === 'window')).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('wall rotation is one of four cardinal values', () => {
    for (let i = 0; i < 10; i++) {
      const result = composeBuilding(
        { width: 4, depth: 4 },
        createRng(`rot-${i}`),
      );
      const wall = result.find((p) => p.role === 'wall');
      if (!wall) continue;
      const matches = VALID_ROTATIONS.some(
        (r) => Math.abs(r - wall.rotation) < 0.001,
      );
      expect(matches).toBe(true);
    }
  });

  it('positions are plain Vec3 objects with numeric fields', () => {
    const result = composeBuilding({ width: 3, depth: 3 }, createRng('plain'));
    for (const p of result) {
      expect(typeof p.position.x).toBe('number');
      expect(typeof p.position.y).toBe('number');
      expect(typeof p.position.z).toBe('number');
      expect(typeof p.rotation).toBe('number');
      expect(typeof p.scale).toBe('number');
    }
  });
});
